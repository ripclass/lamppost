import { NextRequest } from 'next/server';
import { runBatchGeneration } from '@/lib/curriculum/batch-generator';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import '@/lib/config/server'; // boot-time validation of ANTHROPIC_API_KEY

const log = createLogger('API:BatchGenerate');

/**
 * POST /api/curriculum/batch-generate
 *
 * Trigger batch Q&A bank generation for all pending chapters.
 * This is a long-running operation. Returns immediately with a job ID;
 * progress can be polled via the stats endpoint.
 *
 * Body: { subjectId?, targetEntriesPerChapter? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const subjectId = body.subjectId as string | undefined;
    const targetEntriesPerChapter = body.targetEntriesPerChapter as number | undefined;

    log.info(
      `Batch generation triggered` +
        (subjectId ? ` for subject ${subjectId}` : ' for all subjects'),
    );

    // Run generation in the background (non-blocking)
    // In production, this would be a queued job (Vercel Queues or cron)
    const resultPromise = runBatchGeneration({
      subjectId,
      targetEntriesPerChapter,
    });

    // Don't await — return immediately
    resultPromise
      .then((result) => {
        log.info(
          `Batch generation completed: ${result.completedChapters}/${result.totalChapters} chapters, ` +
            `${result.totalEntries} entries, $${result.totalCostUsd.toFixed(4)}`,
        );
      })
      .catch((error) => {
        log.error('Batch generation failed:', error);
      });

    return apiSuccess({
      status: 'started',
      message:
        'Batch generation started in background. Use /api/qa-bank/stats to monitor progress.',
      subjectId: subjectId ?? 'all',
    });
  } catch (error) {
    log.error('Batch generate error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to start batch generation',
      error instanceof Error ? error.message : undefined,
    );
  }
}
