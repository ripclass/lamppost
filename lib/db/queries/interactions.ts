import { getServiceClient } from '../supabase';
import { createLogger } from '@/lib/logger';

const log = createLogger('InteractionQueries');

export interface InteractionRecord {
  studentId?: string;
  chapterId: string;
  sessionId: string;
  interactionType: string;
  studentInput?: string;
  studentInputEmbedding?: number[];
  resolutionType: string;
  qaBankId?: string;
  similarityScore?: number;
  response?: string;
  responseModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  latencyMs?: number;
}

/**
 * Log a student interaction for analytics and flywheel processing.
 */
export async function logInteraction(record: InteractionRecord): Promise<string> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('student_interactions')
    .insert({
      student_id: record.studentId,
      chapter_id: record.chapterId,
      session_id: record.sessionId,
      interaction_type: record.interactionType,
      student_input: record.studentInput,
      student_input_embedding: record.studentInputEmbedding,
      resolution_type: record.resolutionType,
      qa_bank_id: record.qaBankId,
      similarity_score: record.similarityScore,
      response: record.response,
      response_model: record.responseModel,
      tokens_input: record.tokensInput ?? 0,
      tokens_output: record.tokensOutput ?? 0,
      cost_usd: record.costUsd ?? 0,
      latency_ms: record.latencyMs,
    })
    .select('id')
    .single();

  if (error) {
    log.error('Failed to log interaction:', error.message);
    throw new Error(`Failed to log interaction: ${error.message}`);
  }

  return data.id as string;
}

/**
 * Get interaction analytics for a chapter.
 */
export async function getInteractionStats(chapterId: string) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('student_interactions')
    .select('resolution_type, cost_usd, latency_ms, created_at')
    .eq('chapter_id', chapterId);

  if (error) {
    log.error('Failed to get interaction stats:', error.message);
    throw new Error(`Failed to get interaction stats: ${error.message}`);
  }

  const rows = data ?? [];
  const byResolution: Record<string, number> = {};
  let totalCost = 0;
  let totalLatency = 0;
  let latencyCount = 0;

  for (const row of rows) {
    byResolution[row.resolution_type] = (byResolution[row.resolution_type] ?? 0) + 1;
    totalCost += Number(row.cost_usd) || 0;
    if (row.latency_ms) {
      totalLatency += row.latency_ms;
      latencyCount++;
    }
  }

  return {
    totalInteractions: rows.length,
    byResolution,
    totalCostUsd: totalCost,
    avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
    qaBankHitRate:
      rows.length > 0 ? (byResolution['qa_bank_match'] ?? 0) / rows.length : 0,
  };
}
