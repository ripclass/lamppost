import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverConfig } from '@/lib/config/server';

/**
 * Unsubscribe tokens are HMAC-signed payloads of the form
 *   base64url(JSON({parentId, issuedAt})).base64url(HMAC-SHA256)
 *
 * Signed with UNSUBSCRIBE_SECRET (separate env from CRON_SECRET on purpose —
 * rotate the unsubscribe key without breaking cron auth). Tokens older than
 * 90 days are rejected so leaked / forwarded unsubscribe URLs can't be
 * weaponised indefinitely.
 */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export interface UnsubscribePayload {
  readonly parentId: string;
  readonly issuedAt: number;
}

export type VerifyResult =
  | { ok: true; payload: UnsubscribePayload }
  | { ok: false; reason: 'not_configured' | 'malformed' | 'bad_signature' | 'expired' };

export function signUnsubscribeToken(parentId: string, now: Date = new Date()): string {
  const secret = getSecret();
  const payload: UnsubscribePayload = { parentId, issuedAt: now.getTime() };
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = base64UrlEncode(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string,
  now: Date = new Date(),
): VerifyResult {
  const secret = serverConfig.UNSUBSCRIBE_SECRET;
  if (!secret) return { ok: false, reason: 'not_configured' };

  const [bodyB64, sigB64] = token.split('.');
  if (!bodyB64 || !sigB64) return { ok: false, reason: 'malformed' };

  const expectedSig = createHmac('sha256', secret).update(bodyB64).digest();
  const providedSig = base64UrlDecode(sigB64);
  if (expectedSig.length !== providedSig.length) {
    return { ok: false, reason: 'bad_signature' };
  }
  if (!timingSafeEqual(expectedSig, providedSig)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: UnsubscribePayload;
  try {
    const raw = JSON.parse(base64UrlDecode(bodyB64).toString('utf8')) as Record<string, unknown>;
    if (typeof raw.parentId !== 'string' || typeof raw.issuedAt !== 'number') {
      return { ok: false, reason: 'malformed' };
    }
    payload = { parentId: raw.parentId, issuedAt: raw.issuedAt };
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (now.getTime() - payload.issuedAt > MAX_AGE_MS) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}

function getSecret(): string {
  const secret = serverConfig.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error(
      'UNSUBSCRIBE_SECRET is not configured — set it in .env.local before signing tokens.',
    );
  }
  return secret;
}

function base64UrlEncode(input: Buffer): string {
  return input.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}
