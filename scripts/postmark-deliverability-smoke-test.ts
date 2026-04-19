#!/usr/bin/env npx tsx
/**
 * Postmark deliverability smoke test.
 *
 * Send a short test email to each address in --to (comma-separated), wait a
 * configurable grace period, then query Postmark's Messages API for the
 * *delivery* status — not just "sent." The thing we actually care about is
 * whether the email landed in the inbox, not whether our API call succeeded.
 *
 * Always include at least one Gmail and one Yahoo address alongside the BD
 * ISP addresses. If Gmail passes but Grameenphone/Robi/Banglalink bounce,
 * the problem is BD ISP side. If Gmail also bounces, the problem is our
 * Postmark configuration (SPF/DKIM/DMARC, stream setup, sender reputation).
 *
 * Usage:
 *   npx tsx scripts/postmark-deliverability-smoke-test.ts \
 *     --to you@gmail.com,you@yahoo.com,test@grameenphone.net,test@robi.com.bd
 *
 *   Optional: --wait-seconds 120  (default 60)
 *             --subject "Custom subject"
 *
 * Requires: POSTMARK_SERVER_TOKEN, POSTMARK_FROM_EMAIL in the environment.
 */

import { serverConfig } from '../lib/config/server';

const DEFAULT_WAIT_SECONDS = 60;
const POSTMARK_API = 'https://api.postmarkapp.com';

interface SendReceipt {
  readonly to: string;
  readonly messageId: string;
}

interface DeliveryCheck {
  readonly to: string;
  readonly messageId: string;
  readonly status: 'Delivered' | 'Bounced' | 'SpamComplaint' | 'Unknown' | 'NotFound' | string;
  readonly details?: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const addresses = args.to.split(',').map((a) => a.trim()).filter(Boolean);
  if (addresses.length === 0) {
    console.error('Usage: --to addr1,addr2,addr3 [--wait-seconds 60] [--subject "..."]');
    process.exit(1);
  }

  if (!serverConfig.POSTMARK_SERVER_TOKEN || !serverConfig.POSTMARK_FROM_EMAIL) {
    console.error('POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL must be set.');
    process.exit(1);
  }

  console.log(
    `Sending ${addresses.length} deliverability test(s) from ${serverConfig.POSTMARK_FROM_EMAIL}`,
  );
  console.log(`  Transactional stream: lamppost-transactional`);
  console.log('');

  const receipts: SendReceipt[] = [];
  for (const to of addresses) {
    try {
      const messageId = await sendOne(to, args.subject);
      console.log(`  ✓ Sent → ${to}  [MessageID: ${messageId}]`);
      receipts.push({ to, messageId });
    } catch (err) {
      console.log(`  ✗ Failed → ${to}  ${err instanceof Error ? err.message : err}`);
    }
  }

  if (receipts.length === 0) {
    console.error('\nNo emails sent successfully. Postmark send step is the problem.');
    process.exit(1);
  }

  console.log(
    `\nWaiting ${args.waitSeconds}s for delivery events to propagate in Postmark…`,
  );
  await sleep(args.waitSeconds * 1000);

  console.log(`\nDelivery status:`);
  const results: DeliveryCheck[] = [];
  for (const receipt of receipts) {
    const status = await fetchDeliveryStatus(receipt.messageId);
    results.push({ to: receipt.to, messageId: receipt.messageId, ...status });
    const mark = status.status === 'Delivered' ? '✓' : status.status === 'Bounced' ? '✗' : '?';
    console.log(
      `  ${mark} ${receipt.to.padEnd(40)} ${status.status}${status.details ? ` — ${status.details}` : ''}`,
    );
  }

  const delivered = results.filter((r) => r.status === 'Delivered').length;
  const bounced = results.filter((r) => r.status === 'Bounced').length;
  const unknown = results.length - delivered - bounced;

  console.log(`\nSummary: ${delivered} delivered · ${bounced} bounced · ${unknown} unresolved`);

  if (bounced > 0 || unknown > 0) {
    process.exit(1);
  }
}

async function sendOne(to: string, subject: string): Promise<string> {
  const res = await fetch(`${POSTMARK_API}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': serverConfig.POSTMARK_SERVER_TOKEN!,
    },
    body: JSON.stringify({
      From: serverConfig.POSTMARK_FROM_EMAIL,
      To: to,
      Subject: subject,
      TextBody:
        'This is a Lamppost deliverability smoke test. If you received this, delivery to your inbox is working. You can ignore this email.',
      HtmlBody:
        '<p>This is a Lamppost deliverability smoke test. If you received this, delivery to your inbox is working. You can ignore this email.</p>',
      MessageStream: 'lamppost-transactional',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { MessageID?: string };
  if (!data.MessageID) throw new Error('Postmark returned no MessageID');
  return data.MessageID;
}

async function fetchDeliveryStatus(
  messageId: string,
): Promise<{ status: DeliveryCheck['status']; details?: string }> {
  try {
    const res = await fetch(
      `${POSTMARK_API}/messages/outbound/${encodeURIComponent(messageId)}/details`,
      {
        headers: {
          Accept: 'application/json',
          'X-Postmark-Server-Token': serverConfig.POSTMARK_SERVER_TOKEN!,
        },
      },
    );
    if (res.status === 404) return { status: 'NotFound' };
    if (!res.ok) return { status: `HTTP ${res.status}` };

    const data = (await res.json()) as {
      MessageEvents?: Array<{ Type: string; Details?: { DeliveryMessage?: string } }>;
    };
    const events = data.MessageEvents ?? [];

    const bounced = events.find((e) => e.Type === 'Bounced');
    if (bounced) return { status: 'Bounced', details: bounced.Details?.DeliveryMessage };

    const complaint = events.find((e) => e.Type === 'SpamComplaint');
    if (complaint) return { status: 'SpamComplaint' };

    const delivered = events.find((e) => e.Type === 'Delivered');
    if (delivered) return { status: 'Delivered' };

    return { status: 'Unknown', details: `${events.length} event(s), none terminal yet` };
  } catch (err) {
    return { status: 'Unknown', details: err instanceof Error ? err.message : String(err) };
  }
}

interface Args {
  to: string;
  waitSeconds: number;
  subject: string;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    to: '',
    waitSeconds: DEFAULT_WAIT_SECONDS,
    subject: 'Lamppost deliverability test',
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--to' && value) {
      args.to = value;
      i++;
    } else if (flag === '--wait-seconds' && value) {
      args.waitSeconds = Number(value);
      i++;
    } else if (flag === '--subject' && value) {
      args.subject = value;
      i++;
    }
  }
  return args;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
