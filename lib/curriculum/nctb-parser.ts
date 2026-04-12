/**
 * NCTB-specific Textbook Parser
 *
 * Handles Bangladesh National Curriculum & Textbook Board publications.
 * NCTB textbooks have specific formatting:
 * - Bangla script headers ("অধ্যায় ১: ...")
 * - English medium versions with "Chapter X" headers
 * - Mathematical notation in both Bangla and Latin scripts
 * - Exercise sections ("অনুশীলনী", "সৃজনশীল প্রশ্ন")
 */

import { createLogger } from '@/lib/logger';
import { detectChapterBoundaries } from './ingest';
import type { ChapterBoundary, NCTBConfig, ContentLanguage } from './types';

const log = createLogger('NCTBParser');

/**
 * Parse an NCTB textbook with board-specific enrichment.
 * Adds exercise extraction, formula detection, and Bangla metadata.
 */
export function parseNCTBTextbook(
  text: string,
  config: NCTBConfig,
): ChapterBoundary[] {
  const language: ContentLanguage = config.medium === 'bangla' ? 'bn' : 'en';
  const chapters = detectChapterBoundaries(text, 'NCTB', language);

  // Enrich each chapter with NCTB-specific metadata
  return chapters.map((chapter) => ({
    ...chapter,
    titleBn: language === 'en' ? undefined : chapter.title,
    content: enrichNCTBContent(chapter.content, config),
  }));
}

/**
 * Enrich chapter content by marking up NCTB-specific sections.
 */
function enrichNCTBContent(content: string, config: NCTBConfig): string {
  let enriched = content;

  // Mark exercise sections for Q&A generation targeting
  enriched = enriched.replace(
    /(অনুশীলনী|Exercise|সৃজনশীল প্রশ্ন|Creative Questions)/g,
    '\n\n---\n[EXERCISE_SECTION] $1\n',
  );

  // Mark important formulas
  enriched = enriched.replace(
    /(সূত্র|Formula|সমীকরণ|Equation)[\s:]+/g,
    '\n[FORMULA] $1: ',
  );

  // Mark definitions
  enriched = enriched.replace(
    /(সংজ্ঞা|Definition|পরিভাষা)[\s:]+/g,
    '\n[DEFINITION] $1: ',
  );

  log.info(
    `Enriched NCTB content for ${config.classLevel} ${config.medium} medium`,
  );

  return enriched;
}

/**
 * Extract exercise questions from an NCTB chapter.
 * These are used as seed material for Q&A bank generation.
 */
export function extractNCTBExercises(content: string): string[] {
  const exercises: string[] = [];

  // Match numbered exercise items (both Bangla and English numbering)
  const patterns = [
    /(?:^|\n)\s*(?:[০-৯]+|[\d]+)[.)\s]+(.+?)(?=\n\s*(?:[০-৯]+|[\d]+)[.)\s]|\n\n|$)/g,
    /(?:^|\n)\s*(?:[ক-ঘ]|[a-d])[.)\s]+(.+?)(?=\n|$)/g, // MCQ options
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1].trim();
      if (text.length > 10) {
        exercises.push(text);
      }
    }
  }

  return exercises;
}
