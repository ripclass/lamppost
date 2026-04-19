'use server';

import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/db/supabase';
import { getOnboardingSession } from '@/lib/auth/anonymous';
import { convertAnonymousToUser } from '@/lib/auth/migrate';
import { findCurriculum } from '../try/curricula';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth:OTP');

export type OtpChannel = 'phone' | 'email';

export type SendOtpResult =
  | { ok: true }
  | { ok: false; reason: 'sms_not_configured' | 'rate_limit' | 'invalid_identifier' | 'unknown'; message: string };

export type VerifyOtpResult =
  | { ok: true; next: string }
  | { ok: false; reason: 'invalid_code' | 'expired' | 'unknown'; message: string };

/**
 * Send a one-time code via Supabase Auth. Supabase handles SMS/email delivery
 * with provider credentials configured in the Supabase dashboard — we don't
 * touch Twilio directly.
 *
 * Phone-specific fallback: if Supabase's phone provider isn't configured yet,
 * we return { reason: 'sms_not_configured' } so the UI can render a "SMS
 * coming soon — try email" hint. We narrow this detection to provider/config
 * signals in the error message so legitimate rate-limit errors (429) are
 * surfaced as their own reason rather than being misread as a config issue.
 */
export async function sendOtpAction(channel: OtpChannel, identifier: string): Promise<SendOtpResult> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { ok: false, reason: 'invalid_identifier', message: 'Enter a phone number or email.' };
  }

  const supabase = await getSupabaseServer();

  try {
    if (channel === 'phone') {
      const phone = normalizePhone(trimmed);
      if (!phone) {
        return { ok: false, reason: 'invalid_identifier', message: 'Use international format, e.g. +8801712345678.' };
      }
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
      if (error) return classifySendError(channel, error);
    } else {
      if (!isPlausibleEmail(trimmed)) {
        return { ok: false, reason: 'invalid_identifier', message: 'That doesn’t look like an email address.' };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      if (error) return classifySendError(channel, error);
    }

    return { ok: true };
  } catch (err) {
    log.error('sendOtp unexpected:', err);
    return { ok: false, reason: 'unknown', message: 'Something went wrong. Try again in a moment.' };
  }
}

/**
 * Verify the one-time code. On success, routes to one of three outcomes:
 *   1. New user + anon onboarding session → run convertAnonymousToUser, go to /personalize
 *   2. New user + no anon session        → ensure users row exists, go to /personalize
 *   3. Returning user                    → skip conversion entirely, go to /app
 *
 * "Returning" = users row already exists with study_goal set (or any student
 * record with prior activity). We check for a prior users row by auth_id.
 */
export async function verifyOtpAction(
  channel: OtpChannel,
  identifier: string,
  code: string,
): Promise<VerifyOtpResult> {
  const trimmedCode = code.replace(/\s+/g, '');
  if (trimmedCode.length < 4) {
    return { ok: false, reason: 'invalid_code', message: 'Enter the 6-digit code we sent.' };
  }

  const supabase = await getSupabaseServer();

  try {
    const { data, error } =
      channel === 'phone'
        ? await supabase.auth.verifyOtp({
            phone: normalizePhone(identifier.trim()) ?? identifier.trim(),
            token: trimmedCode,
            type: 'sms',
          })
        : await supabase.auth.verifyOtp({
            email: identifier.trim(),
            token: trimmedCode,
            type: 'email',
          });

    if (error || !data.user) {
      return classifyVerifyError(error);
    }

    const authId = data.user.id;

    // Returning user? If a users row exists AND study_goal is set, they've
    // already personalised — route straight to the lobby.
    const service = getServiceClient();
    const { data: existing } = await service
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    if (existing) {
      const { data: student } = await service
        .from('students')
        .select('study_goal')
        .eq('id', existing.id)
        .maybeSingle();
      if (student?.study_goal) {
        return { ok: true, next: '/app' };
      }
    }

    // New user — or existing user who hasn't personalised. Run conversion
    // if an anon session exists to stitch the funnel; otherwise just ensure
    // the users/students rows via the same RPC with a null session arg.
    const session = await getOnboardingSession();
    const inferredLanguage = inferLanguage(session?.curriculumChoice ?? null);

    if (session) {
      await convertAnonymousToUser({
        authId,
        onboardingSessionId: session.id,
        phone: channel === 'phone' ? normalizePhone(identifier.trim()) ?? identifier.trim() : undefined,
        email: channel === 'email' ? identifier.trim() : undefined,
      });
    } else {
      await ensureUserRow(service, {
        authId,
        phone: channel === 'phone' ? normalizePhone(identifier.trim()) ?? identifier.trim() : null,
        email: channel === 'email' ? identifier.trim() : null,
      });
    }

    if (inferredLanguage) {
      await service.from('users').update({ language_preference: inferredLanguage }).eq('auth_id', authId);
    }

    return { ok: true, next: '/personalize' };
  } catch (err) {
    log.error('verifyOtp unexpected:', err);
    return { ok: false, reason: 'unknown', message: 'Could not verify. Try requesting a new code.' };
  }
}

