import { NextRequest } from 'next/server';
import { handleStudentInteraction } from '@/lib/classroom-engine/interaction-handler';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:QASearch');

/**
 * POST /api/qa-bank/search
 *
 * Search the Q&A bank for an answer to a student's question.
 * This is the primary classroom interaction endpoint.
 *
 * Body: { question, chapterId, sessionId, sceneIndex, language?, studentId? }
 * Returns: ClassroomResponse with the answer, source, confidence, and cost.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { question, chapterId, sessionId, sceneIndex, language, studentId } = body;

    if (!question || typeof question !== 'string') {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'question is required');
    }
    if (!chapterId || typeof chapterId !== 'string') {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'chapterId is required');
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'sessionId is required');
    }

    const response = await handleStudentInteraction({
      text: question,
      chapterId,
      sessionId,
      studentId: (studentId as string) ?? undefined,
      sceneIndex: typeof sceneIndex === 'number' ? sceneIndex : 0,
      language: language === 'bn' ? 'bn' : 'en',
    });

    return apiSuccess({
      answer: response.text,
      answerBn: response.textBn,
      source: response.source,
      agent: response.agent,
      confidence: response.confidence,
      hasWhiteboard: response.hasWhiteboard,
      whiteboardInstructions: response.whiteboardInstructions,
      costUsd: response.costUsd,
      latencyMs: response.latencyMs,
    });
  } catch (error) {
    log.error('Q&A search error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to search Q&A bank',
      error instanceof Error ? error.message : undefined,
    );
  }
}
