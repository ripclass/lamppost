-- ============================================================
-- THE Q&A BANK -- This is the core innovation
-- ============================================================

CREATE TABLE qa_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,

  -- The question (what a student might ask)
  question TEXT NOT NULL,
  question_bn TEXT,                      -- Bangla translation
  question_embedding vector(768),        -- nomic-embed-text vector

  -- The answer (Opus-generated, pedagogically perfect)
  answer TEXT NOT NULL,
  answer_bn TEXT,                        -- Bangla translation

  -- Context: when in the lesson does this question typically arise?
  scene_index INTEGER,                   -- which scene/slide triggers this
  topic_tags TEXT[],                      -- ['work', 'cosine', 'displacement']

  -- Classification
  difficulty TEXT DEFAULT 'medium',      -- easy, medium, hard
  question_type TEXT DEFAULT 'conceptual', -- conceptual, procedural, definitional, misconception, application, edge_case, comparison, visual

  -- Misconception handling
  common_wrong_answer TEXT,              -- what students typically answer wrong
  why_wrong TEXT,                        -- explanation of the misconception

  -- Whiteboard follow-up (if the answer needs a visual)
  has_whiteboard BOOLEAN DEFAULT false,
  whiteboard_instructions JSONB,         -- SVG drawing commands for whiteboard

  -- Source tracking
  source TEXT DEFAULT 'opus_generated',  -- opus_generated, student_derived, teacher_added
  opus_batch_id TEXT,                    -- which Opus batch generated this

  -- Behavioral data (updated by the flywheel)
  times_matched INTEGER DEFAULT 0,      -- how often this Q was matched to a student question
  times_helpful INTEGER DEFAULT 0,      -- student moved on (didn't ask follow-up)
  times_unhelpful INTEGER DEFAULT 0,    -- student asked follow-up (answer wasn't enough)
  avg_satisfaction DECIMAL(3,2),         -- computed from behavioral signals

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for vector similarity search (IVFFlat for large-scale cosine search)
CREATE INDEX idx_qa_bank_embedding ON qa_bank
  USING ivfflat (question_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for filtering by chapter
CREATE INDEX idx_qa_bank_chapter ON qa_bank (chapter_id);

-- Index for topic tag search
CREATE INDEX idx_qa_bank_tags ON qa_bank USING gin (topic_tags);

-- Trigram index for fuzzy text search fallback
CREATE INDEX idx_qa_bank_question_trgm ON qa_bank USING gin (question gin_trgm_ops);

-- ============================================================
-- Unmatched questions log (feeds the flywheel)
-- ============================================================

CREATE TABLE unmatched_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  student_id UUID,

  -- The question that didn't match
  question TEXT NOT NULL,
  question_embedding vector(768),

  -- What the fallback model answered
  fallback_answer TEXT,
  fallback_model TEXT,                   -- 'claude-sonnet-4-6', 'gemma-3-12b', etc.

  -- Did the student find it helpful?
  student_continued BOOLEAN,             -- true = moved on, false = asked follow-up
  follow_up_question TEXT,               -- if they asked a follow-up, what was it?

  -- Processing status
  status TEXT DEFAULT 'pending',         -- pending, sent_to_opus, added_to_bank, discarded
  opus_batch_id TEXT,
  new_qa_id UUID REFERENCES qa_bank(id),

  scene_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_unmatched_chapter ON unmatched_questions (chapter_id);
CREATE INDEX idx_unmatched_status ON unmatched_questions (status);
