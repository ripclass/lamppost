#!/usr/bin/env npx tsx
/**
 * Generate Q&A Bank for Chapters
 *
 * Usage:
 *   npx tsx scripts/generate-qa-bank.ts --chapter-id <uuid>
 *   npx tsx scripts/generate-qa-bank.ts --subject-id <uuid>
 *   npx tsx scripts/generate-qa-bank.ts --all
 *
 * This calls Opus to generate 1,000-2,000 Q&A entries per chapter.
 * Cost: roughly $1-5 per chapter depending on content size.
 *
 * Requires: ANTHROPIC_API_KEY + Supabase keys in .env.local. See .env.example.
 * Boot-time Zod validation in lib/config/server.ts will fail-fast if missing.
 */

import '../lib/config/server'; // boot-time validation of ANTHROPIC_API_KEY + Supabase keys
import { generateQABank } from '../lib/qa-bank/generator';
import { runBatchGeneration } from '../lib/curriculum/batch-generator';
import { getChapter } from '../lib/db/queries/chapters';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== Q&A Bank Generation ===\n');

  if (args.chapterId) {
    // Single chapter mode
    const chapter = await getChapter(args.chapterId);
    const content = (chapter.metadata?.content as string) ?? '';

    if (!content) {
      console.error(`Chapter ${args.chapterId} has no content. Ingest a textbook first.`);
      process.exit(1);
    }

    console.log(`Generating Q&A bank for: ${chapter.title}`);
    console.log(`Content length: ${content.length} chars\n`);

    const result = await generateQABank(
      {
        chapterId: args.chapterId,
        chapterTitle: chapter.title,
        chapterContent: content,
        subjectName: 'Unknown',
        grade: 'Unknown',
        curriculum: 'Unknown',
        targetEntries: args.target,
      },
      (progress) => {
        console.log(
          `  [${progress.stage}] entries: ${progress.entriesGenerated} generated, ` +
            `${progress.entriesEmbedded} embedded, ${progress.entriesInserted} inserted`,
        );
      },
    );

    if (result.success) {
      console.log(`\nDone! ${result.totalEntries} entries created.`);
      console.log(`Cost: $${result.costUsd.toFixed(4)}`);
      console.log(`Tokens: ${result.tokensInput} input + ${result.tokensOutput} output`);
    } else {
      console.error(`\nFailed: ${result.error}`);
      process.exit(1);
    }
  } else {
    // Batch mode
    console.log(
      args.subjectId
        ? `Generating Q&A banks for all pending chapters in subject ${args.subjectId}...`
        : 'Generating Q&A banks for ALL pending chapters...',
    );
    console.log('This may take a while and cost money. Press Ctrl+C to cancel.\n');

    const result = await runBatchGeneration(
      {
        subjectId: args.subjectId,
        targetEntriesPerChapter: args.target,
      },
      (progress) => {
        const done = progress.completedChapters + progress.failedChapters;
        console.log(
          `  [${done}/${progress.totalChapters}] ${progress.currentChapter ?? 'done'} ` +
            `| entries: ${progress.totalEntries} | cost: $${progress.totalCostUsd.toFixed(4)}`,
        );
      },
    );

    console.log('\n=== Summary ===');
    console.log(`Chapters: ${result.completedChapters}/${result.totalChapters} succeeded, ${result.failedChapters} failed`);
    console.log(`Total entries: ${result.totalEntries}`);
    console.log(`Total cost: $${result.totalCostUsd.toFixed(4)}`);
  }
}

interface Args {
  chapterId?: string;
  subjectId?: string;
  target?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--chapter-id': args.chapterId = argv[++i]; break;
      case '--subject-id': args.subjectId = argv[++i]; break;
      case '--all': break; // default behavior
      case '--target': args.target = parseInt(argv[++i], 10); break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
