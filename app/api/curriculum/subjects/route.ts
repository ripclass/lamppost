import { NextRequest } from 'next/server';
import { listSubjects, createSubject } from '@/lib/db/queries/chapters';
import { listCurricula, createCurriculum } from '@/lib/db/queries/chapters';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:Subjects');

/**
 * GET /api/curriculum/subjects?curriculumId=xxx
 *
 * List subjects for a curriculum, or list all curricula if no ID given.
 */
export async function GET(request: NextRequest) {
  try {
    const curriculumId = request.nextUrl.searchParams.get('curriculumId');

    if (curriculumId) {
      const subjects = await listSubjects(curriculumId);
      return apiSuccess({ subjects });
    }

    const curricula = await listCurricula();
    return apiSuccess({ curricula });
  } catch (error) {
    log.error('List subjects error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to list subjects',
      error instanceof Error ? error.message : undefined,
    );
  }
}

/**
 * POST /api/curriculum/subjects
 *
 * Create a new curriculum or subject.
 *
 * Body: { type: 'curriculum', name, board?, language?, country? }
 *    or { type: 'subject', curriculumId, name, nameBn?, code?, grade? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type as string;

    if (type === 'curriculum') {
      const id = await createCurriculum({
        name: body.name as string,
        board: body.board as string | undefined,
        language: body.language as string | undefined,
        country: body.country as string | undefined,
      });
      return apiSuccess({ id, type: 'curriculum' }, 201);
    }

    if (type === 'subject') {
      if (!body.curriculumId || !body.name) {
        return apiError(
          'MISSING_REQUIRED_FIELD',
          400,
          'curriculumId and name are required',
        );
      }
      const id = await createSubject({
        curriculumId: body.curriculumId as string,
        name: body.name as string,
        nameBn: body.nameBn as string | undefined,
        code: body.code as string | undefined,
        grade: body.grade as string | undefined,
      });
      return apiSuccess({ id, type: 'subject' }, 201);
    }

    return apiError(
      'INVALID_REQUEST',
      400,
      'type must be "curriculum" or "subject"',
    );
  } catch (error) {
    log.error('Create subject/curriculum error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to create record',
      error instanceof Error ? error.message : undefined,
    );
  }
}
