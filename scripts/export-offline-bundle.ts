#!/usr/bin/env npx tsx
/**
 * Export Offline Bundle for School Deployments
 *
 * Usage:
 *   npx tsx scripts/export-offline-bundle.ts --subject-id <uuid> --output ./bundle
 *   npx tsx scripts/export-offline-bundle.ts --chapter-id <uuid> --output ./bundle
 *
 * Creates a self-contained bundle containing:
 *   - Lesson data (JSON) for each chapter
 *   - Q&A bank entries (JSON) for offline search
 *   - Pre-generated audio files (MP3)
 *   - Metadata for the offline loader
 *
 * This bundle is loaded into the school's local deployment
 * so students can learn without any internet connection.
 */

import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { getServiceClient } from '../lib/db/supabase';
import { listChapters, getChapter } from '../lib/db/queries/chapters';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== Offline Bundle Export ===\n');

  const supabase = getServiceClient();
  const outputDir = args.output ?? './offline-bundle';
  const chapterIds: string[] = [];

  if (args.chapterId) {
    chapterIds.push(args.chapterId);
  } else if (args.subjectId) {
    const chapters = await listChapters(args.subjectId);
    chapterIds.push(
      ...chapters
        .filter((c) => c.generationStatus === 'complete')
        .map((c) => c.id),
    );
  } else {
    console.error('Provide --chapter-id or --subject-id');
    process.exit(1);
  }

  if (chapterIds.length === 0) {
    console.log('No completed chapters to export.');
    return;
  }

  console.log(`Exporting ${chapterIds.length} chapter(s) to ${outputDir}\n`);

  // Create output directory
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const manifest: BundleManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    chapters: [],
  };

  for (const chapterId of chapterIds) {
    const chapterDir = join(outputDir, chapterId);
    if (!existsSync(chapterDir)) mkdirSync(chapterDir, { recursive: true });

    // Export lesson data
    const chapter = await getChapter(chapterId);
    const { data: lesson } = await supabase
      .from('lessons')
      .select('*')
      .eq('chapter_id', chapterId)
      .single();

    if (lesson) {
      writeFileSync(
        join(chapterDir, 'lesson.json'),
        JSON.stringify(lesson, null, 2),
      );
      console.log(`  ${chapter.title}: lesson exported`);
    }

    // Export Q&A bank
    const { data: qaEntries } = await supabase
      .from('qa_bank')
      .select(
        'id, question, question_bn, answer, answer_bn, topic_tags, difficulty, question_type, has_whiteboard, whiteboard_instructions, scene_index',
      )
      .eq('chapter_id', chapterId);

    if (qaEntries && qaEntries.length > 0) {
      writeFileSync(
        join(chapterDir, 'qa-bank.json'),
        JSON.stringify(qaEntries, null, 2),
      );
      console.log(`  ${chapter.title}: ${qaEntries.length} Q&A entries exported`);
    }

    // Copy audio files if they exist locally
    const audioDir = join('./audio', chapterId);
    if (existsSync(audioDir)) {
      const bundleAudioDir = join(chapterDir, 'audio');
      if (!existsSync(bundleAudioDir)) mkdirSync(bundleAudioDir, { recursive: true });

      const { readdirSync } = await import('fs');
      const audioFiles = readdirSync(audioDir).filter((f) =>
        f.endsWith('.mp3'),
      );

      for (const file of audioFiles) {
        copyFileSync(join(audioDir, file), join(bundleAudioDir, file));
      }

      console.log(`  ${chapter.title}: ${audioFiles.length} audio files copied`);
    }

    manifest.chapters.push({
      id: chapterId,
      title: chapter.title,
      titleBn: chapter.titleBn,
      chapterNumber: chapter.chapterNumber,
      qaEntryCount: qaEntries?.length ?? 0,
      hasLesson: !!lesson,
      hasAudio: existsSync(join(chapterDir, 'audio')),
    });
  }

  // Write manifest
  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`\nBundle exported to ${outputDir}`);
  console.log(`Manifest: ${manifest.chapters.length} chapters`);
  console.log(
    `Total Q&A entries: ${manifest.chapters.reduce((s, c) => s + c.qaEntryCount, 0)}`,
  );
}

// ==================== Types ====================

interface BundleManifest {
  version: number;
  createdAt: string;
  chapters: Array<{
    id: string;
    title: string;
    titleBn?: string;
    chapterNumber: number;
    qaEntryCount: number;
    hasLesson: boolean;
    hasAudio: boolean;
  }>;
}

interface Args {
  chapterId?: string;
  subjectId?: string;
  output?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--chapter-id': args.chapterId = argv[++i]; break;
      case '--subject-id': args.subjectId = argv[++i]; break;
      case '--output': args.output = argv[++i]; break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
