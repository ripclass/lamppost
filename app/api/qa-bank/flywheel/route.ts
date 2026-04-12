import { NextRequest } from 'next/server';
import { collectFlywheelBatch, groupByChapter, createFlywheelJob } from '@/lib/qa-bank/flywheel';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:QAFlywheel');

/**
 * POST /api/qa-bank/flywheel
 *
 * Process unmatched questions through the flywheel:
 * 1. Collect pending unmatched questions
 * 2. Group by chapter
 * 3. Create flywheel jobs for Opus batch processing
 *
 * Body: { chapterId? } — optional filter by chapter
 *
 * NOTE: Opus batch submission will be implemented in Phase 2.
 * This endpoint collects and groups the unmatched questions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const chapterId = body.chapterId as string | undefined;

    const pending = await collectFlywheelBatch(chapterId);

    if (pending.length === 0) {
      return apiSuccess({
        message: 'No pending unmatched questions to process',
        jobs: [],
      });
    }

    const grouped = groupByChapter(pending);
    const jobs = Array.from(grouped.entries()).map(([chapId, questions]) =>
      createFlywheelJob(
        chapId,
        questions.map((q) => q.id),
      ),
    );

    log.info(
      `Flywheel: ${pending.length} questions → ${jobs.length} chapter jobs`,
    );

    return apiSuccess({
      totalPending: pending.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        chapterId: j.chapterId,
        questionCount: j.unmatchedIds.length,
        status: j.status,
      })),
    });
  } catch (error) {
    log.error('Flywheel error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to process flywheel batch',
      error instanceof Error ? error.message : undefined,
    );
  }
}
