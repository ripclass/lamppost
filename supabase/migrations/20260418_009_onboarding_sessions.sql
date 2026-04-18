-- ============================================================
-- Phase A — 009: onboarding_sessions
-- Tracks anonymous visitors through the /try flow before signup.
-- Keyed by a session_token set in an HTTP-only cookie.
-- Cleaned up after 30 days via cron.
-- ============================================================

CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,    -- random opaque token stored in cookie
  curriculum_choice TEXT,                -- 'ssc' | 'hsc' | 'cambridge_olevel' | 'cambridge_alevel'
  subject_choice TEXT,                   -- 'physics' | 'chemistry' | ...
  sample_chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  completed_sample BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  converted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  last_ip_hash TEXT,                     -- sha256 of last-seen IP (for abuse signals)
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- No RLS — access is only via the service_role key from server routes
-- that validate the session_token cookie before reading/writing.
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_onboarding_sessions_token ON onboarding_sessions (session_token);
CREATE INDEX idx_onboarding_sessions_converted ON onboarding_sessions (converted_user_id);
CREATE INDEX idx_onboarding_sessions_created ON onboarding_sessions (created_at);

CREATE TRIGGER onboarding_sessions_set_updated_at
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
