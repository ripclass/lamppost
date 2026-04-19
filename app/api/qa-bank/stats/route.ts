import { NextRequest } from 'next/server';
import { getChapterQAStats } from '@/lib/db/queries/qa-bank';
import { getInteractionStats } from '@/lib/db/queries/interactions';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdminRole } from '@/lib/auth/admin-guard';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:QAStats');

/**
 * GET /api/qa-bank/stats?chapterId=xxx
 *
 * Get Q&A bank coverage analytics for a chapter:
 * - Total entries, breakdown by difficulty/type/source
 * - Interaction stats: hit rate, cost, latency
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdminRole('read_only');
  if (!guard.ok) return guard.response;

  try {
    const chapterId = request.nextUrl.searchParams.get('chapterId');

    if (!chapterId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'chapterId query param is required');
    }

    const [qaStats, interactionStats] = await Promise.all([
      getChapterQAStats(chapterId),
      getInteractionStats(chapterId),
    ]);

    return apiSuccess({
      chapterId,
      qaBank: qaStats,
      interactions: interactionStats,
    });
  } catch (error) {
    log.error('Q&A stats error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to get Q&A stats',
      error instanceof Error ? error.message : undefined,
    );
  }
}
