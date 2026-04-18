-- ============================================================
-- Phase A — 005: users (root profile for all roles)
-- Generic profile table that sits above auth.users.
-- Role extensions (students, parents, admin_profiles) key to users.id.
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'student',
  'parent',
  'super_admin',
  'content_editor',
  'support_agent',
  'finance_viewer',
  'infra_engineer',
  'read_only'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  display_name TEXT,
  phone TEXT,
  email TEXT,
  language_preference TEXT DEFAULT 'bn-BD',  -- 'bn-BD' | 'en-US' | 'zh-CN'
  theme_preference TEXT DEFAULT 'system',    -- 'system' | 'dark' | 'light'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate any existing students into users (preserves IDs so the
-- subsequent students-extension restructure in 006 can reuse them).
INSERT INTO users (id, auth_id, role, display_name, created_at, updated_at)
SELECT id, auth_id, 'student'::user_role, name, created_at, updated_at
FROM students
WHERE auth_id IS NOT NULL;

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- Indexes
CREATE INDEX idx_users_auth_id ON users (auth_id);
CREATE INDEX idx_users_role ON users (role);
CREATE UNIQUE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
