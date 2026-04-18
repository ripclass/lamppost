import { z } from 'zod';
import {
  getServerProviders,
  getServerTTSProviders,
  getServerASRProviders,
  getServerPDFProviders,
  getServerImageProviders,
  getServerVideoProviders,
  getServerWebSearchProviders,
} from '@/lib/server/provider-config';

/**
 * Server-only configuration.
 *
 * Validates `process.env` at boot. Required keys cause a fail-fast error
 * with a list of missing vars. Optional keys are left undefined so callers
 * can gracefully skip features (e.g. if Postmark isn't configured, the
 * parent-weekly cron can log and no-op rather than crash).
 *
 * IMPORTANT: never import this module from a Client Component. It intentionally
 * does NOT get the `use server` / `server-only` banner because it is imported
 * during Next.js build-time static analysis, but it MUST only be referenced
 * from server code (API routes, Server Actions, Server Components, middleware).
 */

const nonEmpty = z.string().min(1);

const schema = z.object({
  // --- Supabase ---
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,

  // --- LLM providers (server-side only — never exposed to client) ---
  ANTHROPIC_API_KEY: nonEmpty,
  GOOGLE_API_KEY: nonEmpty.optional(),
  OPENAI_API_KEY: nonEmpty.optional(),

  // --- Ollama (local embeddings + offline model) ---
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),

  // --- Auth / messaging (Twilio for phone OTP, Postmark for email) ---
  TWILIO_ACCOUNT_SID: nonEmpty.optional(),
  TWILIO_AUTH_TOKEN: nonEmpty.optional(),
  TWILIO_MESSAGING_SERVICE_SID: nonEmpty.optional(),
  POSTMARK_SERVER_TOKEN: nonEmpty.optional(),
  POSTMARK_FROM_EMAIL: z.string().email().optional(),

  // --- Provider keys (surfaced read-only in admin System section) ---
  // All optional — absent providers just aren't available for that feature.
  AZURE_TTS_API_KEY: nonEmpty.optional(),
  AZURE_TTS_REGION: nonEmpty.optional(),
  ELEVENLABS_API_KEY: nonEmpty.optional(),
  MINIMAX_API_KEY: nonEmpty.optional(),
  TAVILY_API_KEY: nonEmpty.optional(),
  MINERU_API_KEY: nonEmpty.optional(),

  // --- Cron ---
  CRON_SECRET: nonEmpty.optional(),

  // --- Q&A routing policy ---
  QA_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),

  // --- Rate limits ---
  RATE_LIMIT_ANON_SAMPLE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_FREE_DAILY: z.coerce.number().int().positive().default(15),

  // --- Model routing (server-enforced — users cannot override) ---
  MODEL_LESSON_GENERATION: nonEmpty.default('claude-opus-4-6'),
  MODEL_QA_GENERATION: nonEmpty.default('claude-opus-4-6'),
  MODEL_FALLBACK_PAID: nonEmpty.default('claude-sonnet-4-6'),
  MODEL_FALLBACK_FREE: nonEmpty.default('claude-haiku-4-5'),
  MODEL_QUIZ_GRADE: nonEmpty.default('claude-haiku-4-5'),
  MODEL_TRANSLATION: nonEmpty.default('gemini-3-flash'),
  MODEL_EMBEDDING: nonEmpty.default('nomic-embed-text'),
  MODEL_OFFLINE_CLASSROOM: nonEmpty.default('gemma3:12b'),
  CLASSROOM_FALLBACK_MODEL: nonEmpty.default('claude-sonnet-4-6'),
});

export type ServerConfig = z.infer<typeof schema>;

function load(): ServerConfig {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `[lib/config/server.ts] Invalid environment configuration:\n${issues}\n` +
        `Check .env.local against .env.example.`,
    );
  }
  return parsed.data;
}

export const serverConfig: ServerConfig = load();

/**
 * Provider availability flags — safe to surface in the admin Providers
 * sub-page as read-only booleans. Never leak the keys themselves.
 *
 * `categories` carries per-category counts resolved from provider-config.ts
 * (YAML + env vars). This replaces the old /api/server-providers endpoint
 * and the client-side fetchServerProviders() merge.
 */
export const providerStatus = {
  anthropic: Boolean(serverConfig.ANTHROPIC_API_KEY),
  google: Boolean(serverConfig.GOOGLE_API_KEY),
  openai: Boolean(serverConfig.OPENAI_API_KEY),
  azureTts: Boolean(serverConfig.AZURE_TTS_API_KEY && serverConfig.AZURE_TTS_REGION),
  elevenlabs: Boolean(serverConfig.ELEVENLABS_API_KEY),
  minimax: Boolean(serverConfig.MINIMAX_API_KEY),
  tavily: Boolean(serverConfig.TAVILY_API_KEY),
  mineru: Boolean(serverConfig.MINERU_API_KEY),
  twilio: Boolean(
    serverConfig.TWILIO_ACCOUNT_SID &&
      serverConfig.TWILIO_AUTH_TOKEN &&
      serverConfig.TWILIO_MESSAGING_SERVICE_SID,
  ),
  postmark: Boolean(serverConfig.POSTMARK_SERVER_TOKEN && serverConfig.POSTMARK_FROM_EMAIL),
  ollama: true,
  categories: {
    llm: Object.keys(getServerProviders()).length,
    tts: Object.keys(getServerTTSProviders()).length,
    asr: Object.keys(getServerASRProviders()).length,
    pdf: Object.keys(getServerPDFProviders()).length,
    image: Object.keys(getServerImageProviders()).length,
    video: Object.keys(getServerVideoProviders()).length,
    webSearch: Object.keys(getServerWebSearchProviders()).length,
  },
} as const;

export type ProviderStatus = typeof providerStatus;
