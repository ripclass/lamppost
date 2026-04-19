import 'server-only';
import { getServiceClient } from '../supabase';
import type { StudentSummary } from '@/lib/notifications/parent-email';

export interface DueParent {
  readonly parentId: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly studentIds: readonly string[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Return every parent currently eligible for the weekly email:
 *   - has a parent_student_links row (at least one student)
 *   - users.email is non-null
 *   - parents.unsubscribed_at is null
 *   - parents.email_preferences.weekly_summary is not false (default true)
 *
 * Grouped per parent — one entry per parent, even if they watch multiple
 * students. The caller decides whether to actually send (graceful-skip when
 * Postmark isn't configured).
 */
export async function listDueParents(): Promise<readonly DueParent[]> {
  const supabase = getServiceClient();

  const { data: parents, error } = await supabase
    .from('parents')
    .select(
      'id, email_preferences, unsubscribed_at, users!inner(id, email, display_name)',
    )
    .is('unsubscribed_at', null);
  if (error) throw new Error(`Failed to list parents: ${error.message}`);

  const parentIds = (parents ?? []).map((p) => p.id);
  if (parentIds.length === 0) return [];

  const { data: links } = await supabase
    .from('parent_student_links')
    .select('parent_id, student_id')
    .in('parent_id', parentIds);

  const linksByParent = new Map<string, string[]>();
  for (const row of links ?? []) {
    const bucket = linksByParent.get(row.parent_id) ?? [];
    bucket.push(row.student_id);
    linksByParent.set(row.parent_id, bucket);
  }

  const due: DueParent[] = [];
  for (const parent of parents ?? []) {
    // The embedded join is typed loosely; unwrap the users row carefully.
    const user = (parent.users as unknown) as {
      id: string;
      email: string | null;
      display_name: string | null;
    } | null;
    if (!user?.email) continue;

    const prefs = (parent.email_preferences as Record<string, unknown> | null) ?? {};
    if (prefs.weekly_summary === false) continue;

    const studentIds = linksByParent.get(parent.id) ?? [];
    if (studentIds.length === 0) continue;

    due.push({
      parentId: parent.id,
      email: user.email,
      displayName: user.display_name,
      studentIds,
    });
  }

  return due;
}

/**
 * Compute one week of stats for each student id, keyed for the parent
 * template. Does two queries: one for user names, one for interactions in
 * the last 7 days. Chapter titles are resolved in a third batch query.
 */
export async function getStudentSummaries(
  studentIds: readonly string[],
  now: Date = new Date(),
): Promise<readonly StudentSummary[]> {
  if (studentIds.length === 0) return [];
  const supabase = getServiceClient();
  const weekStart = new Date(now.getTime() - 7 * MS_PER_DAY);

  const [usersResult, interactionsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, display_name')
      .in('id', studentIds as string[]),
    supabase
      .from('student_interactions')
      .select('student_id, chapter_id, resolution_type, created_at')
      .in('student_id', studentIds as string[])
      .gte('created_at', weekStart.toISOString()),
  ]);

  const usersById = new Map<string, string>(
    (usersResult.data ?? []).map((u) => [u.id, u.display_name ?? 'your student']),
  );

  const perStudent = new Map<
    string,
    {
      interactions: number;
      chapters: Set<string>;
      matches: number;
      fallbacks: number;
      rateLimits: number;
      byChapter: Map<string, number>;
      days: Set<string>; // YYYY-MM-DD, Asia/Dhaka
    }
  >();
  for (const id of studentIds) {
    perStudent.set(id, {
      interactions: 0,
      chapters: new Set(),
      matches: 0,
      fallbacks: 0,
      rateLimits: 0,
      byChapter: new Map(),
      days: new Set(),
    });
  }

  for (const row of interactionsResult.data ?? []) {
    if (!row.student_id) continue;
    const bucket = perStudent.get(row.student_id);
    if (!bucket) continue;
    bucket.interactions++;
    if (row.chapter_id) {
      bucket.chapters.add(row.chapter_id);
      bucket.byChapter.set(row.chapter_id, (bucket.byChapter.get(row.chapter_id) ?? 0) + 1);
    }
    if (row.resolution_type === 'qa_bank_match') bucket.matches++;
    if (row.resolution_type === 'fallback_llm') bucket.fallbacks++;
    if (row.resolution_type === 'rate_limit_block') bucket.rateLimits++;
    bucket.days.add(dhakaDateKey(new Date(row.created_at)));
  }

  const allChapterIds = new Set<string>();
  for (const bucket of perStudent.values()) {
    for (const id of bucket.byChapter.keys()) allChapterIds.add(id);
  }
  const chapterTitles = new Map<string, string>();
  if (allChapterIds.size > 0) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title')
      .in('id', Array.from(allChapterIds));
    for (const c of chapters ?? []) chapterTitles.set(c.id, c.title);
  }

  const summaries: StudentSummary[] = [];
  for (const studentId of studentIds) {
    const bucket = perStudent.get(studentId)!;
    const totalResolved = bucket.matches + bucket.fallbacks;
    const hitRate = totalResolved > 0 ? bucket.matches / totalResolved : 0;

    let topChapterId: string | null = null;
    let topChapterCount = 0;
    for (const [id, count] of bucket.byChapter.entries()) {
      if (count > topChapterCount) {
        topChapterCount = count;
        topChapterId = id;
      }
    }

    summaries.push({
      studentId,
      studentName: usersById.get(studentId) ?? 'your student',
      interactionsLastWeek: bucket.interactions,
      chaptersTouchedLastWeek: bucket.chapters.size,
      qaHitRate: hitRate,
      fallbackCount: bucket.fallbacks,
      rateLimitHits: bucket.rateLimits,
      streakDays: computeStreak(bucket.days, now),
      mostActiveChapterTitle: topChapterId ? (chapterTitles.get(topChapterId) ?? null) : null,
    });
  }

  return summaries;
}

function computeStreak(daysWithActivity: ReadonlySet<string>, now: Date): number {
  let streak = 0;
  let cursor = new Date(now);
  // Count consecutive days backward from today (Asia/Dhaka) that had activity.
  while (daysWithActivity.has(dhakaDateKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return streak;
}

function dhakaDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

/**
 * Mark a parent as unsubscribed. Idempotent.
 */
export async function markParentUnsubscribed(parentId: string, now: Date = new Date()): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('parents')
    .update({ unsubscribed_at: now.toISOString() })
    .eq('id', parentId)
    .is('unsubscribed_at', null);
  if (error) throw new Error(`Failed to mark parent unsubscribed: ${error.message}`);
}
