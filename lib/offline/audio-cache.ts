/**
 * Offline Audio Cache — Pre-generated TTS audio storage
 *
 * Stores pre-generated MP3 audio files in IndexedDB for offline playback.
 * For school deployments, all narration audio is pre-generated and cached
 * before the school loses internet connectivity.
 */

import Dexie, { type Table } from 'dexie';

// ==================== Database Schema ====================

export interface CachedAudio {
  /** Unique key: `${chapterId}/${sceneIndex}/${language}` */
  key: string;
  chapterId: string;
  sceneIndex: number;
  language: 'en' | 'bn';
  /** MP3 audio data as ArrayBuffer */
  audioData: ArrayBuffer;
  /** Duration in seconds */
  durationSec: number;
  /** Voice used for generation */
  voice: string;
  cachedAt: number;
  sizeBytes: number;
}

class AudioCacheDB extends Dexie {
  audio!: Table<CachedAudio, string>;

  constructor() {
    super('lamppost-audio-cache');
    this.version(1).stores({
      audio: 'key, chapterId, language',
    });
  }
}

let db: AudioCacheDB | null = null;

function getDB(): AudioCacheDB {
  if (!db) {
    db = new AudioCacheDB();
  }
  return db;
}

// ==================== Cache Operations ====================

/**
 * Store audio data for a scene.
 */
export async function cacheAudio(params: {
  chapterId: string;
  sceneIndex: number;
  language: 'en' | 'bn';
  audioData: ArrayBuffer;
  durationSec: number;
  voice: string;
}): Promise<void> {
  const key = `${params.chapterId}/${params.sceneIndex}/${params.language}`;
  await getDB().audio.put({
    key,
    chapterId: params.chapterId,
    sceneIndex: params.sceneIndex,
    language: params.language,
    audioData: params.audioData,
    durationSec: params.durationSec,
    voice: params.voice,
    cachedAt: Date.now(),
    sizeBytes: params.audioData.byteLength,
  });
}

/**
 * Retrieve cached audio for a scene.
 */
export async function getCachedAudio(
  chapterId: string,
  sceneIndex: number,
  language: 'en' | 'bn',
): Promise<CachedAudio | undefined> {
  const key = `${chapterId}/${sceneIndex}/${language}`;
  return getDB().audio.get(key);
}

/**
 * Check if audio is cached for a scene.
 */
export async function isAudioCached(
  chapterId: string,
  sceneIndex: number,
  language: 'en' | 'bn',
): Promise<boolean> {
  const key = `${chapterId}/${sceneIndex}/${language}`;
  const count = await getDB().audio.where('key').equals(key).count();
  return count > 0;
}

/**
 * Get all cached audio for a chapter.
 */
export async function getChapterAudio(
  chapterId: string,
): Promise<CachedAudio[]> {
  return getDB().audio.where('chapterId').equals(chapterId).toArray();
}

/**
 * Get total audio cache size.
 */
export async function getAudioCacheSize(): Promise<number> {
  const all = await getDB().audio.toArray();
  return all.reduce((sum, a) => sum + a.sizeBytes, 0);
}

/**
 * Remove all cached audio for a chapter.
 */
export async function removeChapterAudio(chapterId: string): Promise<void> {
  await getDB().audio.where('chapterId').equals(chapterId).delete();
}

/**
 * Clear the entire audio cache.
 */
export async function clearAudioCache(): Promise<void> {
  await getDB().audio.clear();
}

/**
 * Create an object URL for playback from cached audio.
 * Caller is responsible for revoking the URL when done.
 */
export function createAudioURL(audioData: ArrayBuffer): string {
  const blob = new Blob([audioData], { type: 'audio/mpeg' });
  return URL.createObjectURL(blob);
}
