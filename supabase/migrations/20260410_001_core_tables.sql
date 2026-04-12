-- ============================================================
-- Lamppost Core Tables
-- Curricula → Subjects → Chapters → Lessons
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Curricula (SSC, HSC, O-level, A-level, University)
CREATE TABLE curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 'SSC', 'HSC', 'Cambridge O-Level', etc.
  board TEXT,                            -- 'NCTB', 'Cambridge CAIE', 'Pearson Edexcel'
  language TEXT NOT NULL DEFAULT 'en',   -- 'en', 'bn'
  country TEXT DEFAULT 'BD',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subjects within a curriculum
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- 'Physics', 'Mathematics', 'Chemistry'
  name_bn TEXT,                          -- 'পদার্থবিজ্ঞান', 'গণিত', 'রসায়ন'
  code TEXT,                             -- 'PHY', 'MATH', 'CHEM' or Cambridge code '9702'
  grade TEXT,                            -- 'Class 9', 'Class 10', 'AS', 'A2'
  total_chapters INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chapters within a subject
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT,
  source_pdf_path TEXT,                  -- path to NCTB/textbook PDF
  generation_status TEXT DEFAULT 'pending', -- pending, generating, complete, failed
  generation_model TEXT,                 -- 'claude-opus-4-6'
  generation_cost_usd DECIMAL(10,4),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated lessons (the "baked" classroom content)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE UNIQUE,

  -- Stage 1: Outline
  outline JSONB NOT NULL,               -- structured lesson plan

  -- Stage 2: Scenes (slides, quizzes, simulations, whiteboard)
  scenes JSONB NOT NULL,                -- array of scene objects

  -- Agent personas for this lesson
  agents JSONB NOT NULL,                -- teacher, TA, classmates with personas

  -- Narration scripts (for TTS pre-generation)
  narration_scripts JSONB,              -- per-scene narration text

  -- Pre-generated audio paths
  audio_paths JSONB,                    -- per-scene MP3 file paths

  -- Bangla translation (if applicable)
  scenes_bn JSONB,                      -- translated scene content
  narration_scripts_bn JSONB,           -- Bangla narration text
  audio_paths_bn JSONB,                 -- Bangla audio file paths

  -- Export cache
  pptx_path TEXT,
  html_path TEXT,

  -- Generation metadata
  model_used TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd DECIMAL(10,4),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID,                          -- Supabase auth user ID
  name TEXT,
  grade TEXT,                            -- 'Class 9', 'Class 10', 'O-Level', etc.
  medium TEXT DEFAULT 'bangla',          -- 'bangla', 'english'
  curriculum_id UUID REFERENCES curricula(id),

  -- Learning profile (built over time from interactions)
  weak_topics TEXT[],                    -- topics where they struggle
  strong_topics TEXT[],                  -- topics they've mastered
  interaction_count INTEGER DEFAULT 0,
  total_quiz_score DECIMAL(5,2),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security on students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own data" ON students
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Students can update own data" ON students
  FOR UPDATE USING (auth_id = auth.uid());

-- Indexes
CREATE INDEX idx_subjects_curriculum ON subjects (curriculum_id);
CREATE INDEX idx_chapters_subject ON chapters (subject_id);
CREATE INDEX idx_chapters_status ON chapters (generation_status);
CREATE INDEX idx_lessons_chapter ON lessons (chapter_id);
