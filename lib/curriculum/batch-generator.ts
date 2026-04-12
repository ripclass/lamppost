/**
 * Batch Generation Orchestrator
 *
 * Orchestrates full curriculum generation: iterates through all pending chapters,
 * generates lessons + Q&A banks, tracks progress and cost.
 *
 * Designed for batch operations — not real-time. Uses sequential processing
 * to stay within API rate limits and provide predictable cost tracking.
 */

import { createLogger } from '@/lib/logger';
import { getChaptersByStatus, getChapter } from '@/lib/db/queries/chapters';
import { generateQABank } from '@/lib/qa-bank/generator';
import type { GenerationResult } from '@/lib/qa-bank/generator';

const log = createLogger('BatchGenerator');

// ==================== Types ====================

export interface BatchConfig {
  subjectId?: string;
  concurrency?: number;
  skipCompleted?: boolean;
  targetEntriesPerChapter?: number;
}

export interface BatchProgress {
  totalChapters: number;
  completedChapters: number;
  failedChapters: number;
  currentChapter?: string;
  totalEntries: number;
  totalCostUsd: number;
  results: GenerationResult[];
}

type BatchProgressCallback = (progress: BatchProgress) => void;

// ==================== Main Orchestrator ====================

/**
 * Generate Q&A banks for all pending chapters in a subject (or all subjects).
 * Processes chapters sequentially to respect API rate limits.
 */
export async function runBatchGeneration(
  config: BatchConfig,
  onProgress?: BatchProgressCallback,
): Promise<BatchProgress> {
  const { subjectId, skipCompleted = true, targetEntriesPerChapter } = config;

  // Get chapters that need generation
  const chapters = await getChaptersByStatus('pending', subjectId);

  if (chapters.length === 0) {
    log.info('No pending chapters found for batch generation');
    return {
      totalChapters: 0,
      completedChapters: 0,
      failedChapters: 0,
      totalEntries: 0,
      totalCostUsd: 0,
      results: [],
    };
  }

  log.info(`Starting batch generation for ${chapters.length} chapters`);

  const progress: BatchProgress = {
    totalChapters: chapters.length,
    completedChapters: 0,
    failedChapters: 0,
    totalEntries: 0,
    totalCostUsd: 0,
    results: [],
  };

  for (const chapter of chapters) {
    progress.currentChapter = chapter.title;
    onProgress?.(progress);

    log.info(
      `[${progress.completedChapters + progress.failedChapters + 1}/${chapters.length}] ` +
        `Generating Q&A bank for: ${chapter.title}`,
    );

    try {
      // Get chapter content from metadata
      const fullChapter = await getChapter(chapter.id);
      const content = (fullChapter.metadata?.content as string) ?? '';

      if (!content) {
        log.warn(`Chapter ${chapter.id} has no content, skipping`);
        progress.failedChapters++;
        progress.results.push({
          success: false,
          chapterId: chapter.id,
          totalEntries: 0,
          batchId: '',
          tokensInput: 0,
          tokensOutput: 0,
          costUsd: 0,
          error: 'No chapter content available',
        });
        continue;
      }

      // Resolve subject and curriculum info for the prompt
      const { subjectName, grade, curriculum } =
        await resolveChapterContext(chapter.subjectId);

      const result = await generateQABank({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterContent: content,
        subjectName,
        grade,
        curriculum,
        targetEntries: targetEntriesPerChapter,
      });

      progress.results.push(result);

      if (result.success) {
        progress.completedChapters++;
        progress.totalEntries += result.totalEntries;
        progress.totalCostUsd += result.costUsd;
        log.info(
          `Completed: ${chapter.title} — ${result.totalEntries} entries, $${result.costUsd.toFixed(4)}`,
        );
      } else {
        progress.failedChapters++;
        log.error(`Failed: ${chapter.title} — ${result.error}`);
      }
    } catch (error) {
      progress.failedChapters++;
      const message = error instanceof Error ? error.message : String(error);
      progress.results.push({
        success: false,
        chapterId: chapter.id,
        totalEntries: 0,
        batchId: '',
        tokensInput: 0,
        tokensOutput: 0,
        costUsd: 0,
        error: message,
      });
      log.error(`Error generating chapter ${chapter.title}:`, message);
    }

    onProgress?.(progress);
  }

  progress.currentChapter = undefined;
  onProgress?.(progress);

  log.info(
    `Batch generation complete: ${progress.completedChapters}/${progress.totalChapters} chapters, ` +
      `${progress.totalEntries} total entries, $${progress.totalCostUsd.toFixed(4)} total cost`,
  );

  return progress;
}

/**
 * Resolve subject name, grade, and curriculum name from a subject ID.
 */
async function resolveChapterContext(subjectId: string): Promise<{
  subjectName: string;
  grade: string;
  curriculum: string;
}> {
  try {
    const { getServiceClient } = await import('@/lib/db/supabase');
    const supabase = getServiceClient();

    const { data: subject } = await supabase
      .from('subjects')
      .select('name, grade, curriculum_id')
      .eq('id', subjectId)
      .single();

    if (!subject) {
      return { subjectName: 'Unknown', grade: 'Unknown', curriculum: 'Unknown' };
    }

    const { data: curriculum } = await supabase
      .from('curricula')
      .select('name, board')
      .eq('id', subject.curriculum_id)
      .single();

    return {
      subjectName: subject.name ?? 'Unknown',
      grade: subject.grade ?? 'Unknown',
      curriculum: curriculum
        ? `${curriculum.name} (${curriculum.board ?? ''})`
        : 'Unknown',
    };
  } catch {
    return { subjectName: 'Unknown', grade: 'Unknown', curriculum: 'Unknown' };
  }
}
