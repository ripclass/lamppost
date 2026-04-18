import 'server-only';
import { getServiceClient } from '@/lib/db/supabase';
import { clearOnboardingCookie } from './anonymous';

/**
 * After OTP completes, stitch the anonymous onboarding session to the new
 * authenticated user:
 *   1. Create the `users` row (root profile) if missing
 *   2. Create the `students` extension row
 *   3. Re-attribute `student_interactions` rows from the anonymous session to
 *      the new student_id
 *   4. Mark the onboarding session as converted
 *
 * Runs in a single Supabase RPC call to stay transactional. The RPC is defined
 * in migration 014 (added alongside this code once the helper is wired up in
 * Step 5). For now this helper expects the RPC `rpc_convert_onboarding_session`
 * to exist — if it doesn't, the call fails loudly rather than silently.
 */
export async function convertAnonymousToUser(params: {
  authId: string;
  onboardingSessionId: string;
  phone?: string;
  email?: string;
  displayName?: string;
}): Promise<{ userId: string }> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('rpc_convert_onboarding_session', {
    p_auth_id: params.authId,
    p_onboarding_session_id: params.onboardingSessionId,
    p_phone: params.phone ?? null,
    p_email: params.email ?? null,
    p_display_name: params.displayName ?? null,
  });

  if (error || !data?.user_id) {
    throw new Error(
      `Failed to convert onboarding session: ${error?.message ?? 'no user_id returned'}`,
    );
  }

  await clearOnboardingCookie();
  return { userId: data.user_id };
}
