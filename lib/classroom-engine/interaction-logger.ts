import { logInteraction as dbLogInteraction } from '@/lib/db/queries/interactions';
import { createLogger } from '@/lib/logger';

const log = createLogger('InteractionLogger');

/**
 * Log every student interaction — the flywheel depends on complete data.
 *
 * This logs to the student_interactions table for:
 * 1. Analytics (hit rate, latency, cost tracking)
 * 2. Flywheel processing (unmatched questions → Opus → new Q&A entries)
 * 3. Student learning profile building
 */
export async function logClassroomInteraction(params: {
  studentId?: string;
  anonymousSessionId?: string;
  chapterId: string;
  sessionId: string;
  interactionType: 'question' | 'quiz_answer' | 'whiteboard_request' | 'voice_input';
  studentInput: string;
  studentInputEmbedding?: number[];
  resolutionType:
    | 'qa_bank_match'
    | 'fallback_llm'
    | 'pre_baked_playback'
    | 'rate_limit_block';
  qaBankId?: string;
  similarityScore?: number;
  response: string;
  responseModel: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  latencyMs: number;
}): Promise<void> {
  try {
    await dbLogInteraction({
      studentId: params.studentId,
      anonymousSessionId: params.anonymousSessionId,
      chapterId: params.chapterId,
      sessionId: params.sessionId,
      interactionType: params.interactionType,
      studentInput: params.studentInput,
      studentInputEmbedding: params.studentInputEmbedding,
      resolutionType: params.resolutionType,
      qaBankId: params.qaBankId,
      similarityScore: params.similarityScore,
      response: params.response,
      responseModel: params.responseModel,
      tokensInput: params.tokensInput,
      tokensOutput: params.tokensOutput,
      costUsd: params.costUsd,
      latencyMs: params.latencyMs,
    });

    log.info(
      `Logged interaction: ${params.resolutionType} | ` +
        `cost=$${(params.costUsd ?? 0).toFixed(6)} | ${params.latencyMs}ms`,
    );
  } catch (error) {
    // Never let logging failure break the classroom experience
    log.error('Failed to log interaction (non-fatal):', error);
  }
}
