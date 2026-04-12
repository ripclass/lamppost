/**
 * Cambridge / Edexcel Syllabus Parser
 *
 * Handles Cambridge CAIE and Pearson Edexcel syllabi and textbooks.
 * These follow different conventions from NCTB:
 * - Topic-based organization (not always "chapters")
 * - Learning objectives prefixed with subject code (e.g., 9702/1.2.3)
 * - Assessment objectives (AO1, AO2, AO3)
 * - Structured mark schemes
 */

import { createLogger } from '@/lib/logger';
import { detectChapterBoundaries } from './ingest';
import type { ChapterBoundary, CambridgeConfig } from './types';

const log = createLogger('CambridgeParser');

/**
 * Parse a Cambridge/Edexcel textbook with board-specific enrichment.
 */
export function parseCambridgeTextbook(
  text: string,
  config: CambridgeConfig,
): ChapterBoundary[] {
  const chapters = detectChapterBoundaries(text, 'Cambridge CAIE', 'en');

  return chapters.map((chapter) => ({
    ...chapter,
    content: enrichCambridgeContent(chapter.content, config),
  }));
}

/**
 * Enrich chapter content with Cambridge-specific markup.
 */
function enrichCambridgeContent(
  content: string,
  config: CambridgeConfig,
): string {
  let enriched = content;

  // Mark learning objectives (e.g., "1.2.3 describe the...")
  enriched = enriched.replace(
    /(\d+\.\d+(?:\.\d+)?)\s+(describe|explain|calculate|define|state|outline|discuss|evaluate|analyse|compare)\s/gi,
    '\n[LEARNING_OBJECTIVE $1] $2 ',
  );

  // Mark key definitions
  enriched = enriched.replace(
    /(Key definition|Definition|KEY TERM)[\s:]+/gi,
    '\n[DEFINITION] ',
  );

  // Mark worked examples
  enriched = enriched.replace(
    /(Worked example|WORKED EXAMPLE|Example \d+)/gi,
    '\n[WORKED_EXAMPLE] $1',
  );

  // Mark exam-style questions
  enriched = enriched.replace(
    /(Exam-style question|Past paper question|Practice question)/gi,
    '\n[EXAM_QUESTION] $1',
  );

  log.info(
    `Enriched Cambridge content for ${config.level} ${config.syllabusCode}`,
  );

  return enriched;
}

/**
 * Extract learning objectives from Cambridge syllabus content.
 * Returns structured objectives that inform Q&A bank generation.
 */
export function extractLearningObjectives(
  content: string,
): Array<{ code: string; verb: string; objective: string }> {
  const objectives: Array<{ code: string; verb: string; objective: string }> =
    [];
  const pattern =
    /(\d+\.\d+(?:\.\d+)?)\s+(describe|explain|calculate|define|state|outline|discuss|evaluate|analyse|compare)\s+(.+?)(?:\n|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    objectives.push({
      code: match[1],
      verb: match[2].toLowerCase(),
      objective: match[3].trim(),
    });
  }

  return objectives;
}

/**
 * Map Cambridge assessment objective verbs to Q&A question types.
 */
export function mapVerbToQuestionType(
  verb: string,
): string {
  const mapping: Record<string, string> = {
    define: 'definitional',
    state: 'definitional',
    describe: 'conceptual',
    explain: 'conceptual',
    discuss: 'conceptual',
    calculate: 'procedural',
    outline: 'conceptual',
    evaluate: 'application',
    analyse: 'application',
    compare: 'comparison',
  };
  return mapping[verb.toLowerCase()] ?? 'conceptual';
}
