import { getServiceClient } from '../supabase';
import { createLogger } from '@/lib/logger';
import type { Chapter, Subject, Curriculum } from '@/lib/curriculum/types';

const log = createLogger('ChapterQueries');

// ==================== Curricula ====================

export async function listCurricula(): Promise<Curriculum[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('curricula')
    .select('*')
    .order('name');

  if (error) throw new Error(`Failed to list curricula: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    board: row.board,
    language: row.language,
    country: row.country,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

export async function createCurriculum(params: {
  name: string;
  board?: string;
  language?: string;
  country?: string;
}): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('curricula')
    .insert({
      name: params.name,
      board: params.board,
      language: params.language ?? 'en',
      country: params.country ?? 'BD',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create curriculum: ${error.message}`);
  return data.id;
}

// ==================== Subjects ====================

export async function listSubjects(curriculumId: string): Promise<Subject[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('curriculum_id', curriculumId)
    .order('name');

  if (error) throw new Error(`Failed to list subjects: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    curriculumId: row.curriculum_id,
    name: row.name,
    nameBn: row.name_bn,
    code: row.code,
    grade: row.grade,
    totalChapters: row.total_chapters,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

export async function createSubject(params: {
  curriculumId: string;
  name: string;
  nameBn?: string;
  code?: string;
  grade?: string;
}): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      curriculum_id: params.curriculumId,
      name: params.name,
      name_bn: params.nameBn,
      code: params.code,
      grade: params.grade,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create subject: ${error.message}`);
  return data.id;
}

// ==================== Chapters ====================

export async function listChapters(subjectId: string): Promise<Chapter[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('chapter_number');

  if (error) throw new Error(`Failed to list chapters: ${error.message}`);

  return (data ?? []).map(mapChapterRow);
}

export async function getChapter(chapterId: string): Promise<Chapter> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .single();

  if (error) throw new Error(`Failed to get chapter: ${error.message}`);
  return mapChapterRow(data);
}

export async function getChaptersByStatus(
  status: string,
  subjectId?: string,
): Promise<Chapter[]> {
  const supabase = getServiceClient();
  let query = supabase
    .from('chapters')
    .select('*')
    .eq('generation_status', status)
    .order('chapter_number');

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get chapters by status: ${error.message}`);
  return (data ?? []).map(mapChapterRow);
}

function mapChapterRow(row: Record<string, unknown>): Chapter {
  return {
    id: row.id as string,
    subjectId: row.subject_id as string,
    chapterNumber: row.chapter_number as number,
    title: row.title as string,
    titleBn: row.title_bn as string | undefined,
    description: row.description as string | undefined,
    sourcePdfPath: row.source_pdf_path as string | undefined,
    generationStatus: row.generation_status as Chapter['generationStatus'],
    generationModel: row.generation_model as string | undefined,
    generationCostUsd: row.generation_cost_usd as number | undefined,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
