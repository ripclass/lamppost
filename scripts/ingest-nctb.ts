#!/usr/bin/env npx tsx
/**
 * Batch Ingest NCTB Textbooks
 *
 * Usage:
 *   npx tsx scripts/ingest-nctb.ts --dir ./textbooks/nctb --class "Class 9" --medium bangla
 *   npx tsx scripts/ingest-nctb.ts --file ./physics-9.pdf --subject-id <uuid> --class "Class 9"
 *
 * Prerequisites:
 *   - Supabase env vars set in .env.local
 *   - PDF files in the specified directory
 *   - MinerU running (optional, for best OCR on Bangla text)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { ingestTextbook } from '../lib/curriculum/ingest';
import { createCurriculum, createSubject } from '../lib/db/queries/chapters';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== NCTB Textbook Ingestion ===\n');

  if (args.file) {
    // Single file mode
    await ingestSingleFile(args);
  } else if (args.dir) {
    // Directory mode — process all PDFs
    await ingestDirectory(args);
  } else {
    console.error(
      'Usage:\n' +
        '  npx tsx scripts/ingest-nctb.ts --file <path.pdf> --subject-id <uuid>\n' +
        '  npx tsx scripts/ingest-nctb.ts --dir <directory> --class "Class 9" --medium bangla\n',
    );
    process.exit(1);
  }
}

async function ingestSingleFile(args: Args) {
  if (!args.subjectId) {
    console.error('--subject-id is required for single file mode');
    process.exit(1);
  }

  const pdfBuffer = readFileSync(args.file!);
  console.log(`Processing: ${args.file} (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

  const result = await ingestTextbook({
    pdfBuffer: Buffer.from(pdfBuffer),
    subjectId: args.subjectId,
    board: 'NCTB',
    language: args.medium === 'english' ? 'en' : 'bn',
    parser: args.parser as 'mineru' | 'unpdf' | undefined,
  });

  if (result.success) {
    console.log(`\nCreated ${result.chaptersCreated} chapters:`);
    for (const ch of result.chapters) {
      console.log(`  Ch ${ch.chapterNumber}: ${ch.title} (${ch.contentLength} chars, pages ${ch.pageRange[0]}-${ch.pageRange[1]})`);
    }
  } else {
    console.error(`\nFailed: ${result.error}`);
    process.exit(1);
  }
}

async function ingestDirectory(args: Args) {
  const dir = args.dir!;
  const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.pdf');

  if (files.length === 0) {
    console.error(`No PDF files found in ${dir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} PDF files in ${dir}\n`);

  // Create curriculum and subject if needed
  const classLevel = args.class ?? 'Class 9';
  const medium = args.medium ?? 'bangla';

  const curriculumId = await createCurriculum({
    name: `SSC ${classLevel}`,
    board: 'NCTB',
    language: medium === 'english' ? 'en' : 'bn',
    country: 'BD',
  });
  console.log(`Created curriculum: SSC ${classLevel} (${curriculumId})\n`);

  let totalChapters = 0;

  for (const file of files) {
    const subjectName = file.replace('.pdf', '').replace(/[-_]/g, ' ');
    const subjectId = await createSubject({
      curriculumId,
      name: subjectName,
      grade: classLevel,
    });

    const filePath = join(dir, file);
    const pdfBuffer = readFileSync(filePath);

    console.log(`Processing: ${file} (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);

    const result = await ingestTextbook({
      pdfBuffer: Buffer.from(pdfBuffer),
      subjectId,
      board: 'NCTB',
      language: medium === 'english' ? 'en' : 'bn',
      parser: args.parser as 'mineru' | 'unpdf' | undefined,
    });

    if (result.success) {
      console.log(`  -> ${result.chaptersCreated} chapters created`);
      totalChapters += result.chaptersCreated;
    } else {
      console.error(`  -> FAILED: ${result.error}`);
    }
  }

  console.log(`\nDone! ${totalChapters} total chapters created across ${files.length} subjects.`);
}

interface Args {
  file?: string;
  dir?: string;
  subjectId?: string;
  class?: string;
  medium?: string;
  parser?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':
        args.file = argv[++i];
        break;
      case '--dir':
        args.dir = argv[++i];
        break;
      case '--subject-id':
        args.subjectId = argv[++i];
        break;
      case '--class':
        args.class = argv[++i];
        break;
      case '--medium':
        args.medium = argv[++i];
        break;
      case '--parser':
        args.parser = argv[++i];
        break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
