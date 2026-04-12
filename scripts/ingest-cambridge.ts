#!/usr/bin/env npx tsx
/**
 * Batch Ingest Cambridge / Edexcel Textbooks
 *
 * Usage:
 *   npx tsx scripts/ingest-cambridge.ts --file ./physics-9702.pdf --subject-id <uuid> --level AS --code 9702
 *   npx tsx scripts/ingest-cambridge.ts --dir ./textbooks/cambridge --level IGCSE
 *
 * Prerequisites:
 *   - Supabase env vars set in .env.local
 *   - PDF files ready
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { ingestTextbook } from '../lib/curriculum/ingest';
import { createCurriculum, createSubject } from '../lib/db/queries/chapters';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== Cambridge / Edexcel Textbook Ingestion ===\n');

  if (args.file) {
    if (!args.subjectId) {
      console.error('--subject-id is required for single file mode');
      process.exit(1);
    }

    const pdfBuffer = readFileSync(args.file);
    console.log(`Processing: ${args.file} (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

    const result = await ingestTextbook({
      pdfBuffer: Buffer.from(pdfBuffer),
      subjectId: args.subjectId,
      board: args.board ?? 'Cambridge CAIE',
      language: 'en',
      parser: args.parser as 'mineru' | 'unpdf' | undefined,
    });

    if (result.success) {
      console.log(`\nCreated ${result.chaptersCreated} chapters:`);
      for (const ch of result.chapters) {
        console.log(`  Ch ${ch.chapterNumber}: ${ch.title} (${ch.contentLength} chars)`);
      }
    } else {
      console.error(`\nFailed: ${result.error}`);
      process.exit(1);
    }
  } else if (args.dir) {
    const dir = args.dir;
    const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.pdf');

    if (files.length === 0) {
      console.error(`No PDF files found in ${dir}`);
      process.exit(1);
    }

    const level = args.level ?? 'IGCSE';
    const board = args.board ?? 'Cambridge CAIE';

    const curriculumId = await createCurriculum({
      name: `Cambridge ${level}`,
      board,
      language: 'en',
      country: 'BD',
    });

    console.log(`Created curriculum: Cambridge ${level} (${curriculumId})\n`);

    let totalChapters = 0;
    for (const file of files) {
      const subjectName = file.replace('.pdf', '').replace(/[-_]/g, ' ');
      const subjectId = await createSubject({
        curriculumId,
        name: subjectName,
        grade: level,
        code: args.code,
      });

      const filePath = join(dir, file);
      const pdfBuffer = readFileSync(filePath);

      console.log(`Processing: ${file}...`);

      const result = await ingestTextbook({
        pdfBuffer: Buffer.from(pdfBuffer),
        subjectId,
        board,
        language: 'en',
        parser: args.parser as 'mineru' | 'unpdf' | undefined,
      });

      if (result.success) {
        console.log(`  -> ${result.chaptersCreated} chapters`);
        totalChapters += result.chaptersCreated;
      } else {
        console.error(`  -> FAILED: ${result.error}`);
      }
    }

    console.log(`\nDone! ${totalChapters} total chapters.`);
  } else {
    console.error(
      'Usage:\n' +
        '  npx tsx scripts/ingest-cambridge.ts --file <path.pdf> --subject-id <uuid>\n' +
        '  npx tsx scripts/ingest-cambridge.ts --dir <directory> --level IGCSE\n',
    );
    process.exit(1);
  }
}

interface Args {
  file?: string;
  dir?: string;
  subjectId?: string;
  level?: string;
  code?: string;
  board?: string;
  parser?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file': args.file = argv[++i]; break;
      case '--dir': args.dir = argv[++i]; break;
      case '--subject-id': args.subjectId = argv[++i]; break;
      case '--level': args.level = argv[++i]; break;
      case '--code': args.code = argv[++i]; break;
      case '--board': args.board = argv[++i]; break;
      case '--parser': args.parser = argv[++i]; break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
