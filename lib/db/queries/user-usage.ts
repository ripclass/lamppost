import { getServiceClient } from '../supabase';

/**
 * Keying information for a usage row. Exactly one of userId or
 * anonymousSessionToken must be set (enforced by migration 010 CHECK).
 */
export interface UsageKey {
  userId?: string;
  anonymousSessionToken?: string;
  ipHash?: string;
}

/** YYYY-MM-DD in Asia/Dhaka — matches the `date` default in migration 010. */
function todayInDhaka(): string {
  // en-CA returns ISO-style YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

/**
 * Increment the daily interaction count for a user or anonymous session
 * and return the new count.
 *
 * Soft rate limiter: the check-then-update path has a small race window,
 * so the effective cap is `cap ± concurrency`. Acceptable for UX caps —
 * over-count by 1-2 under load is fine. Tighten with a Postgres RPC
 * if strict atomicity is needed later.
 */
export async function incrementDailyUsage(key: UsageKey): Promise<number> {
  if (!key.userId && !key.anonymousSessionToken) {
    throw new Error('incrementDailyUsage requires userId or anonymousSessionToken');
  }

  const supabase = getServiceClient();
  const date = todayInDhaka();
  const matchColumn = key.userId ? 'user_id' : 'anonymous_session_token';
  const matchValue = (key.userId ?? key.anonymousSessionToken) as string;

  const { data: existing, error: selectError } = await supabase
    .from('user_usage_daily')
    .select('id, interaction_count')
    .eq('date', date)
    .eq(matchColumn, matchValue)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const newCount = existing.interaction_count + 1;
    const { error } = await supabase
      .from('user_usage_daily')
      .update({ interaction_count: newCount, last_updated: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    return newCount;
  }

  const { error } = await supabase.from('user_usage_daily').insert({
    user_id: key.userId ?? null,
    anonymous_session_token: key.anonymousSessionToken ?? null,
    ip_hash: key.ipHash ?? null,
    date,
    interaction_count: 1,
  });
  if (error) throw error;
  return 1;
}
