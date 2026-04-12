/**
 * Classroom Engine Types — Smart interaction handling.
 *
 * The classroom engine receives student input, routes it through the Q&A bank,
 * and either serves a pre-built answer or escalates to a fallback LLM.
 */

export interface StudentInput {
  text: string;
  chapterId: string;
  studentId?: string;
  sessionId: string;
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