export async function resendOtpAction(channel: OtpChannel, identifier: string): Promise<SendOtpResult> {
  return sendOtpAction(channel, identifier);
}

export async function redirectTo(next: string): Promise<void> {
  redirect(next);
}

function inferLanguage(curriculumId: string | null): 'bn-BD' | 'en-US' | null {
  if (!curriculumId) return null;
  const curriculum = findCurriculum(curriculumId);
  return curriculum?.defaultLanguage ?? null;
}

async function ensureUserRow(
  service: ReturnType<typeof getServiceClient>,
  params: { authId: string; phone: string | null; email: string | null },
): Promise<void> {
  const { error } = await service.from('users').upsert(
    {
      auth_id: params.authId,
      role: 'student',
      phone: params.phone,
      email: params.email,
    },
    { onConflict: 'auth_id' },
  );
  if (error) {
    throw new Error(`Failed to upsert users row: ${error.message}`);
  }

  const { data: user } = await service
    .from('users')
    .select('id')
    .eq('auth_id', params.authId)
    .single();
  if (user) {
    await service.from('students').upsert({ id: user.id, metadata: {} }, { onConflict: 'id' });
  }
}

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;
  // Accept bare BD numbers as a convenience: 01712345678 → +8801712345678
  if (/^01\d{9}$/.test(cleaned)) return `+88${cleaned}`;
  return null;
}

function isPlausibleEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

interface ShapedAuthError {
  message: string;
  status?: number;
}

function asAuthError(error: unknown): ShapedAuthError | null {
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message: unknown; status?: unknown };
    if (typeof e.message === 'string') {
      return { message: e.message, status: typeof e.status === 'number' ? e.status : undefined };
    }
  }
  return null;
}

function classifySendError(channel: OtpChannel, error: unknown): SendOtpResult {
  const authErr = asAuthError(error);
  if (!authErr) {
    log.error('sendOtp non-auth error:', error);
    return { ok: false, reason: 'unknown', message: 'Something went wrong. Try again.' };
  }

  const msg = authErr.message.toLowerCase();
  const status = authErr.status ?? 0;

  if (status === 429 || msg.includes('rate limit')) {
    return {
      ok: false,
      reason: 'rate_limit',
      message: 'Too many attempts. Wait a minute before trying again.',
    };
  }

  if (
    channel === 'phone' &&
    (msg.includes('provider') ||
      msg.includes('sms provider') ||
      msg.includes('phone provider') ||
      msg.includes('twilio'))
  ) {
    log.info(`SMS provider not configured — falling back to email path. err="${authErr.message}"`);
    return {
      ok: false,
      reason: 'sms_not_configured',
      message: 'SMS is not available yet. Try email for now.',
    };
  }

  log.error(`sendOtp auth error (channel=${channel}, status=${status}):`, authErr.message);
  return { ok: false, reason: 'unknown', message: authErr.message };
}

function classifyVerifyError(error: unknown): VerifyOtpResult {
  const authErr = asAuthError(error);
  if (!authErr) {
    return { ok: false, reason: 'unknown', message: 'No user returned from verification.' };
  }
  const msg = authErr.message.toLowerCase();
  if (msg.includes('expired')) {
    return { ok: false, reason: 'expired', message: 'That code expired. Request a new one.' };
  }
  if (msg.includes('invalid') || msg.includes('token')) {
    return { ok: false, reason: 'invalid_code', message: 'That code didn’t match. Try again.' };
  }
  log.error('verifyOtp auth error:', authErr.message);
  return { ok: false, reason: 'unknown', message: authErr.message };
}
