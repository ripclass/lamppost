/**
 * Model Routing Configuration
 *
 * Defines which model handles which task. This is the single source of truth
 * for all model selection decisions in Lamppost.
 *
 * Philosophy: Opus generates once (expensive but one-time), everything else
 * uses the cheapest model that can do the job well.
 */

import { serverConfig } from '@/lib/config/server';

export interface ModelConfig {
  provider: string;
  model: string;
  description: string;
  /** Cost per 1M input tokens in USD */
  costPerMInput: number;
  /** Cost per 1M output tokens in USD */
  costPerMOutput: number;
}

/** Task → Model mapping. Environment variables override defaults. */
export const MODEL_ROUTING = {
  /** One-time lesson + Q&A bank generation (Batch API = 50% off) */
  lessonGeneration: {
    provider: 'anthropic',
    model: process.env.GENERATION_MODEL ?? 'claude-opus-4-6',
    description: 'Lesson outline + scene generation',
    costPerMInput: 2.5, // Batch API pricing
    costPerMOutput: 12.5,
  },

  /** One-time Q&A bank generation (Batch API = 50% off) */
  qaBankGeneration: {
    provider: 'anthropic',
    model: process.env.GENERATION_MODEL ?? 'claude-opus-4-6',
    description: 'Comprehensive Q&A bank per chapter (1,000-2,000 entries)',
    costPerMInput: 2.5,
    costPerMOutput: 12.5,
  },

  /** Real-time fallback for unmatched classroom questions */
  classroomFallback: {
    provider: 'anthropic',
    model: serverConfig.CLASSROOM_FALLBACK_MODEL,
    description: 'Fallback for the 2-5% of questions not in Q&A bank',
    costPerMInput: 3,
    costPerMOutput: 15,
  },

  /** Quick classification tasks */
  quizGrading: {
    provider: 'anthropic',
    model: process.env.QUIZ_GRADING_MODEL ?? 'claude-haiku-4-5',
    description: 'Simple quiz answer classification',
    costPerMInput: 0.25,
    costPerMOutput: 1.25,
  },

  /** English → Bangla translation */
  translation: {
    provider: 'google',
    model: process.env.TRANSLATION_MODEL ?? 'gemini-3-flash-preview',
    description: 'Bangla translation layer',
    costPerMInput: 0.1,
    costPerMOutput: 0.4,
  },

  /** Local embedding model (zero cost) */
  embedding: {
    provider: 'ollama',
    model: process.env.EMBEDDING_MODEL ?? 'nomic-embed-text',
    description: 'Local 768-dim embeddings for Q&A bank search',
    costPerMInput: 0,
    costPerMOutput: 0,
  },

  /** Offline classroom model for school deployments (zero cost) */
  offlineClassroom: {
    provider: 'ollama',
    model: process.env.OFFLINE_CLASSROOM_MODEL ?? 'gemma3:12b',
    description: 'Local model for offline school deployment',
    costPerMInput: 0,
    costPerMOutput: 0,
  },
} as const satisfies Record<string, ModelConfig>;

/** Embedding dimensions (nomic-embed-text v1.5) */
export const EMBEDDING_DIMENSIONS = 768;
