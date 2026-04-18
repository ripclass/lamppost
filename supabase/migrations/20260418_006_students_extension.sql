-- ============================================================
-- Phase A — 006: students restructured as 1:1 extension of users
-- students.id now doubles as FK to users(id).
-- Row exists only when users.role = 'student'.
-- ============================================================

-- Drop old policies (they referenced auth_id directly)
DROP POLICY IF EXISTS "Students can read own data" ON students;
DROP POLICY IF EXISTS "Students can update own data" ON students;

-- Remove columns that moved up to users
ALTER TABLE students DROP COLUMN IF EXISTS auth_id;
ALTER TABLE students DROP COLUMN IF EXISTS name;

-- Link students.id to users.id (1:1). Migration 005 preserved IDs,
-- so this constraint is satisfied for existing rows.
ALTER TABLE students
  ADD CONSTRAINT students_id_fkey
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- Phase A additions: study commitment fields (were in spec migration 010 originally)
ALTER TABLE students ADD COLUMN IF NOT EXISTS target_exam_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS daily_minutes_commitment INTEGER
  CHECK (daily_minutes_commitment IS NULL OR daily_minutes_commitment BETWEEN 5 AND 480);
ALTER TABLE students ADD COLUMN IF NOT EXISTS study_goal TEXT;  -- 'ssc_this_year' | 'ssc_next_year' | 'curious' | 'tutor_assigned'

-- Re-enable RLS through the users join path
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_own" ON students
  FOR SELECT USING (id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "students_update_own" ON students
  FOR UPDATE USING (id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Updated-at trigger
CREATE TRIGGER students_set_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_students_curriculum ON students (curriculum_id);
