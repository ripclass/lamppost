/**
 * Wraps raw Q&A bank answers with natural conversational framing
 * so the response feels like a live teacher, not a database lookup.
 */

const TEACHER_PREFIXES_EN = [
  'Great question!',
  "That's a really common question.",
  'Good thinking — let me explain.',
  "I'm glad you asked that.",
  "Let's break this down.",
  "That's an important point.",
];

const TEACHER_PREFIXES_BN = [
  'চমৎকার প্রশ্ন!',
  'খুব ভালো প্রশ্ন করেছ।',
  'এটা একটা গুরুত্বপূর্ণ বিষয়।',
  'আমি এটা ব্যাখ্যা করি।',
  'এটা অনেকেরই জানতে চাওয়ার কথা।',
];

/**
 * Add a natural-sounding conversational prefix to a Q&A bank answer.
 * This makes the pre-computed answer feel like a live teacher response.
 */
export function wrapResponse(
  answer: string,
  language: 'en' | 'bn',
  source: 'qa_bank' | 'fallback_llm',
): string {
  // Fallback LLM responses are already conversational
  if (source === 'fallback_llm') {
    return answer;
  }

  const prefixes = language === 'bn' ? TEACHER_PREFIXES_BN : TEACHER_PREFIXES_EN;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

  return `${prefix} ${answer}`;
}
