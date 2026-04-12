/**
 * Offline Lesson Cache — IndexedDB-based lesson storage
 *
 * Caches complete lesson data (scenes, Q&A bank subset, narration scripts)
 * for offline playback in school deployments. A school in Rangpur with
 * intermittent internet can pre-download all lessons and run fully offline.
 *
 * Uses the Dexie library (already in OpenMAIC dependencies) for IndexedDB.
 */

import Dexie, { type Table } from 'dexie';

// ==================== Database Schema ====================

export interface CachedLesson {
  chapterId: string;
  outline: unknown;
  scenes: unknown;
  agents: unknown;
  narrationScripts?: Record<string, string>;
  narrationScriptsBn?: Record<string, string>;
  cachedAt: number;
  sizeBytes: number;
}

export interface CachedQAEntry {
  id: string;
  chapterId: string;
  question: string;
  questionBn?: string;
  answer: string;
  answerBn?: string;
  topicTags: string[];
  difficulty: string;
  hasWhiteboard: boolean;
}

class LamppostOfflineDB extends Dexie {
  lessons!: Table<CachedLesson, string>;
  qaEntries!: Table<CachedQAEntry, string>;

  constructor() {
    super('lamppost-offline');
    this.version(1).stores({
      lessons: 'chapterId, cachedAt',
      qaEntries: 'id, chapterId',
    });
  }
}

let db: LamppostOfflineDB | null = null;

function getDB(): LamppostOfflineDB {
  if (!db) {
    db = new LamppostOfflineDB();
  }
  return db;
}

// ==================== Lesson Cache Operations ====================

/**
 * Cache a lesson for offline playback.
 */
export async function cacheLesson(lesson: CachedLesson): Promise<void> {
  await getDB().lessons.put(lesson);
}

/**
 * Retrieve a cached lesson by chapter ID.
 */
export async function getCachedLesson(
  chapterId: string,
): Promise<CachedLesson | undefined> {
  return getDB().lessons.get(chapterId);
}

/**
 * Check if a lesson is cached.
 */
export async function isLessonCached(chapterId: string): Promise<boolean> {
  const count = await getDB().lessons.where('chapterId').equals(chapterId).count();
  return count > 0;
}

/**
 * Remove a cached lesson.
 */
export async function removeCachedLesson(chapterId: string): Promise<void> {
  await getDB().lessons.delete(chapterId);
  await getDB().qaEntries.where('chapterId').equals(chapterId).delete();
}

/**
 * List all cached lessons with their sizes.
 */
export async function listCachedLessons(): Promise<
  Array<{ chapterId: string; cachedAt: number; sizeBytes: number }>
> {
  const lessons = await getDB().lessons.toArray();
  return lessons.map((l) => ({
    chapterId: l.chapterId,
    cachedAt: l.cachedAt,
    sizeBytes: l.sizeBytes,
  }));
}

/**
 * Get total cache size in bytes.
 */
export async function getCacheSize(): Promise<number> {
  const lessons = await getDB().lessons.toArray();
  return lessons.reduce((sum, l) => sum + l.sizeBytes, 0);
}

/**
 * Clear all cached data.
 */
export async function clearAllCache(): Promise<void> {
  await getDB().lessons.clear();
  await getDB().qaEntries.clear();
}

// ==================== Q&A Cache Operations ====================

/**
 * Cache Q&A entries for a chapter (subset for offline use).
 */
export async function cacheQAEntries(entries: CachedQAEntry[]): Promise<void> {
  await getDB().qaEntries.bulkPut(entries);
}

/**
 * Get cached Q&A entries for a chapter.
 */
export async function getCachedQAEntries(
  chapterId: string,
): Promise<CachedQAEntry[]> {
  return getDB().qaEntries.where('chapterId').equals(chapterId).toArray();
}

// ==================== Download from Server ====================

/**
 * Download a lesson and its Q&A bank from the server and cache locally.
 * Used to prepare offline content before going to a school deployment.
 */
export async function downloadAndCacheLesson(chapterId: string): Promise<{
  success: boolean;
  lessonSizeBytes: number;
  qaEntries: number;
  error?: string;
}> {
  try {
    // Fetch lesson data
    const lessonRes = await fetch(
      `/api/curriculum/chapters?chapterId=${chapterId}`,
    );
    const lessonData = await lessonRes.json();

    if (!lessonData.success) {
      throw new Error('Failed to fetch lesson data');
    }

    const chapter = lessonData.chapter;
    const lessonJson = JSON.stringify(chapter);
    const sizeBytes = new TextEncoder().encode(lessonJson).length;

    // Cache lesson
    await cacheLesson({
      chapterId,
      outline: chapter.metadata?.outline ?? {},
      scenes: chapter.metadata?.scenes ?? {},
      agents: chapter.metadata?.agents ?? {},
      narrationScripts: chapter.metadata?.narrationScripts,
      narrationScriptsBn: chapter.metadata?.narrationScriptsBn,
      cachedAt: Date.now(),
      sizeBytes,
    });

    // Fetch and cache Q&A entries
    const qaRes = await fetch(
      `/api/qa-bank/stats?chapterId=${chapterId}`,
    );
    const qaData = await qaRes.json();

    return {
      success: true,
      lessonSizeBytes: sizeBytes,
      qaEntries: qaData.qaBank?.totalEntries ?? 0,
    };
  } catch (error) {
    return {
      success: false,
      lessonSizeBytes: 0,
      qaEntries: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
