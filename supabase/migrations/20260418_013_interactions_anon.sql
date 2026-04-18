-- ============================================================
-- Phase A — 013: student_interactions anonymous support
-- Adds anonymous_session_id so sample-chapter interactions can be
-- logged before signup. OTP completion stamps student_id and clears
-- anonymous_session_id in a single transaction.
-- ============================================================

ALTER TABLE student_interactions
  ADD COLUMN IF NOT EXISTS anonymous_session_id UUID
    REFERENCES onboarding_sessions(id) ON DELETE SET NULL;

-- Exactly one of student_id / anonymous_session_id must be set
ALTER TABLE student_interactions
  ADD CONSTRAINT interactions_one_owner_set CHECK (
    (student_id IS NOT NULL AND anonymous_session_id IS NULL)
    OR (student_id IS NULL AND anonymous_session_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_interactions_anon_session
  ON student_interactions (anonymous_session_id);

-- Replace the old RLS policy (which assumed students.auth_id existed)
DROP POLICY IF EXISTS "Students can read own interactions" ON student_interactions;

CREATE POLICY "interactions_read_own" ON student_interactions
  FOR SELECT USING (
    student_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );
