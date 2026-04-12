import { NextRequest } from 'next/server';
import { translateToBangla } from '@/lib/translate/gemini-translator';
import { getServiceClient } from '@/lib/db/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:TranslateLesson');

/**
 * POST /api/translate/lesson
 *
 * Translate a lesson's narration scripts and scene text from English to Bangla.
 *
 * Body: { chapterId, subject? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const chapterId = body.chapterId as string | undefined;
    const subject = body.subject as string | undefined;

    if (!chapterId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'chapterId is required');
    }

    if (!process.env.GOOGLE_API_KEY) {
      return apiError('MISSING_API_KEY', 500, 'GOOGLE_API_KEY is required for translation');
    }

    const supabase = getServiceClient();

    // Fetch the lesson
    const { data: lesson, error: fetchError } = await supabase
      .from('lessons')
      .select('id, narration_scripts, scenes')
      .eq('chapter_id', chapterId)
      .single();

    if (fetchError || !lesson) {
      return apiError('INVALID_REQUEST', 404, 'Lesson not found for this chapter');
    }

    // Translate narration scripts
    const narrationScripts = lesson.narration_scripts as Record<string, string> | null;
    let translatedNarration: Record<string, string> | null = null;
    let totalCost = 0;

    if (narrationScripts) {
      translatedNarration = {};
      for (const [key, text] of Object.entries(narrationScripts)) {
        if (typeof text === 'string' && text.length > 0) {
          const result = await translateToBangla(text, {
            subject,
            preserveFormatting: true,
            preserveLatex: true,
          });
          translatedNarration[key] = result.translated;
          totalCost += result.costUsd;
        }
      }
    }

    // Update lesson with Bangla translations
    const { error: updateError } = await supabase
      .from('lessons')
      .update({
        narration_scripts_bn: translatedNarration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id);

    if (updateError) {
      throw new Error(`Failed to save translations: ${updateError.message}`);
    }

    log.info(
      `Translated lesson for chapter ${chapterId}: ` +
        `${Object.keys(translatedNarration ?? {}).length} narrations, $${totalCost.toFixed(6)}`,
    );

    return apiSuccess({
      chapterId,
      narrationCount: Object.keys(translatedNarration ?? {}).length,
      costUsd: totalCost,
    });
  } catch (error) {
    log.error('Lesson translation error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to translate lesson',
      error instanceof Error ? error.message : undefined,
    );
  }
}
