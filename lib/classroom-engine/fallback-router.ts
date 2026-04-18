import { createLogger } from '@/lib/logger';
import { serverConfig } from '@/lib/config/server';
import type { FallbackRequest, FallbackResponse } from './types';

const log = createLogger('FallbackRouter');

/**
 * Route an unmatched question to the appropriate fallback LLM.
 *
 * Model selection logic:
 * - Default: Claude Sonnet 4.6 (best quality real-time)
 * - Offline: Gemma 3 12B via Ollama (zero cost, school deployment)
 *
 * Uses prompt caching: the lesson context for a chapter is identical
 * across all students, so it's cached once and reused.
 */
export async function routeToFallback(request: FallbackRequest): Promise<FallbackResponse> {
  const model = serverConfig.CLASSROOM_FALLBACK_MODEL;

  log.info(`Fallback to ${model} for: "${request.question.slice(0, 60)}..."`);

  // Build context from related Q&A entries (teacher's notes)
  const relatedContext = request.relatedQAs
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join('\n\n');

  const systemPrompt = buildFallbackSystemPrompt(request.language, relatedContext);

  // Route to the appropriate provider
  if (model.startsWith('ollama:') || model.startsWith('gemma')) {
    return callOllamaFallback(model, systemPrompt, request.question);
  }

  return callClaudeFallback(model, systemPrompt, request.question);
}

function buildFallbackSystemPrompt(language: 'en' | 'bn', relatedContext: string): string {
  const langInstruction =
    language === 'bn'
      ? 'Respond in Bangla (বাংলা). Use simple, clear language appropriate for a student.'
      : 'Respond in English. Use simple, clear language appropriate for a student.';

  return `You are a patient, expert teacher answering a student's question during a live classroom session.

${langInstruction}

Keep your answer concise but thorough. Use analogies when helpful.
If a formula is involved, show the derivation step by step.

Here are related Q&As from this chapter for context:

${relatedContext}`;
}

async function callClaudeFallback(
  model: string,
  systemPrompt: string,
  question: string,
): Promise<FallbackResponse> {
  const apiKey = serverConfig.ANTHROPIC_API_KEY;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model.replace('anthropic:', ''),
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: question }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    log.error('Claude fallback failed:', response.status, body);
    throw new Error(`Claude fallback failed (${response.status})`);
  }

  const result = (await response.json()) as {
    content: Array<{ text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };

  const text = result.content[0]?.text ?? '';
  const tokensInput = result.usage.input_tokens;
  const tokensOutput = result.usage.output_tokens;

  // Sonnet 4.6 pricing: $3/1M input, $15/1M output
  const costUsd = (tokensInput * 3 + tokensOutput * 15) / 1_000_000;

  return { text, model, tokensInput, tokensOutput, costUsd };
}

async function callOllamaFallback(
  model: string,
  systemPrompt: string,
  question: string,
): Promise<FallbackResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const modelName = model.replace('ollama:', '');

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    log.error('Ollama fallback failed:', response.status, body);
    throw new Error(`Ollama fallback failed (${response.status})`);
  }

  const result = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    text: result.choices[0]?.message?.content ?? '',
    model: modelName,
    tokensInput: result.usage?.prompt_tokens ?? 0,
    tokensOutput: result.usage?.completion_tokens ?? 0,
    costUsd: 0, // Ollama is local, zero cost
  };
}
