import { NextRequest } from 'next/server';
import { translateQAEntries } from '@/lib/translate/gemini-translator';
import { getServiceClient } from '@/lib/db/supabase';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:TranslateQABank');

/**
 * POST /api/translate/qa-bank
 *
 * Translate Q&A bank entries from English to Bangla.
 * Only translates entries that don't already have Bangla translations.
 *
 * Body: { chapterId, subject?, batchSize? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const chapterId = body.chapterId as string | undefined;
    const subject = body.subject as string | undefined;
    const batchSize = (body.batchSize as number) ?? 50;

    if (!chapterId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'chapterId is required');
    }

    if (!process.env.GOOGLE_API_KEY) {
      return apiError('MISSING_API_KEY', 500, 'GOOGLE_API_KEY is required for translation');
    }

    const supabase = getServiceClient();

    // Fetch untranslated entries
    const { data: entries, error: fetchError } = await supabase
      .from('qa_bank')
      .select('id, question, answer')
      .eq('chapter_id', chapterId)
      .is('question_bn', null)
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch Q&A entries: ${fetchError.message}`);
    }

    if (!entries || entries.length === 0) {
      return apiSuccess({
        chapterId,
        translated: 0,
        remaining: 0,
        message: 'All entries already translated',
      });
    }

    log.info(`Translating ${entries.length} Q&A entries for chapter ${chapterId}`);

    // Translate
    const translated = await translateQAEntries(entries, subject);

    // Update in database
    let updatedCount = 0;
    for (const entry of translated) {
      const { error: updateError } = await supabase
        .from('qa_bank')
        .update({
          question_bn: entry.questionBn,
          answer_bn: entry.answerBn,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (!updateError) updatedCount++;
    }

    // Check remaining
    const { count: remaining } = await supabase
      .from('qa_bank')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .is('question_bn', null);

    log.info(
      `Translated ${updatedCount}/${entries.length} entries, ${remaining ?? 0} remaining`,
    );

    return apiSuccess({
      chapterId,
      translated: updatedCount,
      remaining: remaining ?? 0,
    });
  } catch (error) {
    log.error('Q&A bank translation error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to translate Q&A bank entries',
      error instanceof Error ? error.message : undefined,
    );
  }
}
