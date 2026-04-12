import { getPendingUnmatched } from '@/lib/db/queries/qa-bank';
import { createLogger } from '@/lib/logger';
import type { UnmatchedQuestion, FlywheelJob } from './types';

const log = createLogger('QAFlywheel');

const FLYWHEEL_BATCH_SIZE = Number(process.env.FLYWHEEL_BATCH_SIZE ?? '50');

/**
 * The Flywheel — the self-improving loop that makes the Q&A bank grow smarter.
 *
 * Pipeline:
 * 1. Collect unmatched questions from the database
 * 2. Group by chapter
 * 3. Send to Opus for new Q&A entry generation (via Batch API for 50% discount)
 * 4. Embed new entries and insert into the Q&A bank
 * 5. Mark original unmatched questions as processed
 *
 * After 6 months of operation, match rate approaches 99%.
 */
export async function collectFlywheelBatch(chapterId?: string): Promise<UnmatchedQuestion[]> {
  const pending = await getPendingUnmatched({
    chapterId,
    limit: FLYWHEEL_BATCH_SIZE,
  });

  log.info(
    `Flywheel batch: ${pending.length} pending unmatched questions` +
      (chapterId ? ` for chapter ${chapterId}` : ''),
  );

  return pending;
}

/**
 * Group unmatched questions by chapter for efficient batch processing.
 */
export function groupByChapter(
  questions: UnmatchedQuestion[],
): Map<string, UnmatchedQuestion[]> {
  const grouped = new Map<string, UnmatchedQuestion[]>();

  for (const q of questions) {
    const existing = grouped.get(q.chapterId) ?? [];
    existing.push(q);
    grouped.set(q.chapterId, existing);
  }

  return grouped;
}

/**
 * Create a flywheel job record for tracking batch processing.
 * (Opus generation pipeline will be implemented in Phase 2.)
 */
export function createFlywheelJob(
  chapterId: string,
  unmatchedIds: string[],
): FlywheelJob {
  return {
    id: crypto.randomUUID(),
    chapterId,
    unmatchedIds,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}
