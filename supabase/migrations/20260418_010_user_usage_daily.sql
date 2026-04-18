-- ============================================================
-- Phase A — 010: user_usage_daily (dual-key rate limiter)
-- Tracks daily interaction counts for both authenticated users and
-- anonymous onboarding sessions. Exactly one key is set per row.
-- ============================================================

CREATE TABLE user_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authenticated key (mutually exclusive with anonymous key)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Anonymous key (mutually exclusive with user_id)
  anonymous_session_token TEXT,
  ip_hash TEXT,

  date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Dhaka')::date,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one of user_id or anonymous_session_token must be set
  CONSTRAINT usage_one_key_set CHECK (
    (user_id IS NOT NULL AND anonymous_session_token IS NULL)
    OR (user_id IS NULL AND anonymous_session_token IS NOT NULL)
  ),

  -- Compound uniqueness per day
  CONSTRAINT usage_user_daily_unique UNIQUE (user_id, date),
  CONSTRAINT usage_anon_daily_unique UNIQUE (anonymous_session_token, date)
);

-- No RLS — writes only come from the server-side interaction handler
ALTER TABLE user_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_usage_daily_user ON user_usage_daily (user_id, date);
CREATE INDEX idx_usage_daily_anon ON user_usage_daily (anonymous_session_token, date);
CREATE INDEX idx_usage_daily_date ON user_usage_daily (date);
