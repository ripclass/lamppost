#!/usr/bin/env npx tsx
/**
 * Seed Demo Data
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 *
 * Creates a demo curriculum (SSC Physics Class 9) with one chapter and
 * a small set of Q&A bank entries for testing the classroom interaction flow.
 */

import { getServiceClient } from '../lib/db/supabase';
import { embedTexts } from '../lib/qa-bank/embedder';

const DEMO_QA_ENTRIES = [
  {
    question: 'What is the formula for work?',
    answer:
      'Work is defined as the product of force and displacement in the direction of the force. The formula is: W = F × d × cos(θ), where W is work (in joules), F is the applied force (in newtons), d is the displacement (in meters), and θ is the angle between the force and displacement vectors. When the force is in the same direction as the displacement (θ = 0°), cos(0°) = 1, so W = F × d.',
    topic_tags: ['work', 'force', 'displacement', 'energy'],
    difficulty: 'easy',
    question_type: 'definitional',
    common_wrong_answer: 'W = F × d (without considering the angle)',
    why_wrong:
      'Many students forget the cos(θ) term. When force and displacement are not in the same direction, you must include the angle. W = F × d only works when θ = 0°.',
    has_whiteboard: false,
  },
  {
    question: "Why is there a cosine in the work formula?",
    answer:
      "The cosine appears because work only counts the component of force that acts along the direction of displacement. Imagine pushing a box at an angle — only the horizontal component of your push actually moves the box forward. The vertical component just pushes the box into the ground. cos(θ) extracts that useful horizontal component. When θ = 0° (pushing straight), cos(0°) = 1, so all the force does work. When θ = 90° (pushing straight down), cos(90°) = 0, so no work is done because you're not moving the box at all!",
    topic_tags: ['work', 'cosine', 'force components', 'vectors'],
    difficulty: 'medium',
    question_type: 'conceptual',
    common_wrong_answer: "The cosine is just a mathematical thing, it doesn't mean anything physical",
    why_wrong:
      'The cosine has a very physical meaning! It represents the fraction of the force that actually contributes to moving the object. Understanding this helps you see why pushing at an angle is less efficient than pushing straight.',
    has_whiteboard: true,
  },
  {
    question: 'What is the SI unit of work?',
    answer:
      'The SI unit of work is the joule (J). 1 joule = 1 newton × 1 meter = 1 N·m. It is named after James Prescott Joule. In everyday terms, 1 joule is roughly the energy needed to lift a small apple (about 100g) by 1 meter against gravity.',
    topic_tags: ['work', 'units', 'joule', 'SI units'],
    difficulty: 'easy',
    question_type: 'definitional',
    has_whiteboard: false,
  },
  {
    question: 'Can work be negative?',
    answer:
      'Yes! Work is negative when the force opposes the displacement. For example, friction always does negative work because it acts opposite to the direction of motion. If you push a box forward but friction pushes backward, the friction force does negative work on the box. Mathematically, when θ > 90°, cos(θ) is negative, so W = F × d × cos(θ) becomes negative. Negative work means energy is being taken away from the object.',
    topic_tags: ['work', 'negative work', 'friction', 'energy'],
    difficulty: 'medium',
    question_type: 'conceptual',
    common_wrong_answer: 'No, work is always positive because it involves force and distance',
    why_wrong:
      "Distance is always positive, but work depends on the direction of force relative to displacement. The cosine of angles greater than 90° is negative, making work negative. It's a common misconception because distance can't be negative, but work can!",
    has_whiteboard: false,
  },
  {
    question: "What is the difference between work and energy?",
    answer:
      'Work and energy are closely related but different concepts. Energy is the capacity to do work — it is a property that an object has (like kinetic energy or potential energy). Work is the process of transferring energy from one object to another. Think of it this way: energy is like money in a bank account, and work is like a transaction. When you do work on an object, you transfer energy to it. The work-energy theorem states: net work done on an object = change in its kinetic energy.',
    topic_tags: ['work', 'energy', 'work-energy theorem', 'kinetic energy'],
    difficulty: 'medium',
    question_type: 'comparison',
    has_whiteboard: false,
  },
];

