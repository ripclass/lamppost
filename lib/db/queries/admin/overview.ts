import { getServiceClient } from '../../supabase';

export interface OverviewMetrics {
  dau: number; // distinct student_id OR anonymous_session_id today
  wau: number; // same, over last 7 days
  totalInteractions30d: number;
  apiSpendLast30d: number;
  apiSpendDailySeries: Array<{ date: string; spend: number }>;
  qaBankHitRate: number;
  totalInteractionsAllTime: number;
}

export interface OverviewAlert {
  kind: 'low_match_rate' | 'stuck_generation' | 'failed_generation';
  chapterId: string;
  chapterTitle: string;
  detail: string;
}

export interface FlywheelHealth {
  lastRunAt: string | null;
  unmatchedPending: number;
  unmatchedProcessedLast24h: number;
  newQaEntriesLast24h: number;
}

/**
 * Hard-coded 30-day window + 7-day window + today window. Migrations are
 * Asia/Dhaka date-based; we compute the windows in UTC for metric accuracy
 * since interactions.created_at is TIMESTAMPTZ.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const supabase = getServiceClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);

  const { data: recent } = await supabase
    .from('student_interactions')
    .select('student_id, anonymous_session_id, resolution_type, cost_usd, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { count: allTime } = await supabase
    .from('student_interactions')
    .select('*', { count: 'exact', head: true });

  const rows = recent ?? [];

  const todayActors = new Set<string>();
  const weekActors = new Set<string>();
  let totalInteractions30d = 0;
  let apiSpend30d = 0;
  let matchCount = 0;
  const dailySeries: Record<string, number> = {};

  for (const row of rows) {
    const created = new Date(row.created_at);
    const actor = row.student_id ?? row.anonymous_session_id;
    if (actor) {
      if (created >= todayStart) todayActors.add(actor);
      if (created >= sevenDaysAgo) weekActors.add(actor);
    }
    totalInteractions30d++;
    const cost = Number(row.cost_usd) || 0;
    apiSpend30d += cost;
    const dateKey = created.toISOString().slice(0, 10);
    dailySeries[dateKey] = (dailySeries[dateKey] ?? 0) + cost;
    if (row.resolution_type === 'qa_bank_match') matchCount++;
  }

  // Fill 30 days of zero values so the spark line has a consistent domain.
  const series: Array<{ date: string; spend: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * MS_PER_DAY);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, spend: +(dailySeries[key] ?? 0).toFixed(6) });
  }

  return {
    dau: todayActors.size,
    wau: weekActors.size,
    totalInteractions30d,
    apiSpendLast30d: +apiSpend30d.toFixed(6),
    apiSpendDailySeries: series,
    qaBankHitRate: totalInteractions30d > 0 ? matchCount / totalInteractions30d : 0,
    totalInteractionsAllTime: allTime ?? 0,
  };
}

/**
 * Active alerts. Each alert is independently queried — failures on one don't
 * block the others (Overview is read-mostly and tolerant of partial data).
 */
export async function getOverviewAlerts(): Promise<readonly OverviewAlert[]> {
  const supabase = getServiceClient();
  const alerts: OverviewAlert[] = [];

  // Stuck generations: status='generating' and updated > 24h ago.
  const dayAgo = new Date(Date.now() - MS_PER_DAY).toISOString();
  const { data: stuck } = await supabase
    .from('chapters')
    .select('id, title, updated_at')
    .eq('generation_status', 'generating')
    .lt('updated_at', dayAgo);
  for (const row of stuck ?? []) {
    alerts.push({
      kind: 'stuck_generation',
      chapterId: row.id,
      chapterTitle: row.title,
      detail: `Generating since ${new Date(row.updated_at).toLocaleString()}`,
    });
  }

  // Failed generations in last 24h.
  const { data: failed } = await supabase
    .from('chapters')
    .select('id, title, updated_at')
    .eq('generation_status', 'failed')
    .gte('updated_at', dayAgo);
  for (const row of failed ?? []) {
    alerts.push({
      kind: 'failed_generation',
      chapterId: row.id,
      chapterTitle: row.title,
      detail: `Failed at ${new Date(row.updated_at).toLocaleString()}`,
    });
  }

  // Low-match chapters: hit rate < 0.80 across the chapter's interactions.
  // We only flag chapters with at least 20 interactions so new fixtures
  // don't generate noise.
  const { data: interactionsByChapter } = await supabase
    .from('student_interactions')
    .select('chapter_id, resolution_type');
  const byChapter: Record<string, { total: number; matches: number }> = {};
  for (const row of interactionsByChapter ?? []) {
    if (!row.chapter_id) continue;
    const key = row.chapter_id as string;
    byChapter[key] ??= { total: 0, matches: 0 };
    byChapter[key].total++;
    if (row.resolution_type === 'qa_bank_match') byChapter[key].matches++;
  }
  const lowMatchIds = Object.entries(byChapter)
    .filter(([, v]) => v.total >= 20 && v.matches / v.total < 0.8)
    .map(([id, v]) => ({ id, hitRate: v.matches / v.total }));
  if (lowMatchIds.length > 0) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title')
      .in(
        'id',
        lowMatchIds.map((c) => c.id),
      );
    const titleMap = new Map<string, string>((chapters ?? []).map((c) => [c.id, c.title]));
    for (const c of lowMatchIds) {
      alerts.push({
        kind: 'low_match_rate',
        chapterId: c.id,
        chapterTitle: titleMap.get(c.id) ?? 'Unknown chapter',
        detail: `Hit rate ${(c.hitRate * 100).toFixed(0)}% (threshold 80%)`,
      });
    }
  }

  return alerts;
}

export async function getFlywheelHealth(): Promise<FlywheelHealth> {
  const supabase = getServiceClient();
  const dayAgo = new Date(Date.now() - MS_PER_DAY).toISOString();

  const { count: pending } = await supabase
    .from('unmatched_questions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: processed } = await supabase
    .from('unmatched_questions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dayAgo)
    .in('status', ['sent_to_opus', 'added_to_bank', 'discarded']);

  const { count: newEntries } = await supabase
    .from('qa_bank')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'student_derived')
    .gte('created_at', dayAgo);

  const { data: lastRun } = await supabase
    .from('unmatched_questions')
    .select('created_at')
    .in('status', ['sent_to_opus', 'added_to_bank'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    lastRunAt: lastRun?.created_at ?? null,
    unmatchedPending: pending ?? 0,
    unmatchedProcessedLast24h: processed ?? 0,
    newQaEntriesLast24h: newEntries ?? 0,
  };
}
