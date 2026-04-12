-- ============================================================
-- Student interaction log (for behavioral analytics + flywheel)
-- ============================================================

CREATE TABLE student_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  session_id UUID,

  -- What happened
  interaction_type TEXT NOT NULL,        -- 'question', 'quiz_answer', 'whiteboard_request', 'voice_input'

  -- The student's input
  student_input TEXT,
  student_input_embedding vector(768),

  -- How it was resolved
  resolution_type TEXT NOT NULL,         -- 'qa_bank_match', 'fallback_llm', 'pre_baked_playback'
  qa_bank_id UUID REFERENCES qa_bank(id),
  similarity_score DECIMAL(4,3),

  -- The response given
  response TEXT,
  response_model TEXT,                   -- 'qa_bank', 'claude-sonnet-4-6', 'gemma-3-12b'

  -- Cost tracking
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,

  -- Timing
  latency_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE student_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own interactions" ON student_interactions
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE auth_id = auth.uid())
  );

-- Indexes for analytics queries
CREATE INDEX idx_interactions_student ON student_interactions (student_id);
CREATE INDEX idx_interactions_chapter ON student_interactions (chapter_id);
CREATE INDEX idx_interactions_session ON student_interactions (session_id);
CREATE INDEX idx_interactions_resolution ON student_interactions (resolution_type);
CREATE INDEX idx_interactions_created ON student_interactions (created_at);
