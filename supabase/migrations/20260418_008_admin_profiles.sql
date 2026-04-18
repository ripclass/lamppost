-- ============================================================
-- Phase A — 008: admin_profiles extension
-- 1:1 extension of users for admin roles.
-- Holds operational fields that don't apply to students or parents.
-- ============================================================

CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  assigned_team TEXT,                    -- 'content' | 'support' | 'finance' | 'infra' | null
  permission_overrides JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS — admins can only read their own profile via RLS; super_admin
-- access to all profiles happens through the service_role key.
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_profiles_read_own" ON admin_profiles
  FOR SELECT USING (id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE TRIGGER admin_profiles_set_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_admin_profiles_team ON admin_profiles (assigned_team);
CREATE INDEX idx_admin_profiles_active ON admin_profiles (is_active);
