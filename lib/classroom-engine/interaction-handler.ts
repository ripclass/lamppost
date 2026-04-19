import { matchQuestion } from './qa-matcher';
import { routeToFallback } from './fallback-router';
import { wrapResponse } from './response-wrapper';
import { logClassroomInteraction } from './interaction-logger';
import { incrementMatchCount, insertUnmatchedQuestion } from '@/lib/db/queries/qa-bank';
import { incrementDailyUsage, type UsageKey } from '@/lib/db/queries/user-usage';
import { embedText } from '@/lib/qa-bank/embedder';
import { createLogger } from '@/lib/logger';
import { serverConfig } from '@/lib/config/server';
import { RateLimitError, type StudentInput, type ClassroomResponse } from './types';

const log = createLogger('InteractionHandler');

/**
 * The main entry point for all student interactions during a classroom session.
 *
 * Flow:
 * 1. Embed the student's question
 * 2. Search Q&A bank via vector similarity
 * 3. If match found (similarity >= 0.85): serve pre-built answer ($0 cost)
 * 4. If no match: route to fallback LLM (Sonnet/Gemma)
 * 5. Log the interaction (always, regardless of resolution path)
 * 6. If unmatched: save to flywheel queue for future Opus processing
 */
export async function handleStudentInteraction(
  input: StudentInput,
): Promise<ClassroomResponse> {
  const startTime = Date.now();
  const { identity } = input;

  // Step 0: Rate limit check. Anon uses the opaque nanoid session_token
  // against user_usage_daily.anonymous_session_token (TEXT); authed uses
  // studentId against user_usage_daily.user_id (UUID). See types.ts Identity.
  const scope: 'anon' | 'free' = identity.type === 'authed' ? 'free' : 'anon';
  const limit =
    identity.type === 'authed'
      ? serverConfig.RATE_LIMIT_FREE_DAILY
      : serverConfig.RATE_LIMIT_ANON_SAMPLE;
  const usageKey: UsageKey =
    identity.type === 'authed'
      ? { userId: identity.studentId }
      : { anonymousSessionToken: identity.sessionToken };
  const count = await incrementDailyUsage(usageKey);
  if (count > limit) {
    log.info(`Rate limit hit: scope=${scope}, count=${count}, limit=${limit}`);
    throw new RateLimitError(scope, limit);
  }

  // Step 1: Route through Q&A bank
  const decision = await matchQuestion({
    question: input.text,
    chapterId: input.chapterId,
    sceneIndex: input.sceneIndex,
  });

  // Step 2: Resolve based on router decision
  if (!decision.shouldEscalate && decision.qaEntry) {
    // MATCH FOUND — serve from bank (zero LLM cost)
    const entry = decision.qaEntry;
    const latencyMs = Date.now() - startTime;

    const responseText = wrapResponse(entry.answer, input.language, 'qa_bank');

    const response: ClassroomResponse = {
      text: responseText,
      textBn: entry.answerBn,
      source: 'qa_bank',
      agent: 'teacher',
      hasWhiteboard: entry.hasWhiteboard,
      whiteboardInstructions: entry.whiteboardInstructions,
      confidence: decision.similarity,
      costUsd: 0,
      latencyMs,
    };

    // Log + increment (fire-and-forget, don't block the response)
    logClassroomInteraction({
      studentId: identity.type === 'authed' ? identity.studentId : undefined,
      anonymousSessionId: identity.type === 'anon' ? identity.sessionId : undefined,
      chapterId: input.chapterId,
      sessionId: identity.sessionId,
      interactionType: 'question',
      studentInput: input.text,
      resolutionType: 'qa_bank_match',
      qaBankId: entry.id,
      similarityScore: decision.similarity,
      response: responseText,
      responseModel: 'qa_bank',
      costUsd: 0,
      latencyMs,
    }).catch(() => {});

    incrementMatchCount(entry.id).catch(() => {});

    log.info(`Served from bank in ${latencyMs}ms (similarity=${decision.similarity.toFixed(3)})`);

    return response;
  }

  // Step 3: No match — route to fallback LLM
  const relatedQAs = decision.qaEntry
    ? [
        {
          question: decision.qaEntry.question,
          answer: decision.qaEntry.answer,
          topicTags: decision.qaEntry.topicTags,
        },
      ]
    : [];

  const fallbackResponse = await routeToFallback({
    question: input.text,
    chapterId: input.chapterId,
    sceneIndex: input.sceneIndex,
    language: input.language,
    relatedQAs,
  });

  const latencyMs = Date.now() - startTime;

  const response: ClassroomResponse = {
    text: fallbackResponse.text,
    source: 'fallback_llm',
    agent: 'teacher',
    hasWhiteboard: false,
    confidence: decision.similarity,
    costUsd: fallbackResponse.costUsd,
    latencyMs,
  };

  // Log interaction
  logClassroomInteraction({
    studentId: identity.type === 'authed' ? identity.studentId : undefined,
    anonymousSessionId: identity.type === 'anon' ? identity.sessionId : undefined,
    chapterId: input.chapterId,
    sessionId: identity.sessionId,
    interactionType: 'question',
    studentInput: input.text,
    resolutionType: 'fallback_llm',
    similarityScore: decision.similarity,
    response: fallbackResponse.text,
    responseModel: fallbackResponse.model,
    tokensInput: fallbackResponse.tokensInput,
    tokensOutput: fallbackResponse.tokensOutput,
    costUsd: fallbackResponse.costUsd,
    latencyMs,
  }).catch(() => {});

  // Save to flywheel queue (fire-and-forget)
  embedText(input.text)
    .then((embedding) =>
      insertUnmatchedQuestion({
        chapterId: input.chapterId,
        studentId: identity.type === 'authed' ? identity.studentId : undefined,
        question: input.text,
        questionEmbedding: embedding,
        fallbackAnswer: fallbackResponse.text,
        fallbackModel: fallbackResponse.model,
        sceneIndex: input.sceneIndex,
        status: 'pending',
      }),
    )
    .catch((err) => log.error('Failed to save unmatched question:', err));

  log.info(
    `Fallback response in ${latencyMs}ms via ${fallbackResponse.model} ` +
      `(cost=$${fallbackResponse.costUsd.toFixed(6)})`,
  );

  return response;
}
