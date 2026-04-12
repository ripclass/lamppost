import { NextRequest } from 'next/server';
import { collectFlywheelBatch, groupByChapter } from '@/lib/qa-bank/flywheel';
import { expandQABank } from '@/lib/qa-bank/generator';
import { getServiceClient } from '@/lib/db/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('Cron:Flywheel');

/**
 * GET /api/cron/flywheel
 *
 * Cron-triggered flywheel processing.
 * Configured via vercel.json or FLYWHEEL_CRON env var.
 * Default schedule: daily at 3 AM (0 3 * * *).
 *
 * Pipeline:
 * 1. Collect all pending unmatched questions
 * 2. Group by chapter
 * 3. For each chapter: send to Opus → generate new Q&A entries → embed → insert
 * 4. Mark processed questions as added_to_bank
 *
 * Protected by CRON_SECRET to prevent unauthorized invocation.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiError('INVALID_REQUEST', 401, 'Unauthorized');
  }

  try {
    log.info('Flywheel cron job started');

    // Step 1: Collect pending unmatched questions
    const pending = await collectFlywheelBatch();

    if (pending.length === 0) {
      log.info('No pending unmatched questions. Flywheel is up to date.');
      return apiSuccess({
        status: 'idle',
        message: 'No pending unmatched questions',
        processed: 0,
        newEntries: 0,
        costUsd: 0,
      });
    }

    log.info(`Flywheel processing ${pending.length} unmatched questions`);

    // Step 2: Group by chapter
    const grouped = groupByChapter(pending);
    let totalNewEntries = 0;
    let totalCost = 0;
    let chaptersProcessed = 0;
    let chaptersFailed = 0;

    const supabase = getServiceClient();

    // Step 3: Process each chapter
    for (const [chapterId, questions] of grouped) {
      try {
        // Get chapter context
        const { data: chapter } = await supabase
          .from('chapters')
          .select('title, metadata')
          .eq('id', chapterId)
          .single();

        const context =
          (chapter?.metadata as Record<string, unknown>)?.content as string ?? '';

        const result = await expandQABank({
          chapterId,
          unmatchedQuestions: questions.map((q) => q.question),
          existingContext: context.slice(0, 5000),
        });

        if (result.success) {
          totalNewEntries += result.totalEntries;
          totalCost += result.costUsd;
          chaptersProcessed++;

          // Mark questions as processed
          await supabase
            .from('unmatched_questions')
            .update({
              status: 'added_to_bank',
              opus_batch_id: result.batchId,
            })
            .in(
              'id',
              questions.map((q) => q.id),
            );

          log.info(
            `Chapter ${chapterId}: ${result.totalEntries} new entries, $${result.costUsd.toFixed(4)}`,
          );
        } else {
          chaptersFailed++;
          log.error(`Chapter ${chapterId} failed: ${result.error}`);
        }
      } catch (error) {
        chaptersFailed++;
        log.error(`Error processing chapter ${chapterId}:`, error);
      }
    }

    log.info(
      `Flywheel complete: ${chaptersProcessed} chapters, ${totalNewEntries} new entries, ` +
        `${chaptersFailed} failed, $${totalCost.toFixed(4)}`,
    );

    return apiSuccess({
      status: 'completed',
      questionsProcessed: pending.length,
      chaptersProcessed,
      chaptersFailed,
      newEntries: totalNewEntries,
      costUsd: totalCost,
    });
  } catch (error) {
    log.error('Flywheel cron job failed:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Flywheel processing failed',
      error instanceof Error ? error.message : undefined,
    );
  }
}
