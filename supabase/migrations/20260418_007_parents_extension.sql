-- ============================================================
-- Phase A — 007: parents extension
-- 1:1 extension of users for role='parent'.
-- Replaces the originally spec'd parent_links table.
-- ============================================================

CREATE TABLE parents (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_preferences JSONB DEFAULT '{"weekly_summary": true, "achievement_alerts": true, "payment_alerts": true}'::jsonb,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Join table: a parent can watch multiple students; a student can be
-- watched by multiple parents (e.g. both guardians).
CREATE TABLE parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT,                     -- 'mother' | 'father' | 'guardian' | null
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- RLS
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_read_own" ON parents
  FOR SELECT USING (id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "parents_update_own" ON parents
  FOR UPDATE USING (id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "parent_links_read_own" ON parent_student_links
  FOR SELECT USING (
    parent_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR student_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE TRIGGER parents_set_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_parent_student_links_parent ON parent_student_links (parent_id);
CREATE INDEX idx_parent_student_links_student ON parent_student_links (student_id);
