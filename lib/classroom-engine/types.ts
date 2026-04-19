/**
 * Classroom Engine Types — Smart interaction handling.
 *
 * The classroom engine receives student input, routes it through the Q&A bank,
 * and either serves a pre-built answer or escalates to a fallback LLM.
 */

/**
 * Identity of the caller.
 *
 * `sessionId` is always a UUID — it matches `student_interactions.session_id`
 * (UUID column) for logging. For anon, it's `onboarding_sessions.id`; for
 * authed, it's the auth session's UUID.
 *
 * `sessionToken` (anon only) is the opaque nanoid stored in the `lp_onb`
 * cookie — it matches `user_usage_daily.anonymous_session_token` (TEXT column)
 * for rate limiting. Never use this for logging.
 */
export type Identity =
  | { type: 'anon'; sessionToken: string; sessionId: string }
  | { type: 'authed'; studentId: string; sessionId: string };

export interface StudentInput {
  text: string;
  chapterId: string;
  identity: Identity;
  sceneIndex: number;
  language: 'en' | 'bn';
}

export type AgentRole = 'teacher' | 'ta' | 'classmate';

export interface ClassroomResponse {
  text: string;
  textBn?: string;
  source: 'qa_bank' | 'fallback_llm';
  agent: AgentRole;
  hasWhiteboard: boolean;
  whiteboardInstructions?: Record<string, unknown>;
  confidence: number;
  costUsd: number;
  latencyMs: number;
}

export interface FallbackRequest {
  question: string;
  chapterId: string;
  sceneIndex: number;
  language: 'en' | 'bn';
  relatedQAs: Array<{
    question: string;
    answer: string;
    topicTags: string[];
  }>;
}

export interface FallbackResponse {
  text: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

/**
 * Thrown by handleStudentInteraction when the caller has exceeded their
 * rate limit. Callers (API routes) catch this and return HTTP 429 with
 * a typed payload the client renders as "limit reached."
 *
 * - `scope: 'anon'`  → anonymous onboarding session, cap = RATE_LIMIT_ANON_SAMPLE
 * - `scope: 'free'`  → authenticated free-tier user, cap = RATE_LIMIT_FREE_DAILY
 */
export class RateLimitError extends Error {
  readonly scope: 'anon' | 'free';
  readonly limit: number;

  constructor(scope: 'anon' | 'free', limit: number) {
    super(`Rate limit exceeded: ${scope} tier, cap=${limit}`);
    this.name = 'RateLimitError';
    this.scope = scope;
    this.limit = limit;
  }
}
