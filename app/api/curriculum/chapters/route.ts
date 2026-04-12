import { NextRequest } from 'next/server';
import { listChapters, getChapter } from '@/lib/db/queries/chapters';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:Chapters');

/**
 * GET /api/curriculum/chapters?subjectId=xxx
 * GET /api/curriculum/chapters?chapterId=xxx
 *
 * List chapters for a subject, or get a single chapter by ID.
 */
export async function GET(request: NextRequest) {
  try {
    const subjectId = request.nextUrl.searchParams.get('subjectId');
    const chapterId = request.nextUrl.searchParams.get('chapterId');

    if (chapterId) {
      const chapter = await getChapter(chapterId);
      return apiSuccess({ chapter });
    }

    if (subjectId) {
      const chapters = await listChapters(subjectId);
      return apiSuccess({ chapters });
    }

    return apiError(
      'MISSING_REQUIRED_FIELD',
      400,
      'subjectId or chapterId query param is required',
    );
  } catch (error) {
    log.error('List chapters error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to list chapters',
      error instanceof Error ? error.message : undefined,
    );
  }
}
