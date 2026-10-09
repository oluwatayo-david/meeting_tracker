-- ============================================================
-- Meeting Intelligence Platform — Hardening (run AFTER supabase-security-fixes.sql)
-- Safe to re-run. Run the whole file in the Supabase SQL Editor.
--

--   1. Rate limiting (shared across all server instances)
--   2. Atomic writes: replace participants, submit proof, review proof
--   3. Indexes for the queries the app now runs in the database
-- All functions are callable by the service role only (the API server).
-- ============================================================

BEGIN;

-- The proof functions below write audit entries; make sure the table exists
-- (it was missing on databases where supabase-rls-setup.sql was only partly run).
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id  UUID REFERENCES public.action_items(id) ON DELETE CASCADE,
  meeting_id      UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  details         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 1. RATE LIMITING — fixed window counter per key
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER NOT NULL
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;  -- no policies: service role only

-- Returns TRUE if the call is allowed, FALSE if the limit is exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits AS r (key, window_start, count)
  VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.count + 1 END,
        window_start = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds) THEN NOW() ELSE r.window_start END
  RETURNING count INTO v_count;

  -- Opportunistic cleanup of stale keys (cheap, ~1% of calls)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
  END IF;

  RETURN v_count <= p_limit;
END;
$$;

-- ------------------------------------------------------------
-- 2. ATOMIC WRITES
-- ------------------------------------------------------------

-- Replace a meeting's participant list in one transaction.
-- p_participants: [{ "name": "...", "email": "...", "type": "INTERNAL", "user_id": "uuid|null" }]
CREATE OR REPLACE FUNCTION public.replace_meeting_participants(p_meeting_id UUID, p_participants JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.meeting_participants WHERE meeting_id = p_meeting_id;
  INSERT INTO public.meeting_participants (meeting_id, user_id, email, name, type)
  SELECT p_meeting_id,
         NULLIF(p->>'user_id', '')::UUID,
         lower(p->>'email'),
         p->>'name',
         COALESCE(NULLIF(p->>'type', ''), 'INTERNAL')
  FROM jsonb_array_elements(COALESCE(p_participants, '[]'::jsonb)) AS p;
END;
$$;

-- Insert a proof and mark the action item SUBMITTED together.
CREATE OR REPLACE FUNCTION public.submit_proof(
  p_action_item_id UUID, p_submitted_by UUID, p_notes TEXT,
  p_file_url TEXT, p_file_name TEXT, p_file_type TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.proof_submissions (action_item_id, submitted_by_id, notes, file_url, file_name, file_type, status)
  VALUES (p_action_item_id, p_submitted_by, p_notes, p_file_url, p_file_name, p_file_type, 'PENDING');

  UPDATE public.action_items SET status = 'SUBMITTED', updated_at = NOW() WHERE id = p_action_item_id;

  INSERT INTO public.audit_logs (action_item_id, actor_id, action, details)
  VALUES (p_action_item_id, p_submitted_by, 'PROOF_SUBMITTED', LEFT(p_notes, 500));
END;
$$;

-- Review a PENDING proof and update the action item together.
-- Fails (raises) if the proof is not PENDING or does not belong to the item.
CREATE OR REPLACE FUNCTION public.review_proof(
  p_action_item_id UUID, p_proof_id UUID, p_status TEXT, p_review_notes TEXT, p_reviewer UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid review status %', p_status;
  END IF;

  UPDATE public.proof_submissions
  SET status = p_status, review_notes = p_review_notes, reviewed_by_id = p_reviewer, reviewed_at = NOW()
  WHERE id = p_proof_id AND action_item_id = p_action_item_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proof submission is not pending review';
  END IF;

  UPDATE public.action_items SET status = p_status, updated_at = NOW() WHERE id = p_action_item_id;

  INSERT INTO public.audit_logs (action_item_id, actor_id, action, details)
  VALUES (p_action_item_id, p_reviewer, 'PROOF_' || p_status, LEFT(p_review_notes, 500));
END;
$$;

-- Only the API server (service role) may call these
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_meeting_participants(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_proof(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.review_proof(UUID, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_meeting_participants(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_proof(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_proof(UUID, UUID, TEXT, TEXT, UUID) TO service_role;

-- ------------------------------------------------------------
-- 3. INDEXES for database-side filtering
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_meetings_created_by   ON public.meetings(created_by_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date          ON public.meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user      ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_email     ON public.meeting_participants(email);
CREATE INDEX IF NOT EXISTS idx_action_items_email     ON public.action_items(assignee_email);
CREATE INDEX IF NOT EXISTS idx_action_items_status    ON public.action_items(status);
CREATE INDEX IF NOT EXISTS idx_proofs_action_item     ON public.proof_submissions(action_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_item      ON public.audit_logs(action_item_id);

-- Normalise stored emails so exact-match lookups (and the indexes above) work
UPDATE public.meeting_participants SET email = lower(email) WHERE email <> lower(email);
UPDATE public.action_items SET assignee_email = lower(assignee_email) WHERE assignee_email <> lower(assignee_email);

COMMIT;