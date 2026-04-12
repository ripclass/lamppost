#!/usr/bin/env npx tsx
/**
 * Pre-generate TTS Audio for Lessons
 *
 * Usage:
 *   npx tsx scripts/pre-generate-tts.ts --chapter-id <uuid> --language en
 *   npx tsx scripts/pre-generate-tts.ts --subject-id <uuid> --language bn
 *   npx tsx scripts/pre-generate-tts.ts --chapter-id <uuid> --language both
 *
 * Generates MP3 audio for all narration scripts in a lesson.
 * Uses Google TTS for Bangla, OpenAI TTS for English.
 *
 * The audio is stored in Supabase Storage and paths are saved
 * to the lesson's audio_paths / audio_paths_bn fields.
 *
 * For school deployments: run this BEFORE going offline.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getServiceClient } from '../lib/db/supabase';
import { listChapters } from '../lib/db/queries/chapters';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== TTS Pre-generation ===\n');

  const supabase = getServiceClient();
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

  const language = args.language ?? 'both';
  const outputDir = args.outputDir ?? './audio';

  console.log(`Processing ${chapterIds.length} chapter(s), language=${language}\n`);

  let totalFiles = 0;

  for (const chapterId of chapterIds) {
    // Fetch lesson
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, narration_scripts, narration_scripts_bn')
      .eq('chapter_id', chapterId)
      .single();

    if (!lesson) {
      console.log(`  Chapter ${chapterId}: no lesson found, skipping`);
      continue;
    }

    const chapterDir = join(outputDir, chapterId);
    if (!existsSync(chapterDir)) mkdirSync(chapterDir, { recursive: true });

    // English narrations
    if (
      (language === 'en' || language === 'both') &&
      lesson.narration_scripts
    ) {
      const scripts = lesson.narration_scripts as Record<string, string>;
      const audioPaths: Record<string, string> = {};

      for (const [key, text] of Object.entries(scripts)) {
        if (!text || typeof text !== 'string') continue;

        try {
          const audioBuffer = await generateEnglishTTS(text);
          const filename = `${key}_en.mp3`;
          const filepath = join(chapterDir, filename);
          writeFileSync(filepath, Buffer.from(audioBuffer));
          audioPaths[key] = filepath;
          totalFiles++;
          process.stdout.write('.');
        } catch (error) {
          console.error(`\n  Failed to generate TTS for ${key}:`, error);
        }
      }

      // Save audio paths to lesson
      await supabase
        .from('lessons')
        .update({ audio_paths: audioPaths })
        .eq('id', lesson.id);
    }

    // Bangla narrations
    if (
      (language === 'bn' || language === 'both') &&
      lesson.narration_scripts_bn
    ) {
      const scripts = lesson.narration_scripts_bn as Record<string, string>;
      const audioPaths: Record<string, string> = {};

      for (const [key, text] of Object.entries(scripts)) {
        if (!text || typeof text !== 'string') continue;

        try {
          const audioBuffer = await generateBanglaTTS(text);
          const filename = `${key}_bn.mp3`;
          const filepath = join(chapterDir, filename);
          writeFileSync(filepath, Buffer.from(audioBuffer));
          audioPaths[key] = filepath;
          totalFiles++;
          process.stdout.write('.');
        } catch (error) {
          console.error(`\n  Failed to generate Bangla TTS for ${key}:`, error);
        }
      }

      await supabase
        .from('lessons')
        .update({ audio_paths_bn: audioPaths })
        .eq('id', lesson.id);
    }

    console.log(`\n  Chapter ${chapterId}: done`);
  }

  console.log(`\nGenerated ${totalFiles} audio files to ${outputDir}`);
}

// ==================== TTS Providers ====================

async function generateEnglishTTS(text: string): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.TTS_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required for English TTS');

  const voice = process.env.TTS_ENGLISH_VOICE ?? 'nova';
  const baseUrl = process.env.TTS_OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI TTS failed (${response.status}): ${body}`);
  }

  return response.arrayBuffer();
}

async function generateBanglaTTS(text: string): Promise<ArrayBuffer> {
  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY required for Bangla TTS');

  const voice = process.env.TTS_BANGLA_VOICE ?? 'bn-BD-Wavenet-A';

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'bn-BD',
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.9,
          pitch: 0,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google TTS failed (${response.status}): ${body}`);
  }

  const result = (await response.json()) as { audioContent: string };
  // Google returns base64-encoded audio
  const binaryString = atob(result.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// ==================== Args ====================

interface Args {
  chapterId?: string;
  subjectId?: string;
  language?: string;
  outputDir?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--chapter-id': args.chapterId = argv[++i]; break;
      case '--subject-id': args.subjectId = argv[++i]; break;
      case '--language': args.language = argv[++i]; break;
      case '--output-dir': args.outputDir = argv[++i]; break;
    }
  }
  return args;
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