async function main() {
  console.log('=== Seeding Demo Data ===\n');

  const supabase = getServiceClient();

  // Step 1: Create curriculum
  const { data: curriculum } = await supabase
    .from('curricula')
    .insert({
      name: 'SSC',
      board: 'NCTB',
      language: 'en',
      country: 'BD',
      metadata: { demo: true },
    })
    .select('id')
    .single();

  if (!curriculum) {
    console.error('Failed to create curriculum');
    process.exit(1);
  }
  console.log(`Created curriculum: SSC (${curriculum.id})`);

  // Step 2: Create subject
  const { data: subject } = await supabase
    .from('subjects')
    .insert({
      curriculum_id: curriculum.id,
      name: 'Physics',
      name_bn: 'পদার্থবিজ্ঞান',
      code: 'PHY',
      grade: 'Class 9',
    })
    .select('id')
    .single();

  if (!subject) {
    console.error('Failed to create subject');
    process.exit(1);
  }
  console.log(`Created subject: Physics (${subject.id})`);

  // Step 3: Create chapter
  const { data: chapter } = await supabase
    .from('chapters')
    .insert({
      subject_id: subject.id,
      chapter_number: 4,
      title: 'Work, Energy and Power',
      title_bn: 'কাজ, শক্তি ও ক্ষমতা',
      description: 'Concepts of work, kinetic and potential energy, conservation of energy, and power.',
      generation_status: 'complete',
      generation_model: 'demo-seed',
      metadata: { demo: true },
    })
    .select('id')
    .single();

  if (!chapter) {
    console.error('Failed to create chapter');
    process.exit(1);
  }
  console.log(`Created chapter: Work, Energy and Power (${chapter.id})`);

  // Step 4: Generate embeddings for demo Q&A entries
  console.log('\nGenerating embeddings for demo Q&A entries...');

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(DEMO_QA_ENTRIES.map((e) => e.question));
    console.log(`Generated ${embeddings.length} embeddings`);
  } catch {
    console.warn(
      'Ollama not available — inserting Q&A entries without embeddings.\n' +
        'Run Ollama with nomic-embed-text to enable vector search.',
    );
    embeddings = DEMO_QA_ENTRIES.map(() => []);
  }

  // Step 5: Insert Q&A entries
  const rows = DEMO_QA_ENTRIES.map((entry, idx) => ({
    chapter_id: chapter.id,
    question: entry.question,
    answer: entry.answer,
    question_embedding: embeddings[idx].length > 0 ? embeddings[idx] : null,
    topic_tags: entry.topic_tags,
    difficulty: entry.difficulty,
    question_type: entry.question_type,
    common_wrong_answer: entry.common_wrong_answer ?? null,
    why_wrong: entry.why_wrong ?? null,
    has_whiteboard: entry.has_whiteboard,
    source: 'opus_generated',
    opus_batch_id: 'demo-seed',
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('qa_bank')
    .insert(rows)
    .select('id');

  if (insertError) {
    console.error('Failed to insert Q&A entries:', insertError.message);
    process.exit(1);
  }

  console.log(`Inserted ${inserted.length} demo Q&A entries`);

  console.log('\n=== Demo data seeded successfully! ===');
  console.log(`\nIDs for testing:`);
  console.log(`  Curriculum: ${curriculum.id}`);
  console.log(`  Subject:    ${subject.id}`);
  console.log(`  Chapter:    ${chapter.id}`);
  console.log(`\nTest the search endpoint:`);
  console.log(
    `  curl -X POST http://localhost:3000/api/qa-bank/search \\`,
  );
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(
    `    -d '{"question":"why is there cosine in work formula","chapterId":"${chapter.id}","sessionId":"demo"}'`,
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
