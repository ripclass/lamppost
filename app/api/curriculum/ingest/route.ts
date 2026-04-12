import { NextRequest } from 'next/server';
import { ingestTextbook } from '@/lib/curriculum/ingest';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:CurriculumIngest');

/**
 * POST /api/curriculum/ingest
 *
 * Upload and parse a textbook PDF into structured chapters.
 *
 * Body: multipart/form-data with:
 *   - file: PDF file
 *   - subjectId: UUID of the subject
 *   - board: 'NCTB' | 'Cambridge CAIE' | 'Pearson Edexcel'
 *   - language: 'en' | 'bn'
 *   - parser?: 'mineru' | 'unpdf'
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subjectId = formData.get('subjectId') as string | null;
    const board = formData.get('board') as string | null;
    const language = (formData.get('language') as string) ?? 'en';
    const parser = formData.get('parser') as 'mineru' | 'unpdf' | null;

    if (!file) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'PDF file is required');
    }
    if (!subjectId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'subjectId is required');
    }
    if (!board) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'board is required');
    }

    log.info(
      `Ingesting textbook: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB) ` +
        `for subject ${subjectId}, board=${board}`,
    );

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    const result = await ingestTextbook({
      pdfBuffer,
      subjectId,
      board,
      language: language === 'bn' ? 'bn' : 'en',
      parser: parser ?? undefined,
    });

    if (!result.success) {
      return apiError('PARSE_FAILED', 422, result.error ?? 'Ingestion failed');
    }

    return apiSuccess({
      subjectId: result.subjectId,
      chaptersCreated: result.chaptersCreated,
      chapters: result.chapters,
    });
  } catch (error) {
    log.error('Curriculum ingest error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to ingest textbook',
      error instanceof Error ? error.message : undefined,
    );
  }
}
