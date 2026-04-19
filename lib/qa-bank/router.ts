import { searchQABank } from './search';
import { createLogger } from '@/lib/logger';
import { serverConfig } from '@/lib/config/server';
import type { QASearchParams, RouterDecision } from './types';

const log = createLogger('QARouter');

/**
 * The Q&A Router — the core decision engine.
 *
 * Given a student question:
 * - If embedding similarity >= threshold → serve from Q&A bank (cost: $0)
 * - If similarity < threshold → escalate to fallback LLM
 *
 * This is the function that makes Lamppost economically viable:
 * 95%+ of interactions are resolved from the bank at zero marginal cost.
 */
export async function routeQuestion(params: QASearchParams): Promise<RouterDecision> {
  const threshold = serverConfig.QA_SIMILARITY_THRESHOLD;
  const searchResult = await searchQABank(params);

  const bestMatch = searchResult.bestMatch;
  const similarity = bestMatch?.similarity ?? 0;
  const shouldEscalate = similarity < threshold;

  if (!shouldEscalate && bestMatch) {
    log.info(
      `MATCH (${similarity.toFixed(3)} >= ${threshold}): ` +
        `"${params.question.slice(0, 50)}..." → Q&A #${bestMatch.entry.id}`,
    );

    return {
      resolution: 'qa_bank_match',
      qaEntry: bestMatch.entry,
      similarity,
      shouldEscalate: false,
    };
  }

  log.info(
    `ESCALATE (${similarity.toFixed(3)} < ${threshold}): ` +
      `"${params.question.slice(0, 50)}..."`,
  );

  return {
    resolution: 'fallback_llm',
    qaEntry: bestMatch?.entry,
    similarity,
    shouldEscalate: true,
  };
}
