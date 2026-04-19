/**
 * Onboarding funnel catalogue — the curricula and subjects shown in the
 * /try picker, and whether each pairing has a real fixture chapter ready.
 *
 * Only (SSC, physics) ships as a live sample in Step 5 — it maps to the
 * seeded chapter from scripts/seed-sample-chapter.ts. Every other pairing
 * renders a "coming soon" state, but the click still persists to
 * onboarding_sessions so Step 6+ content ops know what visitors wanted.
 */

export type CurriculumId = 'ssc' | 'hsc' | 'cambridge_olevel' | 'cambridge_alevel';

export interface Curriculum {
  readonly id: CurriculumId;
  readonly label: string;
  readonly sub: string;
  readonly subBn?: string;
  readonly defaultLanguage: 'bn-BD' | 'en-US';
  readonly subjects: readonly Subject[];
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  readonly labelBn?: string;
}

export const CURRICULA: readonly Curriculum[] = [
  {
    id: 'ssc',
    label: 'SSC',
    sub: 'Bangladesh, Class 9–10',
    subBn: 'এসএসসি',
    defaultLanguage: 'bn-BD',
    subjects: [
      { id: 'physics', label: 'Physics', labelBn: 'পদার্থবিজ্ঞান' },
      { id: 'chemistry', label: 'Chemistry', labelBn: 'রসায়ন' },
      { id: 'biology', label: 'Biology', labelBn: 'জীববিজ্ঞান' },
      { id: 'math', label: 'Mathematics', labelBn: 'গণিত' },
      { id: 'bangla', label: 'Bangla', labelBn: 'বাংলা' },
      { id: 'english', label: 'English', labelBn: 'ইংরেজি' },
    ],
  },
  {
    id: 'hsc',
    label: 'HSC',
    sub: 'Bangladesh, Class 11–12',
    subBn: 'এইচএসসি',
    defaultLanguage: 'bn-BD',
    subjects: [
      { id: 'physics', label: 'Physics', labelBn: 'পদার্থবিজ্ঞান' },
      { id: 'chemistry', label: 'Chemistry', labelBn: 'রসায়ন' },
      { id: 'biology', label: 'Biology', labelBn: 'জীববিজ্ঞান' },
      { id: 'math', label: 'Higher Mathematics', labelBn: 'উচ্চতর গণিত' },
    ],
  },
  {
    id: 'cambridge_olevel',
    label: 'Cambridge O-Level',
    sub: 'Years 9–10 • CAIE',
    defaultLanguage: 'en-US',
    subjects: [
      { id: 'physics', label: 'Physics' },
      { id: 'chemistry', label: 'Chemistry' },
      { id: 'biology', label: 'Biology' },
      { id: 'math', label: 'Mathematics' },
      { id: 'further_math', label: 'Further Mathematics' },
      { id: 'economics', label: 'Economics' },
    ],
  },
  {
    id: 'cambridge_alevel',
    label: 'Cambridge A-Level',
    sub: 'Years 11–12 • CAIE',
    defaultLanguage: 'en-US',
    subjects: [
      { id: 'physics', label: 'Physics' },
      { id: 'chemistry', label: 'Chemistry' },
      { id: 'biology', label: 'Biology' },
      { id: 'math', label: 'Mathematics' },
    ],
  },
];

export function findCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}

/** The only pairing with a real live sample in Step 5. */
export const LIVE_SAMPLE = { curriculum: 'ssc', subject: 'physics' } as const;

export function hasLiveSample(curriculumId: string, subjectId: string): boolean {
  return curriculumId === LIVE_SAMPLE.curriculum && subjectId === LIVE_SAMPLE.subject;
}
