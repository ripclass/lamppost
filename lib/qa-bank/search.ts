import { embedText } from './embedder';
import { searchByEmbedding } from '@/lib/db/queries/qa-bank';
import { createLogger } from '@/lib/logger';
import type { QASearchParams, QASearchResponse } from './types';

const log = createLogger('QASearch');

/**
 * Search the Q&A bank for the best matching answer to a student's question.
 *
 * Pipeline:
 * 1. Embed the student's question via nomic-embed-text (Ollama)
 * 2. Run pgvector cosine similarity search against the chapter's Q&A bank
 * 3. Return ranked results with similarity scores
 */
export async function searchQABank(params: QASearchParams): Promise<QASearchResponse> {
  const { question, chapterId, sceneIndex, topK = 5 } = params;
  const startTime = Date.now();

  try {
    // Step 1: Embed the student's question
    const embedding = await embedText(question);

    // Step 2: Search pgvector
    const results = await searchByEmbedding({
      embedding,
      chapterId,
      topK,
      sceneIndex,
    });

    const searchLatencyMs = Date.now() - startTime;

    log.info(
      `Q&A search: "${question.slice(0, 60)}..." → ${results.length} results, ` +
        `best=${results[0]?.similarity.toFixed(3) ?? 'none'}, ${searchLatencyMs}ms`,
    );

    return {
      bestMatch: results[0] ?? null,
      topMatches: results,
      searchLatencyMs,
    };
  } catch (error) {
    const searchLatencyMs = Date.now() - startTime;
    log.error('Q&A bank search failed:', error);
    return {
      bestMatch: null,
      topMatches: [],
      searchLatencyMs,
    };
  }
}
