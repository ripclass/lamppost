import { getServiceClient } from '../../supabase';

export interface CurriculumNode {
  id: string;
  name: string;
  board: string | null;
  language: string;
  subjects: readonly SubjectNode[];
}

export interface SubjectNode {
  id: string;
  name: string;
  nameBn: string | null;
  grade: string | null;
  chapters: readonly ChapterNode[];
}

export interface ChapterNode {
  id: string;
  chapterNumber: number;
  title: string;
  generationStatus: string;
  updatedAt: string;
  qaEntryCount: number;
  needsRegeneration: boolean;
}

export interface ChapterDetail {
  id: string;
  subjectId: string;
  subjectName: string;
  curriculumName: string;
  chapterNumber: number;
  title: string;
  titleBn: string | null;
  description: string | null;
  generationStatus: string;
  generationModel: string | null;
  generationCostUsd: number | null;
  needsRegeneration: boolean;
  updatedAt: string;
  createdAt: string;
  sceneCount: number;
}

export interface ChapterQaEntry {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  questionType: string;
  topicTags: readonly string[];
  hasWhiteboard: boolean;
  timesMatched: number;
  source: string;
  createdAt: string;
}

/**
 * Full tree, single round-trip per table. Suitable for admin scale (hundreds
 * of chapters, not hundreds of thousands). Swap to per-subject lazy loading
 * if the catalogue grows.
 */
export async function getContentTree(): Promise<readonly CurriculumNode[]> {
  const supabase = getServiceClient();
  const [curricula, subjects, chapters, qaCounts] = await Promise.all([
    supabase
      .from('curricula')
      .select('id, name, board, language, created_at')
      .order('name'),
    supabase
      .from('subjects')
      .select('id, curriculum_id, name, name_bn, grade, code')
      .order('name'),
    supabase
      .from('chapters')
      .select(
        'id, subject_id, chapter_number, title, generation_status, updated_at, metadata',
      )
      .order('chapter_number'),
    supabase.from('qa_bank').select('chapter_id'),
  ]);

  if (curricula.error) throw new Error(curricula.error.message);
  if (subjects.error) throw new Error(subjects.error.message);
  if (chapters.error) throw new Error(chapters.error.message);

  const qaByChapter = new Map<string, number>();
  for (const row of qaCounts.data ?? []) {
    const key = row.chapter_id as string | null;
    if (!key) continue;
    qaByChapter.set(key, (qaByChapter.get(key) ?? 0) + 1);
  }

  const chaptersBySubject = new Map<string, ChapterNode[]>();
  for (const c of chapters.data ?? []) {
    const node: ChapterNode = {
      id: c.id,
      chapterNumber: c.chapter_number,
      title: c.title,
      generationStatus: c.generation_status,
      updatedAt: c.updated_at,
      qaEntryCount: qaByChapter.get(c.id) ?? 0,
      needsRegeneration: Boolean(
        (c.metadata as Record<string, unknown> | null)?.needs_regeneration,
      ),
    };
    if (!chaptersBySubject.has(c.subject_id)) chaptersBySubject.set(c.subject_id, []);
    chaptersBySubject.get(c.subject_id)!.push(node);
  }

  const subjectsByCurriculum = new Map<string, SubjectNode[]>();
  for (const s of subjects.data ?? []) {
    const node: SubjectNode = {
      id: s.id,
      name: s.name,
      nameBn: s.name_bn,
      grade: s.grade,
      chapters: chaptersBySubject.get(s.id) ?? [],
    };
    if (!subjectsByCurriculum.has(s.curriculum_id)) subjectsByCurriculum.set(s.curriculum_id, []);
    subjectsByCurriculum.get(s.curriculum_id)!.push(node);
  }

  return (curricula.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    board: c.board,
    language: c.language,
    subjects: subjectsByCurriculum.get(c.id) ?? [],
  }));
}

export async function getChapterDetail(chapterId: string): Promise<ChapterDetail | null> {
  const supabase = getServiceClient();
  const { data: chapter } = await supabase
    .from('chapters')
    .select(
      'id, subject_id, chapter_number, title, title_bn, description, generation_status, generation_model, generation_cost_usd, metadata, updated_at, created_at',
    )
    .eq('id', chapterId)
    .maybeSingle();
  if (!chapter) return null;

  const [subjectResult, lessonResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, name, curriculum_id, curricula(name)')
      .eq('id', chapter.subject_id)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('scenes')
      .eq('chapter_id', chapter.id)
      .maybeSingle(),
  ]);

  const scenes = lessonResult.data?.scenes as unknown[] | null;
  const curriculumName =
    (subjectResult.data?.curricula as { name?: string } | undefined)?.name ?? 'Unknown';

  return {
    id: chapter.id,
    subjectId: chapter.subject_id,
    subjectName: subjectResult.data?.name ?? 'Unknown',
    curriculumName,
    chapterNumber: chapter.chapter_number,
    title: chapter.title,
    titleBn: chapter.title_bn,
    description: chapter.description,
    generationStatus: chapter.generation_status,
    generationModel: chapter.generation_model,
    generationCostUsd:
      chapter.generation_cost_usd !== null ? Number(chapter.generation_cost_usd) : null,
    needsRegeneration: Boolean(
      (chapter.metadata as Record<string, unknown> | null)?.needs_regeneration,
    ),
    updatedAt: chapter.updated_at,
    createdAt: chapter.created_at,
    sceneCount: Array.isArray(scenes) ? scenes.length : 0,
  };
}

export async function getChapterQaEntries(
  chapterId: string,
  limit = 100,
): Promise<readonly ChapterQaEntry[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('qa_bank')
    .select(
      'id, question, answer, difficulty, question_type, topic_tags, has_whiteboard, times_matched, source, created_at',
    )
    .eq('chapter_id', chapterId)
    .order('times_matched', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    difficulty: r.difficulty ?? 'medium',
    questionType: r.question_type ?? 'conceptual',
    topicTags: (r.topic_tags as string[] | null) ?? [],
    hasWhiteboard: r.has_whiteboard ?? false,
    timesMatched: r.times_matched ?? 0,
    source: r.source ?? 'opus_generated',
    createdAt: r.created_at,
  }));
}

/**
 * Flip the `needs_regeneration` flag on a chapter's metadata. The existing
 * batch-generator pipeline can pick up chapters where this flag is true.
 * No migration required — we use the existing `chapters.metadata` JSONB.
 */
export async function setChapterNeedsRegeneration(
  chapterId: string,
  needsRegeneration: boolean,
): Promise<void> {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from('chapters')
    .select('metadata')
    .eq('id', chapterId)
    .maybeSingle();
  const metadata = (existing?.metadata as Record<string, unknown> | null) ?? {};
  metadata.needs_regeneration = needsRegeneration;
  const { error } = await supabase
    .from('chapters')
    .update({ metadata })
    .eq('id', chapterId);
  if (error) throw new Error(`Failed to flag chapter: ${error.message}`);
}
