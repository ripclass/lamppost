import { getServiceClient } from '../supabase';
import { createLogger } from '@/lib/logger';
import type { QAEntry, QASearchResult, UnmatchedQuestion } from '@/lib/qa-bank/types';

const log = createLogger('QABankQueries');

/**
 * Vector similarity search against the Q&A bank using pgvector.
 * Returns top-K entries ordered by cosine similarity.
 */
export async function searchByEmbedding(params: {
  embedding: number[];
  chapterId: string;
  topK?: number;
  sceneIndex?: number;
}): Promise<QASearchResult[]> {
  const { embedding, chapterId, topK = 5, sceneIndex } = params;
  const supabase = getServiceClient();

  // Use Supabase's RPC to call a pgvector similarity search
  const { data, error } = await supabase.rpc('search_qa_bank', {
    query_embedding: embedding,
    target_chapter_id: chapterId,
    match_count: topK,
    filter_scene_index: sceneIndex ?? null,
  });

  if (error) {
    log.error('Q&A bank search failed:', error.message);
    throw new Error(`Q&A bank search failed: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    entry: {
      id: row.id as string,
      chapterId: row.chapter_id as string,
      question: row.question as string,
      questionBn: row.question_bn as string | undefined,
      answer: row.answer as string,
      answerBn: row.answer_bn as string | undefined,
      sceneIndex: row.scene_index as number | undefined,
      topicTags: row.topic_tags as string[],
      difficulty: row.difficulty as string,
      questionType: row.question_type as string,
      commonWrongAnswer: row.common_wrong_answer as string | undefined,
      whyWrong: row.why_wrong as string | undefined,
      hasWhiteboard: row.has_whiteboard as boolean,
      whiteboardInstructions: row.whiteboard_instructions as Record<string, unknown> | undefined,
      source: row.source as string,
      timesMatched: row.times_matched as number,
    },
    similarity: row.similarity as number,
  }));
}

/**
 * Increment the match counter on a Q&A entry (called after serving an answer).
 */
export async function incrementMatchCount(qaId: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.rpc('increment_qa_match_count', {
    qa_id: qaId,
  });

  if (error) {
    log.warn('Failed to increment match count for', qaId, error.message);
  }
}

/**
 * Save an unmatched question to the flywheel queue.
 */
export async function insertUnmatchedQuestion(
  question: Omit<UnmatchedQuestion, 'id' | 'createdAt'>,
): Promise<string> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('unmatched_questions')
    .insert({
      chapter_id: question.chapterId,
      student_id: question.studentId,
      question: question.question,
      question_embedding: question.questionEmbedding,
      fallback_answer: question.fallbackAnswer,
      fallback_model: question.fallbackModel,
      scene_index: question.sceneIndex,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    log.error('Failed to save unmatched question:', error.message);
    throw new Error(`Failed to save unmatched question: ${error.message}`);
  }

  return data.id as string;
}

/**
 * Get pending unmatched questions for flywheel processing.
 */
export async function getPendingUnmatched(params: {
  chapterId?: string;
  limit?: number;
}): Promise<UnmatchedQuestion[]> {
  const { chapterId, limit = 50 } = params;
  const supabase = getServiceClient();

  let query = supabase
    .from('unmatched_questions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (chapterId) {
    query = query.eq('chapter_id', chapterId);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Failed to fetch pending unmatched questions:', error.message);
    throw new Error(`Failed to fetch pending unmatched: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    chapterId: row.chapter_id,
    studentId: row.student_id,
    question: row.question,
    questionEmbedding: row.question_embedding,
    fallbackAnswer: row.fallback_answer,
    fallbackModel: row.fallback_model,
    studentContinued: row.student_continued,
    followUpQuestion: row.follow_up_question,
    status: row.status,
    sceneIndex: row.scene_index,
    createdAt: row.created_at,
  }));
}

/**
 * Insert new Q&A entries in bulk (used after Opus batch generation).
 */
export async function insertQAEntries(
  entries: Array<Omit<QAEntry, 'id' | 'timesMatched'>>,
): Promise<number> {
  const supabase = getServiceClient();

  const rows = entries.map((e) => ({
    chapter_id: e.chapterId,
    question: e.question,
    question_bn: e.questionBn,
    question_embedding: e.questionEmbedding,
    answer: e.answer,
    answer_bn: e.answerBn,
    scene_index: e.sceneIndex,
    topic_tags: e.topicTags,
    difficulty: e.difficulty,
    question_type: e.questionType,
    common_wrong_answer: e.commonWrongAnswer,
    why_wrong: e.whyWrong,
    has_whiteboard: e.hasWhiteboard,
    whiteboard_instructions: e.whiteboardInstructions,
    source: e.source,
    opus_batch_id: e.opusBatchId,
  }));

  const { data, error } = await supabase.from('qa_bank').insert(rows).select('id');

  if (error) {
    log.error('Failed to insert Q&A entries:', error.message);
    throw new Error(`Failed to insert Q&A entries: ${error.message}`);
  }

  return data?.length ?? 0;
}

/**
 * Get Q&A bank stats for a chapter.
 */
export async function getChapterQAStats(chapterId: string) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('qa_bank')
    .select('difficulty, question_type, times_matched, source', { count: 'exact' })
    .eq('chapter_id', chapterId);

  if (error) {
    log.error('Failed to get Q&A stats:', error.message);
    throw new Error(`Failed to get Q&A stats: ${error.message}`);
  }

  const entries = data ?? [];
  const totalMatches = entries.reduce((sum, e) => sum + (e.times_matched ?? 0), 0);

  const byDifficulty: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const e of entries) {
    byDifficulty[e.difficulty] = (byDifficulty[e.difficulty] ?? 0) + 1;
    byType[e.question_type] = (byType[e.question_type] ?? 0) + 1;
    bySource[e.source] = (bySource[e.source] ?? 0) + 1;
  }

  return {
    totalEntries: entries.length,
    totalMatches,
    byDifficulty,
    byType,
    bySource,
  };
}
