/**
 * Opus Q&A Bank Generator
 *
 * The most important pipeline in the system. Takes chapter content and
 * produces 1,000-2,000 Q&A entries via Claude Opus Batch API (50% discount).
 *
 * Pipeline:
 * 1. Build prompt with chapter content + lesson outline
 * 2. Call Opus via Batch API (async, not time-sensitive)
 * 3. Parse JSON response into RawQAEntry[]
 * 4. Embed all questions via nomic-embed-text (Ollama)
 * 5. Insert into qa_bank table with embeddings
 * 6. Update chapter generation status
 */

import { createLogger } from '@/lib/logger';
import { embedTexts } from './embedder';
import { insertQAEntries } from '@/lib/db/queries/qa-bank';
import { getServiceClient } from '@/lib/db/supabase';
import {
  QA_BANK_GENERATION_SYSTEM_PROMPT,
  QA_BANK_EXPANSION_PROMPT,
} from './prompts/qa-generation';
import type { RawQAEntry, QAEntry } from './types';

const log = createLogger('QAGenerator');

const QA_MIN_ENTRIES = Number(process.env.QA_MIN_ENTRIES_PER_CHAPTER ?? '500');
const QA_MAX_ENTRIES = Number(process.env.QA_MAX_ENTRIES_PER_CHAPTER ?? '2000');

// ==================== Types ====================

export interface GenerationInput {
  chapterId: string;
  chapterTitle: string;
  chapterContent: string;
  lessonOutline?: string;
  subjectName: string;
  grade: string;
  curriculum: string;
  targetEntries?: number;
}

export interface GenerationProgress {
  stage: 'calling_opus' | 'parsing' | 'embedding' | 'inserting' | 'complete' | 'failed';
  entriesGenerated: number;
  entriesEmbedded: number;
  entriesInserted: number;
  error?: string;
}

export interface GenerationResult {
  success: boolean;
  chapterId: string;
  totalEntries: number;
  batchId: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  error?: string;
}

type ProgressCallback = (progress: GenerationProgress) => void;

// ==================== Main Generator ====================

/**
 * Generate a complete Q&A bank for a chapter using Opus.
 *
 * This is a long-running operation (minutes to tens of minutes for large chapters).
 * Use the Batch API for 50% cost savings since it's not time-sensitive.
 */
