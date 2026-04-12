/**
 * Curriculum Types — Content hierarchy and ingestion structures.
 *
 * Hierarchy: Curriculum → Subject → Chapter → Lesson + Q&A Bank
 * Supports: NCTB (Bangladeshi national), Cambridge CAIE, Pearson Edexcel
 */

// ==================== Curriculum Hierarchy ====================

export type Board = 'NCTB' | 'Cambridge CAIE' | 'Pearson Edexcel' | 'IB' | string;
export type ContentLanguage = 'en' | 'bn';

export interface Curriculum {
  id: string;
  name: string;
  board?: Board;
  language: ContentLanguage;
  country: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Subject {
  id: string;
  curriculumId: string;
  name: string;
  nameBn?: string;
  code?: string;
  grade?: string;
  totalChapters?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  chapterNumber: number;
  title: string;
  titleBn?: string;
  description?: string;
  sourcePdfPath?: string;
  generationStatus: ChapterStatus;
  generationModel?: string;
  generationCostUsd?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ChapterStatus = 'pending' | 'generating' | 'complete' | 'failed';

// ==================== Ingestion ====================

/** Result of parsing a textbook PDF into structured chapters. */
export interface IngestResult {
  success: boolean;
  subjectId: string;
  chaptersCreated: number;
  chapters: ChapterIngestInfo[];
  error?: string;
}

export interface ChapterIngestInfo {
  chapterNumber: number;
  title: string;
  contentLength: number;
  pageRange: [number, number];
}

/** Parsed PDF content ready for chapter extraction. */
export interface ParsedTextbook {
  text: string;
  images: string[];
  metadata: {
    pageCount: number;
    parser: string;
  };
}

/** A detected chapter boundary within a parsed PDF. */
export interface ChapterBoundary {
  chapterNumber: number;
  title: string;
  titleBn?: string;
  startPage: number;
  endPage: number;
  content: string;
}

// ==================== Board-specific Configs ====================

export interface NCTBConfig {
  classLevel: 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10';
  medium: 'bangla' | 'english';
  year: number;
}

export interface CambridgeConfig {
  level: 'IGCSE' | 'O-Level' | 'AS' | 'A2';
  syllabusCode: string;
  examSession: string;
}
