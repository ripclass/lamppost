import { getServiceClient } from '../../supabase';

export interface UserSearchRow {
  id: string;
  role: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  lastInteractionAt: string | null;
  totalInteractions: number;
}

export interface UserDetail {
  id: string;
  authId: string | null;
  role: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  languagePreference: string | null;
  themePreference: string | null;
  createdAt: string;
  studyGoal: string | null;
  dailyMinutesCommitment: number | null;
  targetExamDate: string | null;
}

export interface UserInteractionRow {
  id: string;
  chapterId: string | null;
  chapterTitle: string | null;
  interactionType: string;
  resolutionType: string;
  studentInput: string | null;
  costUsd: number;
  latencyMs: number | null;
  createdAt: string;
}

export async function searchUsers(query: string, limit = 50): Promise<readonly UserSearchRow[]> {
  const supabase = getServiceClient();
  const trimmed = query.trim();

  let builder = supabase
    .from('users')
    .select('id, role, display_name, email, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (trimmed.length > 0) {
    // UUID exact match OR case-insensitive substring on name/email/phone.
    if (isUuid(trimmed)) {
      builder = builder.eq('id', trimmed);
    } else {
      const like = `%${trimmed}%`;
      builder = builder.or(
        `display_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      );
    }
  }

  const { data: users, error } = await builder;
  if (error) throw new Error(`Failed to search users: ${error.message}`);
  if (!users || users.length === 0) return [];

  // Pull interaction stats for the matched users in one query.
  const ids = users.map((u) => u.id);
  const { data: interactions } = await supabase
    .from('student_interactions')
    .select('student_id, created_at')
    .in('student_id', ids);

  const statsByUser = new Map<string, { count: number; last: string | null }>();
  for (const row of interactions ?? []) {
    if (!row.student_id) continue;
    const current = statsByUser.get(row.student_id) ?? { count: 0, last: null };
    current.count++;
    if (!current.last || row.created_at > current.last) current.last = row.created_at;
    statsByUser.set(row.student_id, current);
  }

  return users.map((u) => ({
    id: u.id,
    role: u.role,
    displayName: u.display_name,
    email: u.email,
    phone: u.phone,
    createdAt: u.created_at,
    lastInteractionAt: statsByUser.get(u.id)?.last ?? null,
    totalInteractions: statsByUser.get(u.id)?.count ?? 0,
  }));
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select(
      'id, auth_id, role, display_name, email, phone, language_preference, theme_preference, created_at',
    )
    .eq('id', userId)
    .maybeSingle();
  if (!user) return null;

  const { data: student } = await supabase
    .from('students')
    .select('study_goal, daily_minutes_commitment, target_exam_date')
    .eq('id', userId)
    .maybeSingle();

  return {
    id: user.id,
    authId: user.auth_id,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
    phone: user.phone,
    languagePreference: user.language_preference,
    themePreference: user.theme_preference,
    createdAt: user.created_at,
    studyGoal: student?.study_goal ?? null,
    dailyMinutesCommitment: student?.daily_minutes_commitment ?? null,
    targetExamDate: student?.target_exam_date ?? null,
  };
}

export async function getUserRecentInteractions(
  userId: string,
  limit = 25,
): Promise<readonly UserInteractionRow[]> {
  const supabase = getServiceClient();
  const { data: rows } = await supabase
    .from('student_interactions')
    .select(
      'id, chapter_id, interaction_type, resolution_type, student_input, cost_usd, latency_ms, created_at',
    )
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) return [];

  const chapterIds = Array.from(new Set(rows.map((r) => r.chapter_id).filter(Boolean) as string[]));
  const chapterTitles = new Map<string, string>();
  if (chapterIds.length > 0) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title')
      .in('id', chapterIds);
    for (const c of chapters ?? []) chapterTitles.set(c.id, c.title);
  }

  return rows.map((r) => ({
    id: r.id,
    chapterId: r.chapter_id,
    chapterTitle: r.chapter_id ? (chapterTitles.get(r.chapter_id) ?? null) : null,
    interactionType: r.interaction_type,
    resolutionType: r.resolution_type,
    studentInput: r.student_input,
    costUsd: Number(r.cost_usd) || 0,
    latencyMs: r.latency_ms,
    createdAt: r.created_at,
  }));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