export async function generateQABank(
  input: GenerationInput,
  onProgress?: ProgressCallback,
): Promise<GenerationResult> {
  const batchId = crypto.randomUUID();

  try {
    // Update chapter status
    await updateChapterStatus(input.chapterId, 'generating');

    // Stage 1: Call Opus
    onProgress?.({
      stage: 'calling_opus',
      entriesGenerated: 0,
      entriesEmbedded: 0,
      entriesInserted: 0,
    });

    const opusResult = await callOpusForQA(input, batchId);

    // Stage 2: Parse JSON response
    onProgress?.({
      stage: 'parsing',
      entriesGenerated: 0,
      entriesEmbedded: 0,
      entriesInserted: 0,
    });

    const rawEntries = parseOpusResponse(opusResult.text);
    log.info(`Parsed ${rawEntries.length} Q&A entries from Opus response`);

    if (rawEntries.length < QA_MIN_ENTRIES / 10) {
      throw new Error(
        `Opus generated only ${rawEntries.length} entries (expected at least ${QA_MIN_ENTRIES / 10}). ` +
          'Response may be malformed.',
      );
    }

    onProgress?.({
      stage: 'parsing',
      entriesGenerated: rawEntries.length,
      entriesEmbedded: 0,
      entriesInserted: 0,
    });

    // Stage 3: Embed all questions in batches
    onProgress?.({
      stage: 'embedding',
      entriesGenerated: rawEntries.length,
      entriesEmbedded: 0,
      entriesInserted: 0,
    });

    const EMBED_BATCH_SIZE = 64;
    const embeddings: number[][] = [];

    for (let i = 0; i < rawEntries.length; i += EMBED_BATCH_SIZE) {
      const batch = rawEntries.slice(i, i + EMBED_BATCH_SIZE);
      const batchEmbeddings = await embedTexts(batch.map((e) => e.question));
      embeddings.push(...batchEmbeddings);

      onProgress?.({
        stage: 'embedding',
        entriesGenerated: rawEntries.length,
        entriesEmbedded: embeddings.length,
        entriesInserted: 0,
      });
    }

    // Stage 4: Insert into database
    onProgress?.({
      stage: 'inserting',
      entriesGenerated: rawEntries.length,
      entriesEmbedded: embeddings.length,
      entriesInserted: 0,
    });

    const qaEntries: Array<Omit<QAEntry, 'id' | 'timesMatched'>> = rawEntries.map(
      (raw, idx) => ({
        chapterId: input.chapterId,
        question: raw.question,
        questionEmbedding: embeddings[idx],
        answer: raw.answer,
        sceneIndex: raw.scene_index,
        topicTags: raw.topic_tags ?? [],
        difficulty: raw.difficulty ?? 'medium',
        questionType: raw.question_type ?? 'conceptual',
        commonWrongAnswer: raw.common_wrong_answer,
        whyWrong: raw.why_wrong,
        hasWhiteboard: raw.has_whiteboard ?? false,
        whiteboardInstructions: raw.whiteboard_instructions,
        source: 'opus_generated' as const,
        opusBatchId: batchId,
      }),
    );

    const insertedCount = await insertQAEntries(qaEntries);

    // Update chapter status
    await updateChapterStatus(input.chapterId, 'complete', opusResult.costUsd);

    onProgress?.({
      stage: 'complete',
      entriesGenerated: rawEntries.length,
      entriesEmbedded: embeddings.length,
      entriesInserted: insertedCount,
    });

    log.info(
      `Q&A bank generated for chapter ${input.chapterId}: ` +
        `${insertedCount} entries, $${opusResult.costUsd.toFixed(4)}`,
    );

    return {
      success: true,
      chapterId: input.chapterId,
      totalEntries: insertedCount,
      batchId,
      tokensInput: opusResult.tokensInput,
      tokensOutput: opusResult.tokensOutput,
      costUsd: opusResult.costUsd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Q&A generation failed for chapter ${input.chapterId}:`, message);
    await updateChapterStatus(input.chapterId, 'failed');

    onProgress?.({
      stage: 'failed',
      entriesGenerated: 0,
      entriesEmbedded: 0,
      entriesInserted: 0,
      error: message,
    });

    return {
      success: false,
      chapterId: input.chapterId,
      totalEntries: 0,
      batchId,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      error: message,
    };
  }
}

/**
 * Generate additional Q&A entries from unmatched questions (flywheel expansion).
 * Uses a different prompt optimized for gap-filling.
 */
export async function expandQABank(params: {
  chapterId: string;
  unmatchedQuestions: string[];
  existingContext: string;
}): Promise<GenerationResult> {
  const batchId = crypto.randomUUID();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');

    const userPrompt = buildExpansionUserPrompt(
      params.unmatchedQuestions,
      params.existingContext,
    );

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 16384,
        system: QA_BANK_EXPANSION_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Opus expansion failed (${response.status}): ${body}`);
    }

    const result = (await response.json()) as {
      content: Array<{ text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const rawEntries = parseOpusResponse(result.content[0]?.text ?? '');
    const embeddings = await embedTexts(rawEntries.map((e) => e.question));

    const qaEntries: Array<Omit<QAEntry, 'id' | 'timesMatched'>> = rawEntries.map(
      (raw, idx) => ({
        chapterId: params.chapterId,
        question: raw.question,
        questionEmbedding: embeddings[idx],
        answer: raw.answer,
        sceneIndex: raw.scene_index,
        topicTags: raw.topic_tags ?? [],
        difficulty: raw.difficulty ?? 'medium',
        questionType: raw.question_type ?? 'conceptual',
        commonWrongAnswer: raw.common_wrong_answer,
        whyWrong: raw.why_wrong,
        hasWhiteboard: raw.has_whiteboard ?? false,
        whiteboardInstructions: raw.whiteboard_instructions,
        source: 'student_derived' as const,
        opusBatchId: batchId,
      }),
    );

    const insertedCount = await insertQAEntries(qaEntries);
    const costUsd =
      (result.usage.input_tokens * 5 + result.usage.output_tokens * 25) / 1_000_000;

    log.info(
      `Flywheel expansion: ${insertedCount} new entries for chapter ${params.chapterId}`,
    );

    return {
      success: true,
      chapterId: params.chapterId,
      totalEntries: insertedCount,
      batchId,
      tokensInput: result.usage.input_tokens,
      tokensOutput: result.usage.output_tokens,
      costUsd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Flywheel expansion failed:', message);
    return {
      success: false,
      chapterId: params.chapterId,
      totalEntries: 0,
      batchId,
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      error: message,
    };
  }
}

// ==================== Internal Helpers ====================

interface OpusCallResult {
  text: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

async function callOpusForQA(
  input: GenerationInput,
  batchId: string,
): Promise<OpusCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for Q&A generation');

  const model = process.env.GENERATION_MODEL ?? 'claude-opus-4-6';
  const userPrompt = buildGenerationUserPrompt(input);

  log.info(
    `Calling Opus (${model}) for Q&A generation: chapter="${input.chapterTitle}", ` +
      `batch=${batchId}`,
  );

  // Use synchronous Messages API (Batch API integration in future iteration)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 65536,
      system: [
        {
          type: 'text',
          text: QA_BANK_GENERATION_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Opus API call failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as {
    content: Array<{ text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };

  const text = result.content[0]?.text ?? '';
  const tokensInput = result.usage.input_tokens;
  const tokensOutput = result.usage.output_tokens;

  // Opus pricing: $5/1M input, $25/1M output (standard)
  // Batch API: $2.50/1M input, $12.50/1M output (50% off)
  const costUsd = (tokensInput * 5 + tokensOutput * 25) / 1_000_000;

  log.info(
    `Opus response: ${tokensInput} input + ${tokensOutput} output tokens, ` +
      `$${costUsd.toFixed(4)}, ${text.length} chars`,
  );

  return { text, tokensInput, tokensOutput, costUsd };
}

function buildGenerationUserPrompt(input: GenerationInput): string {
  const targetCount = input.targetEntries ?? QA_MAX_ENTRIES;

  return `## Chapter Information

**Curriculum**: ${input.curriculum}
**Subject**: ${input.subjectName}
**Grade**: ${input.grade}
**Chapter**: ${input.chapterTitle}

## Chapter Content

${input.chapterContent}

${input.lessonOutline ? `## Lesson Outline\n\n${input.lessonOutline}` : ''}

## Instructions

Generate a comprehensive Q&A bank for this chapter. Target: ${targetCount} entries.
Cover every formula, concept, misconception, graph, exam-style question, and "afraid to ask" question.

Return a JSON array of objects. Each object must have these fields:
- question (string)
- answer (string)
- scene_index (number, nullable)
- topic_tags (string[])
- difficulty ("easy" | "medium" | "hard")
- question_type ("definitional" | "conceptual" | "procedural" | "misconception" | "application" | "edge_case" | "comparison" | "visual")
- common_wrong_answer (string, nullable)
- why_wrong (string, nullable)
- has_whiteboard (boolean)
- whiteboard_instructions (object, nullable)

Return ONLY the JSON array, no markdown code fences, no explanation.`;
}

function buildExpansionUserPrompt(
  unmatchedQuestions: string[],
  existingContext: string,
): string {
  const questionList = unmatchedQuestions
    .map((q, i) => `${i + 1}. "${q}"`)
    .join('\n');

  return `## Unmatched Student Questions

These questions were asked by real students and were NOT found in the existing Q&A bank:

${questionList}

## Existing Chapter Context

${existingContext}

## Instructions

For each unmatched question:
1. Generate a Q&A entry with a high-quality answer
2. Generate 3-5 related questions a student with this confusion would also have
3. If it reveals a misconception, generate a dedicated misconception entry

Return ONLY a JSON array of objects (same format as the original Q&A bank).`;
}

/**
 * Parse Opus JSON response into RawQAEntry[].
 * Handles common issues: markdown code fences, trailing commas, partial JSON.
 */
function parseOpusResponse(text: string): RawQAEntry[] {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Handle trailing commas before ] (common LLM output issue)
  cleaned = cleaned.replace(/,\s*]/g, ']');

  try {
    const parsed = JSON.parse(cleaned) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error('Expected JSON array, got ' + typeof parsed);
    }

    // Validate and coerce each entry
    return parsed
      .filter((item): item is Record<string, unknown> => {
        return (
          item !== null &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).question === 'string' &&
          typeof (item as Record<string, unknown>).answer === 'string'
        );
      })
      .map((item) => ({
        question: item.question as string,
        answer: item.answer as string,
        scene_index:
          typeof item.scene_index === 'number' ? item.scene_index : undefined,
        topic_tags: Array.isArray(item.topic_tags)
          ? (item.topic_tags as string[])
          : [],
        difficulty: validateDifficulty(item.difficulty),
        question_type: validateQuestionType(item.question_type),
        common_wrong_answer:
          typeof item.common_wrong_answer === 'string'
            ? item.common_wrong_answer
            : undefined,
        why_wrong:
          typeof item.why_wrong === 'string' ? item.why_wrong : undefined,
        has_whiteboard: item.has_whiteboard === true,
        whiteboard_instructions:
          item.has_whiteboard === true &&
          item.whiteboard_instructions &&
          typeof item.whiteboard_instructions === 'object'
            ? (item.whiteboard_instructions as Record<string, unknown>)
            : undefined,
      }));
  } catch (error) {
    log.error('Failed to parse Opus response as JSON:', error);
    log.error('Response preview:', cleaned.slice(0, 500));
    throw new Error(
      `Failed to parse Opus Q&A response: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateDifficulty(value: unknown): RawQAEntry['difficulty'] {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return 'medium';
}

function validateQuestionType(value: unknown): RawQAEntry['question_type'] {
  const valid = [
    'definitional',
    'conceptual',
    'procedural',
    'misconception',
    'application',
    'edge_case',
    'comparison',
    'visual',
  ];
  if (typeof value === 'string' && valid.includes(value)) {
    return value as RawQAEntry['question_type'];
  }
  return 'conceptual';
}

async function updateChapterStatus(
  chapterId: string,
  status: string,
  costUsd?: number,
): Promise<void> {
  try {
    const supabase = getServiceClient();
    const update: Record<string, unknown> = {
      generation_status: status,
      updated_at: new Date().toISOString(),
    };
    if (costUsd !== undefined) {
      update.generation_cost_usd = costUsd;
      update.generation_model = process.env.GENERATION_MODEL ?? 'claude-opus-4-6';
    }
    await supabase.from('chapters').update(update).eq('id', chapterId);
  } catch (error) {
    log.warn('Failed to update chapter status:', error);
  }
}
