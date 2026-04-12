/**
 * Q&A Bank Types — The core data structures for the pre-computed Q&A system.
 *
 * The Q&A bank is the central innovation: Opus generates 1,000-2,000 Q&A pairs
 * per chapter. At runtime, student questions are matched via embedding similarity
 * against these entries. Only unmatched questions go to a live LLM.
 */

// ==================== Q&A Entry ====================

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType =
  | 'definitional'
  | 'conceptual'
  | 'procedural'
  | 'misconception'
  | 'application'
  | 'edge_case'
  | 'comparison'
  | 'visual';

export type QASource = 'opus_generated' | 'student_derived' | 'teacher_added';

export interface QAEntry {
  id: string;
  chapterId: string;

  question: string;
  questionBn?: string;
  questionEmbedding?: number[];

  answer: string;
  answerBn?: string;

  sceneIndex?: number;
  topicTags: string[];

  difficulty: Difficulty;
  questionType: QuestionType;

  commonWrongAnswer?: string;
  whyWrong?: string;

  hasWhiteboard: boolean;
  whiteboardInstructions?: Record<string, unknown>;

  source: QASource;
  opusBatchId?: string;

  timesMatched: number;
}

// ==================== Search ====================

export interface QASearchResult {
  entry: QAEntry;
  similarity: number;
}

export interface QASearchParams {
  question: string;
  chapterId: string;
  sceneIndex?: number;
  topK?: number;
}

export interface QASearchResponse {
  bestMatch: QASearchResult | null;
  topMatches: QASearchResult[];
  searchLatencyMs: number;
}

// ==================== Router Decision ====================

export type ResolutionType = 'qa_bank_match' | 'fallback_llm' | 'pre_baked_playback';

export interface RouterDecision {
  resolution: ResolutionType;
  qaEntry?: QAEntry;
  similarity: number;
  shouldEscalate: boolean;
}

// ==================== Unmatched / Flywheel ====================

export type UnmatchedStatus = 'pending' | 'sent_to_opus' | 'added_to_bank' | 'discarded';

export interface UnmatchedQuestion {
  id: string;
  chapterId: string;
  studentId?: string;
  question: string;
  questionEmbedding?: number[];
  fallbackAnswer?: string;
  fallbackModel?: string;
  studentContinued?: boolean;
  followUpQuestion?: string;
  status: UnmatchedStatus;
  sceneIndex?: number;
  createdAt: string;
}

export interface FlywheelJob {
  id: string;
  chapterId: string;
  unmatchedIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  newEntriesCount?: number;
  opusBatchId?: string;
  createdAt: string;
  completedAt?: string;
}

// ==================== Generation ====================

/** Raw Q&A entry from Opus generation (before embedding). */
export interface RawQAEntry {
  question: string;
  answer: string;
  scene_index?: number;
  topic_tags: string[];
  difficulty: Difficulty;
  question_type: QuestionType;
  common_wrong_answer?: string;
  why_wrong?: string;
  has_whiteboard: boolean;
  whiteboard_instructions?: Record<string, unknown>;
}

// ==================== Stats ====================

export interface QABankStats {
  totalEntries: number;
  totalMatches: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}
