/**
 * Curriculum Ingestion Pipeline
 *
 * Converts textbook PDFs into structured chapters in the database.
 *
 * Flow:
 * 1. Upload PDF → parse via MinerU or unpdf
 * 2. Detect chapter boundaries (board-specific parsers)
 * 3. Create subject + chapter records in Supabase
 * 4. Store parsed content for downstream generation
 */

import { createLogger } from '@/lib/logger';
import { getServiceClient } from '@/lib/db/supabase';
import type {
  ParsedTextbook,
  ChapterBoundary,
  IngestResult,
  ContentLanguage,
} from './types';

const log = createLogger('CurriculumIngest');

// ==================== Main Ingest Function ====================

/**
 * Ingest a textbook PDF: parse it, detect chapters, store in DB.
 */
export async function ingestTextbook(params: {
  pdfBuffer: Buffer;
  subjectId: string;
  board: string;
  language: ContentLanguage;
  parser?: 'mineru' | 'unpdf';
}): Promise<IngestResult> {
  const { pdfBuffer, subjectId, board, language, parser } = params;

  try {
    // Step 1: Parse PDF
    log.info(`Parsing PDF (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB) via ${parser ?? 'auto'}`);
    const parsed = await parsePdf(pdfBuffer, parser);
    log.info(`Parsed: ${parsed.metadata.pageCount} pages, ${parsed.text.length} chars`);

    // Step 2: Detect chapter boundaries
    const chapters = detectChapterBoundaries(parsed.text, board, language);
    log.info(`Detected ${chapters.length} chapters`);

    if (chapters.length === 0) {
      return {
        success: false,
        subjectId,
        chaptersCreated: 0,
        chapters: [],
        error: 'No chapters detected in PDF. Check the board-specific parser.',
      };
    }

    // Step 3: Insert chapters into database
    const supabase = getServiceClient();
    const chapterRows = chapters.map((ch) => ({
      subject_id: subjectId,
      chapter_number: ch.chapterNumber,
      title: ch.title,
      title_bn: ch.titleBn,
      description: ch.content.slice(0, 500),
      generation_status: 'pending',
      metadata: {
        content: ch.content,
        startPage: ch.startPage,
        endPage: ch.endPage,
        contentLength: ch.content.length,
        board,
        language,
      },
    }));

    const { data, error } = await supabase
      .from('chapters')
      .insert(chapterRows)
      .select('id, chapter_number, title');

    if (error) {
      throw new Error(`Failed to insert chapters: ${error.message}`);
    }

    log.info(`Inserted ${data.length} chapters for subject ${subjectId}`);

    return {
      success: true,
      subjectId,
      chaptersCreated: data.length,
      chapters: chapters.map((ch) => ({
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        contentLength: ch.content.length,
        pageRange: [ch.startPage, ch.endPage],
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Textbook ingestion failed:', message);
    return {
      success: false,
      subjectId,
      chaptersCreated: 0,
      chapters: [],
      error: message,
    };
  }
}

// ==================== PDF Parsing ====================

async function parsePdf(
  pdfBuffer: Buffer,
  parser?: 'mineru' | 'unpdf',
): Promise<ParsedTextbook> {
  const useMineru =
    parser === 'mineru' ||
    (!parser && process.env.PDF_MINERU_BASE_URL);

  if (useMineru) {
    return parsePdfWithMineru(pdfBuffer);
  }

  return parsePdfWithUnpdf(pdfBuffer);
}

async function parsePdfWithMineru(pdfBuffer: Buffer): Promise<ParsedTextbook> {
  const baseUrl = process.env.PDF_MINERU_BASE_URL;
  if (!baseUrl) throw new Error('PDF_MINERU_BASE_URL is required for MinerU parsing');

  const apiKey = process.env.PDF_MINERU_API_KEY;

  // Upload PDF to MinerU
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(pdfBuffer)]), 'textbook.pdf');

  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const uploadResponse = await fetch(`${baseUrl}/api/v1/extract`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!uploadResponse.ok) {
    const body = await uploadResponse.text();
    throw new Error(`MinerU upload failed (${uploadResponse.status}): ${body}`);
  }

  const uploadResult = (await uploadResponse.json()) as {
    task_id?: string;
    trace_id?: string;
  };
  const taskId = uploadResult.task_id ?? uploadResult.trace_id;

  if (!taskId) throw new Error('MinerU did not return a task ID');

  // Poll for completion
  let result: ParsedTextbook | null = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(`${baseUrl}/api/v1/extract/${taskId}`, {
      headers,
    });

    if (!statusResponse.ok) continue;

    const statusResult = (await statusResponse.json()) as {
      state?: string;
      status?: string;
      data?: { markdown?: string; full_text?: string; pages?: number };
    };

    const state = statusResult.state ?? statusResult.status;

    if (state === 'done' || state === 'completed') {
      result = {
        text: statusResult.data?.markdown ?? statusResult.data?.full_text ?? '',
        images: [],
        metadata: {
          pageCount: statusResult.data?.pages ?? 0,
          parser: 'mineru',
        },
      };
      break;
    }

    if (state === 'failed' || state === 'error') {
      throw new Error('MinerU parsing failed');
    }
  }

  if (!result) throw new Error('MinerU parsing timed out after 5 minutes');
  return result;
}

