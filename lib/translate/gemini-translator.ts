/**
 * Gemini Translation Pipeline — English → Bangla
 *
 * Architecture principle: Opus generates in English (highest quality).
 * Gemini translates to Bangla. The student sees Bangla. But the intelligence
 * is English-first for quality control.
 *
 * Uses Gemini 3 Flash for best Bangla quality at low cost.
 */

import { createLogger } from '@/lib/logger';
import { SUBJECT_TERMINOLOGY } from './terminology';

const log = createLogger('GeminiTranslator');

const TRANSLATION_MODEL =
  process.env.TRANSLATION_MODEL ?? 'gemini-3-flash-preview';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// ==================== Types ====================

export interface TranslationResult {
  original: string;
  translated: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
}

export interface BatchTranslationResult {
  results: TranslationResult[];
  totalCostUsd: number;
  failedCount: number;
}

// ==================== Main Translation Functions ====================

/**
 * Translate a single text from English to Bangla using Gemini.
 */
export async function translateToBangla(
  text: string,
  options?: {
    subject?: string;
    preserveFormatting?: boolean;
    preserveLatex?: boolean;
  },
): Promise<TranslationResult> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required for translation');
  }

  const systemPrompt = buildTranslationPrompt(options);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TRANSLATION_MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Translate the following to Bangla:\n\n${text}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.max(text.length * 3, 4096),
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    log.error('Gemini translation failed:', response.status, body);
    throw new Error(`Translation failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text: string }> };
    }>;
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
    };
  };

  const translated = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const tokensInput = result.usageMetadata?.promptTokenCount ?? 0;
  const tokensOutput = result.usageMetadata?.candidatesTokenCount ?? 0;

  // Gemini Flash pricing: ~$0.10/1M input, ~$0.40/1M output
  const costUsd = (tokensInput * 0.1 + tokensOutput * 0.4) / 1_000_000;

  return {
    original: text,
    translated,
    model: TRANSLATION_MODEL,
    tokensInput,
    tokensOutput,
    costUsd,
  };
}

/**
 * Translate multiple texts in a batch. Processes sequentially to avoid
 * rate limits but could be parallelized with a concurrency limiter.
 */
export async function translateBatch(
  texts: string[],
  options?: {
    subject?: string;
    preserveFormatting?: boolean;
    preserveLatex?: boolean;
    concurrency?: number;
  },
): Promise<BatchTranslationResult> {
  const results: TranslationResult[] = [];
  let failedCount = 0;
  let totalCostUsd = 0;

  const concurrency = options?.concurrency ?? 3;

  // Process in batches for controlled concurrency
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const promises = batch.map(async (text) => {
      try {
        return await translateToBangla(text, options);
      } catch (error) {
        log.error(`Translation failed for text: "${text.slice(0, 50)}..."`, error);
        failedCount++;
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      if (result) {
        results.push(result);
        totalCostUsd += result.costUsd;
      }
    }
  }

  log.info(
    `Batch translation: ${results.length} succeeded, ${failedCount} failed, ` +
      `$${totalCostUsd.toFixed(6)} total cost`,
  );

  return { results, totalCostUsd, failedCount };
}

/**
 * Translate Q&A bank entries (question + answer pairs).
 * Preserves the pedagogical quality of answers during translation.
 */
export async function translateQAEntries(
  entries: Array<{ id: string; question: string; answer: string }>,
  subject?: string,
): Promise<Array<{ id: string; questionBn: string; answerBn: string }>> {
  const translated: Array<{ id: string; questionBn: string; answerBn: string }> = [];

  for (const entry of entries) {
    try {
      const [questionResult, answerResult] = await Promise.all([
        translateToBangla(entry.question, { subject }),
        translateToBangla(entry.answer, {
          subject,
          preserveLatex: true,
          preserveFormatting: true,
        }),
      ]);

      translated.push({
        id: entry.id,
        questionBn: questionResult.translated,
        answerBn: answerResult.translated,
      });
    } catch (error) {
      log.error(`Failed to translate Q&A entry ${entry.id}:`, error);
    }
  }

  return translated;
}

// ==================== Helpers ====================

function buildTranslationPrompt(options?: {
  subject?: string;
  preserveFormatting?: boolean;
  preserveLatex?: boolean;
}): string {
  const subject = options?.subject;
  const terminology = subject ? SUBJECT_TERMINOLOGY[subject] : undefined;

  let prompt = `You are an expert English-to-Bangla (বাংলা) translator specializing in educational content.

TRANSLATION RULES:
1. Translate naturally into standard Bangla (প্রমিত বাংলা), not word-by-word
2. Keep the tone warm and approachable — this is for students aged 14-18
3. Use commonly understood Bangla terms over overly formal/Sanskritized alternatives
4. Maintain the pedagogical intent — if the English explains step-by-step, the Bangla should too
5. For technical terms without good Bangla equivalents, use the English term in parentheses: বল (force)`;

  if (options?.preserveLatex) {
    prompt += `\n6. PRESERVE all LaTeX expressions exactly as-is (e.g., $F = ma$, \\frac{a}{b})`;
  }

  if (options?.preserveFormatting) {
    prompt += `\n7. PRESERVE markdown formatting (bold, italic, lists, headers)`;
  }

  if (terminology) {
    const terms = Object.entries(terminology)
      .map(([en, bn]) => `  - ${en} → ${bn}`)
      .join('\n');
    prompt += `\n\nSUBJECT-SPECIFIC TERMINOLOGY (${subject}):\n${terms}`;
  }

  prompt += `\n\nReturn ONLY the Bangla translation. No explanations, no notes.`;

  return prompt;
}
