-- ============================================================
-- Meeting Intelligence Platform — Supabase RLS Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. USERS TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF')),
  department  TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'STAFF'),
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        role = EXCLUDED.role,
        department = EXCLUDED.department;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. MEETINGS TABLE
CREATE TABLE IF NOT EXISTS public.meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  meeting_type    TEXT NOT NULL DEFAULT 'INTERNAL',
  status          TEXT NOT NULL DEFAULT 'SCHEDULED',
  meeting_date    TIMESTAMPTZ DEFAULT NOW(),
  audio_url       TEXT,
  audio_duration  INTEGER,
  transcript      TEXT,
  summary         TEXT,
  department      TEXT,
  created_by_id   UUID NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEETING PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id),
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'INTERNAL',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACTION ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.action_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id            UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  assignee_id           UUID REFERENCES public.users(id),
  assignee_email        TEXT,
  due_date              TIMESTAMPTZ NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'MEDIUM',
  status                TEXT NOT NULL DEFAULT 'PENDING',
  ai_guidance           TEXT,
  reminder_count        INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PROOF SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.proof_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id  UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  submitted_by_id UUID NOT NULL REFERENCES public.users(id),
  notes           TEXT NOT NULL,
  file_url        TEXT,
  file_name       TEXT,
  file_type       TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING',
  review_notes    TEXT,
  reviewed_by_id  UUID REFERENCES public.users(id),
  reviewed_at     TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id  UUID REFERENCES public.action_items(id) ON DELETE CASCADE,
  meeting_id      UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  details         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_department()
RETURNS TEXT AS $$
  SELECT department FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = p_meeting_id
    AND (user_id = auth.uid() OR email = (SELECT email FROM public.users WHERE id = auth.uid()))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES: USERS
-- ============================================================
CREATE POLICY "Users can read dept members"
  ON public.users FOR SELECT
  USING (department = get_my_department() OR get_my_role() = 'ADMIN');

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Service role full access"
  ON public.users FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- RLS POLICIES: MEETINGS
-- EXTERNAL = all dept members see it
-- INTERNAL = only invited participants + dept managers
-- ============================================================
CREATE POLICY "Meeting visibility"
  ON public.meetings FOR SELECT
  USING (
    get_my_role() = 'ADMIN'
    OR (get_my_role() = 'MANAGER' AND department = get_my_department())
    OR (meeting_type = 'EXTERNAL' AND department = get_my_department())
    OR (meeting_type = 'INTERNAL' AND is_meeting_participant(id))
    OR created_by_id = auth.uid()
  );

CREATE POLICY "Any authenticated user can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators and managers can update meetings"
  ON public.meetings FOR UPDATE
  USING (
    created_by_id = auth.uid()
    OR get_my_role() IN ('ADMIN', 'MANAGER')
  );

-- ============================================================
-- RLS POLICIES: PARTICIPANTS
-- ============================================================
CREATE POLICY "Participants visible with meeting access"
  ON public.meeting_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m WHERE m.id = meeting_id
      AND (
        get_my_role() = 'ADMIN'
        OR (get_my_role() = 'MANAGER' AND m.department = get_my_department())
        OR (m.meeting_type = 'EXTERNAL' AND m.department = get_my_department())
        OR (m.meeting_type = 'INTERNAL' AND is_meeting_participant(meeting_id))
        OR m.created_by_id = auth.uid()
      )
    )
  );

CREATE POLICY "Meeting creators can add participants"
  ON public.meeting_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS POLICIES: ACTION ITEMS
-- ============================================================
CREATE POLICY "Action items: assignee and managers"
  ON public.action_items FOR SELECT
  USING (
    get_my_role() = 'ADMIN'
    OR assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meetings m WHERE m.id = meeting_id
      AND (
        (get_my_role() = 'MANAGER' AND m.department = get_my_department())
        OR m.created_by_id = auth.uid()
      )
    )
  );

CREATE POLICY "Action items insert"
  ON public.action_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Assignees and managers update"
  ON public.action_items FOR UPDATE
  USING (assignee_id = auth.uid() OR get_my_role() IN ('ADMIN', 'MANAGER'));

-- ============================================================
-- RLS POLICIES: PROOF SUBMISSIONS
-- ============================================================
CREATE POLICY "Proof: submitters and managers"
  ON public.proof_submissions FOR SELECT
  USING (submitted_by_id = auth.uid() OR get_my_role() IN ('ADMIN', 'MANAGER'));

CREATE POLICY "Proof insert by assignee"
  ON public.proof_submissions FOR INSERT WITH CHECK (submitted_by_id = auth.uid());

CREATE POLICY "Managers review proofs"
  ON public.proof_submissions FOR UPDATE
  USING (get_my_role() IN ('ADMIN', 'MANAGER') OR submitted_by_id = auth.uid());

-- ============================================================
-- RLS POLICIES: AUDIT LOGS
-- ============================================================
CREATE POLICY "Audit visible to managers"
  ON public.audit_logs FOR SELECT
  USING (actor_id = auth.uid() OR get_my_role() IN ('ADMIN', 'MANAGER'));

CREATE POLICY "Audit insert"
  ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meetings_dept ON public.meetings(department);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON public.meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON public.action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON public.action_items(assignee_id);
