#!/usr/bin/env npx tsx
/**
 * Batch Translate Content to Bangla
 *
 * Usage:
 *   npx tsx scripts/translate-to-bangla.ts --chapter-id <uuid> --subject Physics
 *   npx tsx scripts/translate-to-bangla.ts --subject-id <uuid> --subject Chemistry
 *
 * Translates Q&A bank entries and lesson narrations from English to Bangla
 * using Gemini Flash.
 */

import { translateQAEntries } from '../lib/translate/gemini-translator';
import { getServiceClient } from '../lib/db/supabase';
import { listChapters } from '../lib/db/queries/chapters';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== Bangla Translation Pipeline ===\n');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY is required. Set it in .env.local');
    process.exit(1);
  }

  const supabase = getServiceClient();
  const chapterIds: string[] = [];

  if (args.chapterId) {
    chapterIds.push(args.chapterId);
  } else if (args.subjectId) {
    const chapters = await listChapters(args.subjectId);
    chapterIds.push(...chapters.map((c) => c.id));
  } else {
    console.error('Provide --chapter-id or --subject-id');
    process.exit(1);
  }

  console.log(`Translating Q&A banks for ${chapterIds.length} chapter(s)\n`);

  let totalTranslated = 0;
  const batchSize = args.batchSize ?? 50;

  for (const chapterId of chapterIds) {
    // Fetch untranslated entries
    const { data: entries } = await supabase
      .from('qa_bank')
      .select('id, question, answer')
      .eq('chapter_id', chapterId)
      .is('question_bn', null)
      .limit(batchSize);

    if (!entries || entries.length === 0) {
      console.log(`  Chapter ${chapterId}: already translated`);
      continue;
    }

    console.log(`  Chapter ${chapterId}: translating ${entries.length} entries...`);

    const translated = await translateQAEntries(entries, args.subject);

    // Save translations
    for (const entry of translated) {
      await supabase
        .from('qa_bank')
        .update({
          question_bn: entry.questionBn,
          answer_bn: entry.answerBn,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.id);
    }

    console.log(`    -> ${translated.length} translated`);
    totalTranslated += translated.length;
  }

  console.log(`\nDone! ${totalTranslated} entries translated to Bangla.`);
}

interface Args {
  chapterId?: string;
  subjectId?: string;
  subject?: string;
  batchSize?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--chapter-id': args.chapterId = argv[++i]; break;
      case '--subject-id': args.subjectId = argv[++i]; break;
      case '--subject': args.subject = argv[++i]; break;
      case '--batch-size': args.batchSize = parseInt(argv[++i], 10); break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
