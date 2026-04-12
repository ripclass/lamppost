/**
 * Bangla Educational Style Guide (stub)
 *
 * This module defines the *presentation voice* that Opus should use when
 * generating Q&A bank entries targeted at Bangladeshi students. It is NOT
 * content. Content comes from NCTB textbooks. Style comes from observing
 * how Bangladeshi guidebooks (Panjeree, Lecture, Nobodoot) structure and
 * phrase their answers — so Lamppost's output feels like a Bangladeshi
 * teacher wrote it rather than a foreign AI.
 *
 * IMPORTANT: Never copy guidebook content. Only learn the voice.
 *
 * TODO: This file will be populated from scanned guidebook analysis.
 * The real string below should eventually encode:
 *
 *   - Answer structure per mark allocation
 *       · 1-mark → one-line definition, formal register
 *       · 2-mark → definition + one elaborating sentence
 *       · 3-mark → definition + explanation + example/application
 *       · 5-mark → numbered sub-points, diagram where relevant
 *       · 10-mark → introduction, body with headings, conclusion
 *
 *   - Bangla transitional phrases to use verbatim
 *       · অর্থাৎ        (i.e., that is to say)
 *       · সুতরাং        (therefore)
 *       · অতএব         (hence, thus)
 *       · যেমন          (for example)
 *       · অন্যদিকে      (on the other hand)
 *       · উল্লেখ্য যে    (it is noteworthy that)
 *
 *   - Diagram-first convention: for any answer that can be visualised,
 *     instruct Opus to lead with "চিত্র:" and describe the figure before
 *     the prose explanation.
 *
 *   - Key term underlining: the first occurrence of every defined term
 *     should be marked so the renderer can underline it, matching how
 *     guidebooks highlight vocabulary.
 *
 *   - Numbered sub-point formatting: long-form answers should use
 *     (১), (২), (৩) enumeration (Bengali numerals) rather than bullets.
 *
 *   - Formal-term-then-English-bracket pattern: introduce technical
 *     terminology as "বলবিদ্যা (Mechanics)" — Bangla first, English in
 *     parentheses — on first use in a chapter.
 *
 * USAGE:
 *   import { BANGLA_STYLE_GUIDE } from './bangla-style-guide';
 *   import { QA_BANK_GENERATION_SYSTEM_PROMPT } from './qa-generation';
 *
 *   const systemPrompt = `${QA_BANK_GENERATION_SYSTEM_PROMPT}\n\n${BANGLA_STYLE_GUIDE}`;
 */

export const BANGLA_STYLE_GUIDE = `
PLACEHOLDER — Bangla educational style layer.

This string is intentionally empty. It will be populated from scanned
guidebook analysis (Panjeree, Lecture, Nobodoot) and then injected into
the Opus Q&A bank generation system prompt to shape the voice of every
answer without changing its factual content.

Until this is populated, Opus will generate answers in its default voice.
Do not treat an empty style guide as a soft fallback — flag it in logs.
`.trim();

export const BANGLA_STYLE_GUIDE_VERSION = '0.0.0-stub';
