import 'server-only';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import { getServiceClient } from '@/lib/db/supabase';

const COOKIE_NAME = 'lp_onb';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface OnboardingSession {
  id: string;
  sessionToken: string;
  curriculumChoice: string | null;
  subjectChoice: string | null;
  sampleChapterId: string | null;
  completedSample: boolean;
  convertedUserId: string | null;
}

/**
 * Read the anonymous onboarding session from the cookie, if one exists.
 * Does NOT create a new session — use `getOrCreateOnboardingSession` for that.
 */
export async function getOnboardingSession(): Promise<OnboardingSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('onboarding_sessions')
    .select(
      'id, session_token, curriculum_choice, subject_choice, sample_chapter_id, completed_sample, converted_user_id',
    )
    .eq('session_token', token)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    sessionToken: data.session_token,
    curriculumChoice: data.curriculum_choice,
    subjectChoice: data.subject_choice,
    sampleChapterId: data.sample_chapter_id,
    completedSample: data.completed_sample ?? false,
    convertedUserId: data.converted_user_id,
  };
}

export async function getOrCreateOnboardingSession(init?: {
  ipHash?: string;
  userAgent?: string;
}): Promise<OnboardingSession> {
  const existing = await getOnboardingSession();
  if (existing) return existing;

  const token = nanoid(32);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('onboarding_sessions')
    .insert({
      session_token: token,
      last_ip_hash: init?.ipHash,
      user_agent: init?.userAgent,
    })
    .select(
      'id, session_token, curriculum_choice, subject_choice, sample_chapter_id, completed_sample, converted_user_id',
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to create onboarding session: ${error?.message}`);
  }

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return {
    id: data.id,
    sessionToken: data.session_token,
    curriculumChoice: data.curriculum_choice,
    subjectChoice: data.subject_choice,
    sampleChapterId: data.sample_chapter_id,
    completedSample: data.completed_sample ?? false,
    convertedUserId: data.converted_user_id,
  };
}

export async function clearOnboardingCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const ONBOARDING_COOKIE_NAME = COOKIE_NAME;
