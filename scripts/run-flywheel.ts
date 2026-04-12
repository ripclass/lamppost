#!/usr/bin/env npx tsx
/**
 * Run the Q&A Bank Flywheel
 *
 * Usage:
 *   npx tsx scripts/run-flywheel.ts
 *   npx tsx scripts/run-flywheel.ts --chapter-id <uuid>
 *   npx tsx scripts/run-flywheel.ts --batch-size 100
 *
 * Processes unmatched student questions:
 * 1. Collects pending unmatched questions from the database
 * 2. Groups by chapter
 * 3. Sends to Opus for new Q&A entry generation
 * 4. Embeds and inserts new entries into the Q&A bank
 *
 * Designed to run as a cron job (FLYWHEEL_CRON=0 3 * * *)
 */

import { collectFlywheelBatch, groupByChapter } from '../lib/qa-bank/flywheel';
import { expandQABank } from '../lib/qa-bank/generator';
import { getServiceClient } from '../lib/db/supabase';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== Q&A Bank Flywheel ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required. Set it in .env.local');
    process.exit(1);
  }

  // Step 1: Collect pending unmatched questions
  const pending = await collectFlywheelBatch(args.chapterId);

  if (pending.length === 0) {
    console.log('No pending unmatched questions. Flywheel is up to date.');
    return;
  }

  console.log(`Found ${pending.length} unmatched questions\n`);

  // Step 2: Group by chapter
  const grouped = groupByChapter(pending);
  console.log(`Grouped into ${grouped.size} chapter(s)\n`);

  // Step 3: Process each chapter
  let totalNewEntries = 0;
  let totalCost = 0;
  const supabase = getServiceClient();

  for (const [chapterId, questions] of grouped) {
    console.log(`Chapter ${chapterId}: ${questions.length} unmatched questions`);

    // Get chapter context
    const { data: chapter } = await supabase
      .from('chapters')
      .select('title, metadata')
      .eq('id', chapterId)
      .single();

    const context = (chapter?.metadata as Record<string, unknown>)?.content as string ?? '';

    // Generate new Q&A entries
    const result = await expandQABank({
      chapterId,
      unmatchedQuestions: questions.map((q) => q.question),
      existingContext: context.slice(0, 5000), // First 5K chars for context
    });

    if (result.success) {
      console.log(`  -> ${result.totalEntries} new entries, $${result.costUsd.toFixed(4)}`);
      totalNewEntries += result.totalEntries;
      totalCost += result.costUsd;

      // Mark questions as processed
      const ids = questions.map((q) => q.id);
      await supabase
        .from('unmatched_questions')
        .update({ status: 'added_to_bank', opus_batch_id: result.batchId })
        .in('id', ids);
    } else {
      console.error(`  -> FAILED: ${result.error}`);
      // Mark as failed but don't discard
      const ids = questions.map((q) => q.id);
      await supabase
        .from('unmatched_questions')
        .update({ status: 'pending' })
        .in('id', ids);
    }
  }

  console.log('\n=== Flywheel Summary ===');
  console.log(`Processed: ${pending.length} unmatched questions`);
  console.log(`New entries: ${totalNewEntries}`);
  console.log(`Cost: $${totalCost.toFixed(4)}`);
}

interface Args {
  chapterId?: string;
  batchSize?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--chapter-id': args.chapterId = argv[++i]; break;
      case '--batch-size': args.batchSize = parseInt(argv[++i], 10); break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
