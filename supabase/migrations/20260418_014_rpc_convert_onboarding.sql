-- ============================================================
-- Phase A — 014: rpc_convert_onboarding_session
-- Single-transaction conversion from anonymous onboarding session to
-- authenticated student. Called from lib/auth/migrate.ts after OTP.
--
-- Steps inside the transaction:
--   1. Upsert users row (role='student', auth_id = p_auth_id)
--   2. Upsert students extension row (1:1 with users)
--   3. Re-attribute student_interactions rows from anon session -> student
--   4. Mark onboarding_sessions.converted_user_id + converted_at
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_convert_onboarding_session(
  p_auth_id UUID,
  p_onboarding_session_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Upsert users row (root profile)
  INSERT INTO users (auth_id, role, phone, email, display_name)
  VALUES (p_auth_id, 'student', p_phone, p_email, p_display_name)
  ON CONFLICT (auth_id) DO UPDATE
    SET phone = COALESCE(EXCLUDED.phone, users.phone),
        email = COALESCE(EXCLUDED.email, users.email),
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        updated_at = now()
  RETURNING id INTO v_user_id;

  -- 2. Upsert students extension row
  INSERT INTO students (id, metadata)
  VALUES (v_user_id, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Re-attribute anonymous interactions to this student
  UPDATE student_interactions
  SET student_id = v_user_id,
      anonymous_session_id = NULL
  WHERE anonymous_session_id = p_onboarding_session_id;

  -- 4. Mark onboarding session as converted
  UPDATE onboarding_sessions
  SET converted_user_id = v_user_id,
      converted_at = now()
  WHERE id = p_onboarding_session_id;

  RETURN jsonb_build_object('user_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION rpc_convert_onboarding_session(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_convert_onboarding_session(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
