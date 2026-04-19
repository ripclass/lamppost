import { NextRequest, NextResponse } from 'next/server';
import { handleStudentInteraction } from '@/lib/classroom-engine/interaction-handler';
import { logClassroomInteraction } from '@/lib/classroom-engine/interaction-logger';
import { RateLimitError, type Identity } from '@/lib/classroom-engine/types';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:QASearch');

/**
 * POST /api/qa-bank/search
 *
 * Search the Q&A bank for an answer to a student's question.
 * This is the primary classroom interaction endpoint.
 *
 * Body: { question, chapterId, identity, sceneIndex?, language? }
 *   identity: { type: 'anon', sessionToken, sessionId }
 *           | { type: 'authed', studentId, sessionId }
 *
 * Returns: ClassroomResponse on 200, or HTTP 429 with
 *   { code: 'RATE_LIMIT_EXCEEDED', scope, limit, resetAt } when rate-limited.
 */
export async function POST(request: NextRequest) {
  let parsedIdentity: Identity | null = null;
  let parsedChapterId: string | null = null;
  let parsedQuestion: string | null = null;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { question, chapterId, identity, sceneIndex, language } = body;

    if (!question || typeof question !== 'string') {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'question is required');
    }
    if (!chapterId || typeof chapterId !== 'string') {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'chapterId is required');
    }
    const identityParsed = parseIdentity(identity);
    if (!identityParsed) {
      return apiError('INVALID_REQUEST', 400, 'identity is required and must be a valid Identity');
    }

    parsedIdentity = identityParsed;
    parsedChapterId = chapterId;
    parsedQuestion = question;

    const response = await handleStudentInteraction({
      text: question,
      chapterId,
      identity: identityParsed,
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
    if (error instanceof RateLimitError && parsedIdentity && parsedChapterId && parsedQuestion) {
      return rateLimitResponse(error, parsedIdentity, parsedChapterId, parsedQuestion);
    }
    log.error('Q&A search error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to search Q&A bank',
      error instanceof Error ? error.message : undefined,
    );
  }
}

function parseIdentity(raw: unknown): Identity | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.type === 'anon' && typeof r.sessionToken === 'string' && typeof r.sessionId === 'string') {
    return { type: 'anon', sessionToken: r.sessionToken, sessionId: r.sessionId };
  }
  if (r.type === 'authed' && typeof r.studentId === 'string' && typeof r.sessionId === 'string') {
    return { type: 'authed', studentId: r.studentId, sessionId: r.sessionId };
  }
  return null;
}

/**
 * Build the 429 response, log the blocked attempt into student_interactions
 * for funnel analytics, and set Retry-After to the integer seconds until
 * the next Asia/Dhaka midnight (matches migration 010's date default).
 */
function rateLimitResponse(
  error: RateLimitError,
  identity: Identity,
  chapterId: string,
  question: string,
): NextResponse {
  const { secondsUntilReset, resetAtIso } = nextDhakaMidnight();

  logClassroomInteraction({
    studentId: identity.type === 'authed' ? identity.studentId : undefined,
    anonymousSessionId: identity.type === 'anon' ? identity.sessionId : undefined,
    chapterId,
    sessionId: identity.sessionId,
    interactionType: 'question',
    studentInput: question,
    resolutionType: 'rate_limit_block',
    response: '',
    responseModel: 'rate_limiter',
    costUsd: 0,
    latencyMs: 0,
  }).catch(() => {});

  return NextResponse.json(
    {
      success: false as const,
      code: 'RATE_LIMIT_EXCEEDED',
      scope: error.scope,
      limit: error.limit,
      resetAt: resetAtIso,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(secondsUntilReset) },
    },
  );
}

function nextDhakaMidnight(): { secondsUntilReset: number; resetAtIso: string } {
  const now = new Date();
  // Asia/Dhaka is a fixed UTC+06:00 offset (no DST).
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const nowDhaka = new Date(now.getTime() + dhakaOffsetMs);
  const nextMidnightDhaka = new Date(
    Date.UTC(
      nowDhaka.getUTCFullYear(),
      nowDhaka.getUTCMonth(),
      nowDhaka.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  const resetAtUtc = new Date(nextMidnightDhaka.getTime() - dhakaOffsetMs);
  const secondsUntilReset = Math.max(1, Math.ceil((resetAtUtc.getTime() - now.getTime()) / 1000));
  return { secondsUntilReset, resetAtIso: resetAtUtc.toISOString() };
}
