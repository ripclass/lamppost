import { routeQuestion } from '@/lib/qa-bank/router';
import { createLogger } from '@/lib/logger';
import type { RouterDecision } from '@/lib/qa-bank/types';

const log = createLogger('QAMatcher');

/**
 * Match a student's question against the Q&A bank.
 * Wraps the Q&A router with classroom-specific context.
 */
export async function matchQuestion(params: {
  question: string;
  chapterId: string;
  sceneIndex?: number;
}): Promise<RouterDecision> {
  const { question, chapterId, sceneIndex } = params;

  log.info(`Matching question for chapter ${chapterId}: "${question.slice(0, 60)}..."`);

  return routeQuestion({
    question,
    chapterId,
    sceneIndex,
    topK: 5,
  });
}
