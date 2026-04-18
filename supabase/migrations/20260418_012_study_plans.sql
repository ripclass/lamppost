-- ============================================================
-- Phase A — 012: study_plans
-- Per-student generated weekly plan. Keyed to users.id (one plan per
-- user). Regenerated when exam_date or commitment changes.
-- ============================================================

CREATE TABLE study_plans (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_exam_date DATE,
  daily_minutes_commitment INTEGER
    CHECK (daily_minutes_commitment IS NULL OR daily_minutes_commitment BETWEEN 5 AND 480),

  -- Full schedule as structured JSON:
  -- { "weeks": [ { "start": "2026-04-20", "days": [ { "date": "...",
  --   "chapters": [ { "chapterId": "...", "estimatedMinutes": 30 } ] } ] } ] }
  generated_schedule_json JSONB NOT NULL DEFAULT '{"weeks": []}'::jsonb,

  generation_algorithm_version TEXT DEFAULT 'v1',
  last_regenerated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_plans_read_own" ON study_plans
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE TRIGGER study_plans_set_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
