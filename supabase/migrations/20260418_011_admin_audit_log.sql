-- ============================================================
-- Phase A — 011: admin_audit_log
-- Immutable log of every admin-portal action. Written by server
-- routes inside the admin-portal layout's session guard.
-- ============================================================

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,             -- e.g. 'refund.issue', 'user.disable', 'chapter.publish'
  target_type TEXT,                      -- e.g. 'user', 'chapter', 'invoice'
  target_id UUID,
  diff_json JSONB DEFAULT '{}'::jsonb,   -- before/after snippets for the change
  ip_address INET,
  user_agent TEXT,
  result TEXT DEFAULT 'success',         -- 'success' | 'failure'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit rows are read-only after insert. No UPDATE or DELETE policies.
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to read audit rows (UI surfaces are role-gated at the
-- route level, so this policy just keeps the door shut to non-admins).
CREATE POLICY "admin_audit_read" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('super_admin','content_editor','support_agent','finance_viewer','infra_engineer','read_only')
    )
  );

CREATE INDEX idx_audit_admin ON admin_audit_log (admin_user_id, created_at DESC);
CREATE INDEX idx_audit_target ON admin_audit_log (target_type, target_id);
CREATE INDEX idx_audit_action ON admin_audit_log (action_type, created_at DESC);
CREATE INDEX idx_audit_created ON admin_audit_log (created_at DESC);
