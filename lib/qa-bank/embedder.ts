import { createLogger } from '@/lib/logger';

const log = createLogger('QAEmbedder');

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

/**
 * Generate an embedding vector for a single text input using Ollama
 * (nomic-embed-text, 768 dimensions).
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    log.error('Ollama embedding request failed:', response.status, body);
    throw new Error(`Embedding failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { embeddings: number[][] };

  if (!result.embeddings?.[0]) {
    throw new Error('No embedding returned from Ollama');
  }

  return result.embeddings[0];
}

/**
 * Generate embeddings for multiple texts in a single batch request.
 * More efficient than calling embedText() in a loop.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    log.error('Ollama batch embedding failed:', response.status, body);
    throw new Error(`Batch embedding failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { embeddings: number[][] };

  if (!result.embeddings || result.embeddings.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings, got ${result.embeddings?.length ?? 0}`,
    );
  }

  return result.embeddings;
}
