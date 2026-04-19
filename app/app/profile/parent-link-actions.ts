'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/db/supabase';
import {
  renderParentEmail,
  sendParentEmail,
  type StudentSummary,
} from '@/lib/notifications/parent-email';
import { providerStatus } from '@/lib/config/server';
import { headers } from 'next/headers';
import { createLogger } from '@/lib/logger';

const log = createLogger('Profile:ParentLink');

export type LinkParentResult =
  | { ok: true; welcomeSent: boolean }
  | { ok: false; reason: 'invalid_email' | 'self' | 'unknown'; message: string };

/**
 * Create a shadow parent user (auth_id=null, role='parent') + parents
 * extension + parent_student_links link. Idempotent: if the email is
 * already linked to the student, no-ops. The shadow parent cannot log in
 * until Phase B's parent OTP claims auth_id via the same anon→authed
 * conversion pattern used for students in Step 5.
 *
 * Sends a courtesy "you've been added — click here to opt out" email on
 * first link so the parent has agency before the first weekly lands.
 */
export async function linkParentEmailAction(rawEmail: string): Promise<LinkParentResult> {
  const session = await requireSession();
  const email = rawEmail.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'invalid_email', message: 'Enter a valid email.' };
  }
  if (session.email && email === session.email.toLowerCase()) {
    return { ok: false, reason: 'self', message: `You can't add your own email as a parent.` };
  }

  const supabase = getServiceClient();

  try {
    // Upsert the shadow parent user (auth_id stays null — they claim it in
    // Phase B via OTP if/when we build the parent onboarding surface).
    const { data: parentUser, error: userErr } = await supabase
      .from('users')
      .upsert(
        { email, role: 'parent' },
        { onConflict: 'email', ignoreDuplicates: false },
      )
      .select('id, display_name')
      .single();
    if (userErr || !parentUser) {
      throw new Error(userErr?.message ?? 'users upsert returned no row');
    }

    const { error: parentExtErr } = await supabase
      .from('parents')
      .upsert(
        { id: parentUser.id, unsubscribed_at: null },
        { onConflict: 'id', ignoreDuplicates: false },
      );
    if (parentExtErr) throw new Error(parentExtErr.message);

    // Idempotent link insert (parent_student_links has a UNIQUE constraint
    // on (parent_id, student_id)).
    const { error: linkErr } = await supabase.from('parent_student_links').upsert(
      { parent_id: parentUser.id, student_id: session.id },
      { onConflict: 'parent_id,student_id', ignoreDuplicates: true },
    );
    if (linkErr) throw new Error(linkErr.message);

    // Welcome/opt-out courtesy email. Silent best-effort — surfacing a
    // failure back to the student UI isn't useful. Logged for ops.
    const welcomeSent = await sendWelcomeEmail({
      parentId: parentUser.id,
      parentEmail: email,
      parentDisplayName: parentUser.display_name,
      studentName: session.displayName ?? 'your student',
    });

    revalidatePath('/app/profile');
    return { ok: true, welcomeSent };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`linkParentEmail failed: ${message}`);
    return { ok: false, reason: 'unknown', message: 'Could not link. Try again.' };
  }
}

export async function unlinkParentEmailAction(parentId: string): Promise<void> {
  const session = await requireSession();
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('parent_student_links')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', session.id);
  if (error) throw new Error(`Failed to unlink: ${error.message}`);
  revalidatePath('/app/profile');
}

async function sendWelcomeEmail(params: {
  parentId: string;
  parentEmail: string;
  parentDisplayName: string | null;
  studentName: string;
}): Promise<boolean> {
  if (!providerStatus.postmark) {
    log.info('Welcome email skipped: Postmark not configured');
    return false;
  }

  const baseUrl = await deriveBaseUrl();

  // Reuse the weekly template with a zero-activity StudentSummary — the
  // template already renders a gentle "no activity yet" line for fresh
  // links, and the unsubscribe URL is embedded. The subject and body read
  // naturally for a first-touch email.
  const summary: StudentSummary = {
    studentId: '',
    studentName: params.studentName,
    interactionsLastWeek: 0,
    chaptersTouchedLastWeek: 0,
    qaHitRate: 0,
    fallbackCount: 0,
    rateLimitHits: 0,
    streakDays: 0,
    mostActiveChapterTitle: null,
  };

  const rendered = renderParentEmail({
    parentId: params.parentId,
    parentEmail: params.parentEmail,
    parentDisplayName: params.parentDisplayName,
    students: [summary],
    baseUrl,
  });

  const result = await sendParentEmail(params.parentEmail, rendered);
  if (!result.ok) {
    log.error(`Welcome email failed: ${result.reason} — ${result.message}`);
    return false;
  }
  return true;
}

async function deriveBaseUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (envUrl) return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}
