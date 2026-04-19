#!/usr/bin/env npx tsx
/**
 * Seed the sample chapter — SSC Physics Class 9, Chapter 4:
 * Work, Energy and Power.
 *
 * Content comes from scripts/fixtures/physics-ch4.ts (sorted by question).
 * Embeddings come from scripts/fixtures/physics-ch4.embeddings.json
 * (pre-computed via Ollama nomic-embed-text, 768-dim).
 *
 * Usage:
 *   npx tsx scripts/seed-sample-chapter.ts
 *     → read content + cached embeddings, insert into Supabase
 *
 *   npx tsx scripts/seed-sample-chapter.ts --regenerate-embeddings
 *     → call Ollama to (re)embed every question, overwrite the JSON fixture,
 *       then seed. Run this once on a machine with Ollama before committing
 *       the JSON file, and re-run if the embedding model ever changes.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL. Ollama only
 * required when --regenerate-embeddings is passed.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../lib/db/supabase';
import { embedTexts } from '../lib/qa-bank/embedder';
import { QA_ENTRIES, SAMPLE_CHAPTER, type FixtureQAEntry } from './fixtures/physics-ch4';

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url)) + '/fixtures';
const EMBEDDINGS_PATH = join(FIXTURES_DIR, 'physics-ch4.embeddings.json');
const EMBEDDING_MODEL_VERSION = 'nomic-embed-text v1.5, 768-dim';

interface EmbeddingsFile {
  readonly model: string;
  readonly generatedAt: string;
  /** Parallel array to QA_ENTRIES, indexed by position after sort-by-question. */
  readonly embeddings: readonly number[][];
  /** Sanity-check: sha of the joined questions, so a drift triggers regeneration. */
  readonly questionsHash: string;
}

async function main(): Promise<void> {
  const regenerate = process.argv.includes('--regenerate-embeddings');

  console.log('=== Seeding sample chapter: Work, Energy and Power ===\n');

  const embeddings = await loadOrGenerateEmbeddings(regenerate);

  const supabase = getServiceClient();

  const { data: curriculum, error: curErr } = await supabase
    .from('curricula')
    .insert({
      name: SAMPLE_CHAPTER.curriculum.name,
      board: SAMPLE_CHAPTER.curriculum.board,
      language: SAMPLE_CHAPTER.curriculum.language,
      country: SAMPLE_CHAPTER.curriculum.country,
      metadata: { sample: true },
    })
    .select('id')
    .single();
  if (curErr || !curriculum) {
    throw new Error(`Failed to insert curriculum: ${curErr?.message}`);
  }
  console.log(`Curriculum:  ${curriculum.id}  (${SAMPLE_CHAPTER.curriculum.name})`);

  const { data: subject, error: subErr } = await supabase
    .from('subjects')
    .insert({
      curriculum_id: curriculum.id,
      name: SAMPLE_CHAPTER.subject.name,
      name_bn: SAMPLE_CHAPTER.subject.name_bn,
      code: SAMPLE_CHAPTER.subject.code,
      grade: SAMPLE_CHAPTER.subject.grade,
    })
    .select('id')
    .single();
  if (subErr || !subject) {
    throw new Error(`Failed to insert subject: ${subErr?.message}`);
  }
  console.log(`Subject:     ${subject.id}  (${SAMPLE_CHAPTER.subject.name})`);

  const { data: chapter, error: chapErr } = await supabase
    .from('chapters')
    .insert({
      subject_id: subject.id,
      chapter_number: SAMPLE_CHAPTER.chapter.chapter_number,
      title: SAMPLE_CHAPTER.chapter.title,
      title_bn: SAMPLE_CHAPTER.chapter.title_bn,
      description: SAMPLE_CHAPTER.chapter.description,
      generation_status: 'complete',
      generation_model: 'fixture-seed',
      metadata: { sample: true },
    })
    .select('id')
    .single();
  if (chapErr || !chapter) {
    throw new Error(`Failed to insert chapter: ${chapErr?.message}`);
  }
  console.log(`Chapter:     ${chapter.id}  (${SAMPLE_CHAPTER.chapter.title})`);

  const rows = QA_ENTRIES.map((entry, idx) => qaRow(entry, embeddings[idx], chapter.id));

  const { data: inserted, error: qaErr } = await supabase
    .from('qa_bank')
    .insert(rows)
    .select('id');
  if (qaErr || !inserted) {
    throw new Error(`Failed to insert Q&A bank: ${qaErr?.message}`);
  }
  console.log(`Q&A bank:    ${inserted.length} entries\n`);

  console.log('Seed complete. Test the anon classroom:');
  console.log(`  Chapter id  → ${chapter.id}`);
  console.log(`  Sample URL  → /try/lesson/${chapter.id}`);
}

function qaRow(entry: FixtureQAEntry, embedding: readonly number[], chapterId: string) {
  return {
    chapter_id: chapterId,
    question: entry.question,
    question_bn: entry.question_bn,
    answer: entry.answer,
    answer_bn: entry.answer_bn,
    question_embedding: embedding.length > 0 ? Array.from(embedding) : null,
    topic_tags: entry.topic_tags,
    difficulty: entry.difficulty,
    question_type: entry.question_type,
    common_wrong_answer: entry.common_wrong_answer ?? null,
    why_wrong: entry.why_wrong ?? null,
    has_whiteboard: entry.has_whiteboard,
    source: 'opus_generated',
    opus_batch_id: 'sample-chapter-fixture',
  };
}

async function loadOrGenerateEmbeddings(regenerate: boolean): Promise<readonly number[][]> {
  const questions = QA_ENTRIES.map((e) => e.question);
  const currentHash = hashQuestions(questions);

  if (!regenerate && existsSync(EMBEDDINGS_PATH)) {
    const raw = await readFile(EMBEDDINGS_PATH, 'utf8');
    const file = JSON.parse(raw) as EmbeddingsFile;
    if (file.questionsHash !== currentHash) {
      console.warn(
        `Fixture questions have changed since embeddings were generated.\n` +
          `Re-run with --regenerate-embeddings to refresh.`,
      );
      process.exit(1);
    }
    if (file.embeddings.length !== questions.length) {
      throw new Error(
        `Embeddings count mismatch (${file.embeddings.length}) vs questions (${questions.length}).`,
      );
    }
    console.log(`Loaded ${file.embeddings.length} cached embeddings from ${EMBEDDINGS_PATH}`);
    return file.embeddings;
  }

  console.log(`Generating ${questions.length} embeddings via Ollama...`);
  const embeddings = await embedTexts(questions);

  if (!existsSync(FIXTURES_DIR)) {
    await mkdir(FIXTURES_DIR, { recursive: true });
  }
  const payload: EmbeddingsFile = {
    model: EMBEDDING_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    embeddings,
    questionsHash: currentHash,
  };
  await writeFile(EMBEDDINGS_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${embeddings.length} embeddings to ${EMBEDDINGS_PATH}`);
  return embeddings;
}

function hashQuestions(questions: readonly string[]): string {
  // Cheap order-sensitive fingerprint — good enough to detect fixture edits.
  let h = 5381;
  for (const q of questions) {
    for (let i = 0; i < q.length; i++) {
      h = ((h << 5) + h + q.charCodeAt(i)) | 0;
    }
  }
  return (h >>> 0).toString(16);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