async function parsePdfWithUnpdf(pdfBuffer: Buffer): Promise<ParsedTextbook> {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const { text } = await extractText(pdf, { mergePages: true });

  return {
    text,
    images: [],
    metadata: {
      pageCount: pdf.numPages,
      parser: 'unpdf',
    },
  };
}

// ==================== Chapter Boundary Detection ====================

/**
 * Detect chapter boundaries in parsed text. Delegates to board-specific logic.
 */
export function detectChapterBoundaries(
  text: string,
  board: string,
  language: ContentLanguage,
): ChapterBoundary[] {
  if (board === 'NCTB') {
    return detectNCTBChapters(text, language);
  }
  if (board === 'Cambridge CAIE' || board === 'Pearson Edexcel') {
    return detectCambridgeChapters(text);
  }
  // Generic fallback
  return detectGenericChapters(text);
}

function detectNCTBChapters(
  text: string,
  language: ContentLanguage,
): ChapterBoundary[] {
  const chapters: ChapterBoundary[] = [];

  // NCTB Bangla textbooks use "অধ্যায়" (chapter) headers
  // NCTB English medium uses "Chapter X" headers
  const pattern =
    language === 'bn'
      ? /(?:অধ্যায়|পরিচ্ছেদ)\s*[:\-]?\s*([০-৯\d]+)\s*[:\-\n]\s*(.+?)(?:\n|$)/g
      : /Chapter\s+(\d+)\s*[:\-.\n]\s*(.+?)(?:\n|$)/gi;

  const lines = text.split('\n');
  const matchPositions: Array<{
    index: number;
    chapterNumber: number;
    title: string;
    lineIndex: number;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (match) {
      const numStr = match[1];
      const chapterNumber = parseBanglaNumber(numStr);
      matchPositions.push({
        index: text.indexOf(line),
        chapterNumber,
        title: match[2].trim(),
        lineIndex: i,
      });
    }
  }

  for (let i = 0; i < matchPositions.length; i++) {
    const current = matchPositions[i];
    const nextStart = matchPositions[i + 1]?.index ?? text.length;
    const content = text.slice(current.index, nextStart).trim();

    chapters.push({
      chapterNumber: current.chapterNumber,
      title: current.title,
      startPage: Math.floor(current.lineIndex / 40) + 1, // approximate
      endPage: Math.floor(
        (matchPositions[i + 1]?.lineIndex ?? lines.length) / 40,
      ),
      content,
    });
  }

  return chapters;
}

function detectCambridgeChapters(text: string): ChapterBoundary[] {
  const chapters: ChapterBoundary[] = [];
  const pattern =
    /(?:Chapter|Unit|Topic|Section)\s+(\d+(?:\.\d+)?)\s*[:\-.\n]\s*(.+?)(?:\n|$)/gi;

  const lines = text.split('\n');
  const matchPositions: Array<{
    index: number;
    chapterNumber: number;
    title: string;
    lineIndex: number;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (match) {
      matchPositions.push({
        index: text.indexOf(line),
        chapterNumber: parseInt(match[1], 10),
        title: match[2].trim(),
        lineIndex: i,
      });
    }
  }

  for (let i = 0; i < matchPositions.length; i++) {
    const current = matchPositions[i];
    const nextStart = matchPositions[i + 1]?.index ?? text.length;
    const content = text.slice(current.index, nextStart).trim();

    chapters.push({
      chapterNumber: current.chapterNumber,
      title: current.title,
      startPage: Math.floor(current.lineIndex / 40) + 1,
      endPage: Math.floor(
        (matchPositions[i + 1]?.lineIndex ?? lines.length) / 40,
      ),
      content,
    });
  }

  return chapters;
}

function detectGenericChapters(text: string): ChapterBoundary[] {
  // Fallback: try numbered headings
  const chapters: ChapterBoundary[] = [];
  const pattern = /^#{1,3}\s*(\d+)[.:\-\s]+(.+?)$/gm;

  let match: RegExpExecArray | null;
  const positions: Array<{
    index: number;
    chapterNumber: number;
    title: string;
  }> = [];

  while ((match = pattern.exec(text)) !== null) {
    positions.push({
      index: match.index,
      chapterNumber: parseInt(match[1], 10),
      title: match[2].trim(),
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    const nextStart = positions[i + 1]?.index ?? text.length;
    const content = text.slice(current.index, nextStart).trim();

    chapters.push({
      chapterNumber: current.chapterNumber,
      title: current.title,
      startPage: 0,
      endPage: 0,
      content,
    });
  }

  return chapters;
}

/**
 * Parse a Bengali numeral string to a number.
 * Handles both Bengali (০১২) and Western (012) digits.
 */
function parseBanglaNumber(str: string): number {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  const converted = str.replace(/[০-৯]/g, (d) =>
    String(banglaDigits.indexOf(d)),
  );
  return parseInt(converted, 10) || 0;
}
