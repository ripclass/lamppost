import 'server-only';
import { serverConfig } from '@/lib/config/server';
import { createLogger } from '@/lib/logger';
import { signUnsubscribeToken } from './unsubscribe-token';

const log = createLogger('Notifications:ParentEmail');

const POSTMARK_URL = 'https://api.postmarkapp.com/email';
const POSTMARK_TIMEOUT_MS = 10_000;

/**
 * The Postmark transactional stream the parent-weekly email uses. Supabase
 * Auth OTP emails (Step 7+) should route through the same transactional
 * stream so deliverability reputation stays unified. Announcements and
 * marketing go through a separate broadcast stream (not yet configured).
 */
export const PARENT_WEEKLY_STREAM = 'lamppost-transactional';

export interface StudentSummary {
  readonly studentId: string;
  readonly studentName: string;
  readonly interactionsLastWeek: number;
  readonly chaptersTouchedLastWeek: number;
  readonly qaHitRate: number; // 0..1
  readonly fallbackCount: number;
  readonly rateLimitHits: number;
  readonly streakDays: number;
  readonly mostActiveChapterTitle: string | null;
}

export interface ParentEmailInput {
  readonly parentId: string;
  readonly parentEmail: string;
  readonly parentDisplayName: string | null;
  readonly students: readonly StudentSummary[];
  readonly baseUrl: string;
}

export interface RenderedEmail {
  readonly subject: string;
  readonly htmlBody: string;
  readonly textBody: string;
}

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'not_configured' | 'http_error' | 'network'; message: string };

/**
 * Build the rendered email (both HTML and text) for one parent. Handles
 * single-student and multi-student cases from a single flexible template —
 * array iteration, not two branches.
 *
 * The template surfaces only real signal: interactions count, chapters
 * touched, Q&A hit rate, streak, rate-limit hits, most active chapter. No
 * "study hours," "quiz average," or other fields we don't actually track.
 */
export function renderParentEmail(input: ParentEmailInput): RenderedEmail {
  const multi = input.students.length > 1;
  const primaryName = input.students[0]?.studentName ?? 'your student';
  const subject = multi
    ? `Your kids' week on Lamppost`
    : `${primaryName}'s week on Lamppost`;

  const unsubToken = signUnsubscribeToken(input.parentId);
  const unsubUrl = `${input.baseUrl}/api/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

  const sections = input.students.map((s) => renderStudentSection(s)).join('\n\n');
  const textSections = input.students.map((s) => renderStudentSectionText(s)).join('\n\n');

  const greetingText = input.parentDisplayName
    ? `Hi ${input.parentDisplayName},`
    : 'Hello,';
  const greetingHtml = input.parentDisplayName
    ? `Hi ${escapeHtml(input.parentDisplayName)},`
    : 'Hello,';
  const whoHtml = multi ? 'your students' : escapeHtml(primaryName);
  const whoText = multi ? 'your students' : primaryName;
  const sourceHtml = multi ? 'one of your students' : escapeHtml(primaryName);

  const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="color: #555;">${greetingHtml}</p>
  <p>Here is what ${whoHtml} worked on this week.</p>
  ${sections}
  <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 32px 0 16px;"/>
  <p style="font-size: 12px; color: #888;">
    You're getting this because ${sourceHtml} linked your
    email to their Lamppost account. No action needed — this email arrives weekly while
    they're actively studying.
  </p>
  <p style="font-size: 12px; color: #888;">
    <a href="${escapeHtml(unsubUrl)}" style="color: #666;">Unsubscribe from weekly updates</a>
  </p>
</body>
</html>`;

  const textBody = [
    greetingText,
    '',
    `Here is what ${whoText} worked on this week.`,
    '',
    textSections,
    '',
    '—',
    `Unsubscribe: ${unsubUrl}`,
  ].join('\n');

  return { subject, htmlBody, textBody };
}

function renderStudentSection(s: StudentSummary): string {
  const lines = studentLines(s);
  return `
  <div style="margin-top: 24px; padding: 16px 20px; border-radius: 12px; background: #f5f7f9;">
    <div style="font-weight: 600; font-size: 15px; margin-bottom: 8px;">${escapeHtml(s.studentName)}</div>
    <ul style="margin: 0; padding-left: 20px;">
      ${lines.map((l) => `<li style="margin-bottom: 4px;">${escapeHtml(l)}</li>`).join('\n      ')}
    </ul>
  </div>`;
}

function renderStudentSectionText(s: StudentSummary): string {
  return [`— ${s.studentName} —`, ...studentLines(s).map((l) => `  · ${l}`)].join('\n');
}

function studentLines(s: StudentSummary): string[] {
  if (s.interactionsLastWeek === 0) {
    return [`No study activity this week — maybe nudge them to come back?`];
  }

  const lines: string[] = [
    `Asked ${s.interactionsLastWeek} question${s.interactionsLastWeek === 1 ? '' : 's'} across ${s.chaptersTouchedLastWeek} chapter${s.chaptersTouchedLastWeek === 1 ? '' : 's'}.`,
  ];

  if (s.mostActiveChapterTitle) {
    lines.push(`Most active in: "${s.mostActiveChapterTitle}".`);
  }

  const hitPercent = Math.round(s.qaHitRate * 100);
  lines.push(
    `${hitPercent}% of questions were answered straight from the chapter — the rest got a live explanation.`,
  );

  if (s.streakDays >= 2) {
    lines.push(`On a ${s.streakDays}-day study streak.`);
  }

  if (s.rateLimitHits >= 3) {
    lines.push(
      `Hit the free-tier question limit ${s.rateLimitHits} times this week. Upgrading unlocks unlimited asks.`,
    );
  }

  return lines;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send a rendered email via Postmark. The fetch has a 10-second timeout so a
 * hanging Postmark request can't stall the cron. Callers should inspect the
 * result and log failures — we don't retry inside this function because the
 * cron itself is weekly and the retry policy belongs higher up.
 */
export async function sendParentEmail(
  to: string,
  rendered: RenderedEmail,
): Promise<SendResult> {
  if (!serverConfig.POSTMARK_SERVER_TOKEN || !serverConfig.POSTMARK_FROM_EMAIL) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'POSTMARK_SERVER_TOKEN or POSTMARK_FROM_EMAIL not set',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POSTMARK_TIMEOUT_MS);

  try {
    const res = await fetch(POSTMARK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Postmark-Server-Token': serverConfig.POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify({
        From: serverConfig.POSTMARK_FROM_EMAIL,
        To: to,
        Subject: rendered.subject,
        HtmlBody: rendered.htmlBody,
        TextBody: rendered.textBody,
        MessageStream: PARENT_WEEKLY_STREAM,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      log.error(`Postmark rejected email to ${to} (${res.status}): ${text.slice(0, 300)}`);
      return { ok: false, reason: 'http_error', message: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as { MessageID?: string };
    return { ok: true, messageId: data.MessageID ?? 'unknown' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Postmark send to ${to} failed: ${message}`);
    return { ok: false, reason: 'network', message };
  } finally {
    clearTimeout(timer);
  }
}
