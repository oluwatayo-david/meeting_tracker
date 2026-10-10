-- ============================================================
-- Meeting Intelligence Platform — Security fixes (run AFTER supabase-rls-setup.sql)
-- Safe to re-run. Run the whole file in the Supabase SQL Editor.
--
-- Fixes:
--   1. Users could promote themselves to ADMIN (profile UPDATE had no column limits)
--   2. Sign-up trusted the role in user metadata (anyone could register as ADMIN)
--   3. INSERT policies only checked "logged in" (join any meeting, forge creator / audit logs)
--   4. Managers could edit / review across every department
--   5. Assignees could set their own action item to APPROVED
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. BASE SCHEMA — makes this file work even if supabase-rls-setup.sql
--    was only partly applied (e.g. audit_logs / helpers / trigger missing)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id  UUID REFERENCES public.action_items(id) ON DELETE CASCADE,
  meeting_id      UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  details         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;

-- Deleting a meeting / action item removes its children in the same statement.
-- Re-creates each parent link with ON DELETE CASCADE whatever it was before.
-- NOT VALID: enforced for all new rows, without failing on any old orphan rows.
DO $$
DECLARE
  link RECORD;
  con  RECORD;
BEGIN
  FOR link IN
    SELECT * FROM (VALUES
      ('meeting_participants', 'meeting_id',     'meetings'),
      ('action_items',         'meeting_id',     'meetings'),
      ('proof_submissions',    'action_item_id', 'action_items')
    ) AS t(child, col, parent)
  LOOP
    FOR con IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'f'
        AND c.conrelid = format('public.%I', link.child)::regclass
        AND a.attname = link.col
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', link.child, con.conname);
    END LOOP;
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE CASCADE NOT VALID',
      link.child, link.child || '_' || link.col || '_fkey', link.col, link.parent
    );
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- Helper functions (pinned search_path for SECURITY DEFINER)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_department()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_meeting_participant(p_meeting_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = p_meeting_id
      AND (user_id = auth.uid() OR lower(email) = lower((SELECT email FROM public.users WHERE id = auth.uid())))
  );
$$;

-- Organiser, admin, or a manager of the meeting's department (mirrors src/lib/authz.ts)
CREATE OR REPLACE FUNCTION public.can_manage_meeting(p_meeting_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = p_meeting_id
      AND (
        public.get_my_role() = 'ADMIN'
        OR m.created_by_id = auth.uid()
        OR (public.get_my_role() = 'MANAGER' AND (m.department IS NULL OR m.department = public.get_my_department()))
      )
  );
$$;

-- ------------------------------------------------------------
-- 1 + 2. Sign-up always creates STAFF; privileged columns are admin-only
-- (Provisioning via the service role sets the real role afterwards.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'STAFF',
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Read access to profiles: yourself, your department, or everyone if ADMIN.
-- (AuthProvider reads the signed-in user's own row directly from the browser.)
DROP POLICY IF EXISTS "Users can read dept members" ON public.users;
CREATE POLICY "Users can read dept members"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR department = public.get_my_department() OR public.get_my_role() = 'ADMIN');

CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- auth.uid() is NULL for the service role and the SQL editor: those are trusted.
  IF auth.uid() IS NOT NULL AND COALESCE(public.get_my_role(), 'STAFF') <> 'ADMIN' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.department IS DISTINCT FROM OLD.department
       OR NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Only administrators can change role, department or email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_privileged_columns ON public.users;
CREATE TRIGGER protect_user_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_privileged_columns();

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- Backfill: meetings created before the fix were saved without a department.
-- Give them the organiser's department so department scoping works.
-- ------------------------------------------------------------
UPDATE public.meetings m
SET department = u.department
FROM public.users u
WHERE m.created_by_id = u.id AND m.department IS NULL AND u.department IS NOT NULL;

-- ------------------------------------------------------------
-- 3 + 4. MEETINGS
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Meeting visibility" ON public.meetings;
CREATE POLICY "Meeting visibility"
  ON public.meetings FOR SELECT
  USING (
    public.can_manage_meeting(id)
    OR (meeting_type = 'EXTERNAL' AND department = public.get_my_department())
    OR public.is_meeting_participant(id)
  );

DROP POLICY IF EXISTS "Any authenticated user can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users create meetings as themselves" ON public.meetings;
CREATE POLICY "Users create meetings as themselves"
  ON public.meetings FOR INSERT
  WITH CHECK (
    created_by_id = auth.uid()
    AND (public.get_my_role() = 'ADMIN' OR department IS NULL OR department = public.get_my_department())
  );

DROP POLICY IF EXISTS "Creators and managers can update meetings" ON public.meetings;
CREATE POLICY "Creators and managers can update meetings"
  ON public.meetings FOR UPDATE
  USING (public.can_manage_meeting(id))
  WITH CHECK (public.get_my_role() = 'ADMIN' OR department IS NULL OR department = public.get_my_department());

DROP POLICY IF EXISTS "Creators and managers can delete meetings" ON public.meetings;
CREATE POLICY "Creators and managers can delete meetings"
  ON public.meetings FOR DELETE
  USING (public.can_manage_meeting(id));

-- ------------------------------------------------------------
-- PARTICIPANTS — only people who manage the meeting can change the guest list
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Participants visible with meeting access" ON public.meeting_participants;
CREATE POLICY "Participants visible with meeting access"
  ON public.meeting_participants FOR SELECT
  USING (
    public.can_manage_meeting(meeting_id)
    OR public.is_meeting_participant(meeting_id)
    OR EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.meeting_type = 'EXTERNAL' AND m.department = public.get_my_department()
    )
  );

DROP POLICY IF EXISTS "Meeting creators can add participants" ON public.meeting_participants;
CREATE POLICY "Meeting creators can add participants"
  ON public.meeting_participants FOR INSERT
  WITH CHECK (public.can_manage_meeting(meeting_id));

DROP POLICY IF EXISTS "Meeting managers can remove participants" ON public.meeting_participants;
CREATE POLICY "Meeting managers can remove participants"
  ON public.meeting_participants FOR DELETE
  USING (public.can_manage_meeting(meeting_id));

-- ------------------------------------------------------------
-- 5. ACTION ITEMS — assignees read; status changes by assignees go through the API
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Action items: assignee and managers" ON public.action_items;
CREATE POLICY "Action items: assignee and managers"
  ON public.action_items FOR SELECT
  USING (
    public.get_my_role() = 'ADMIN'
    OR assignee_id = auth.uid()
    OR public.can_manage_meeting(meeting_id)
  );

DROP POLICY IF EXISTS "Action items insert" ON public.action_items;
CREATE POLICY "Action items insert"
  ON public.action_items FOR INSERT
  WITH CHECK (public.can_manage_meeting(meeting_id));

DROP POLICY IF EXISTS "Assignees and managers update" ON public.action_items;
DROP POLICY IF EXISTS "Meeting managers update action items" ON public.action_items;
CREATE POLICY "Meeting managers update action items"
  ON public.action_items FOR UPDATE
  USING (public.can_manage_meeting(meeting_id))
  WITH CHECK (public.can_manage_meeting(meeting_id));

DROP POLICY IF EXISTS "Meeting managers delete action items" ON public.action_items;
CREATE POLICY "Meeting managers delete action items"
  ON public.action_items FOR DELETE
  USING (public.can_manage_meeting(meeting_id));

-- ------------------------------------------------------------
-- PROOF SUBMISSIONS — submit only for your own item; no self-review
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Proof: submitters and managers" ON public.proof_submissions;
CREATE POLICY "Proof: submitters and managers"
  ON public.proof_submissions FOR SELECT
  USING (
    submitted_by_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.action_items a
      WHERE a.id = action_item_id AND public.can_manage_meeting(a.meeting_id)
    )
  );

DROP POLICY IF EXISTS "Proof insert by assignee" ON public.proof_submissions;
CREATE POLICY "Proof insert by assignee"
  ON public.proof_submissions FOR INSERT
  WITH CHECK (
    submitted_by_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.action_items a WHERE a.id = action_item_id AND a.assignee_id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers review proofs" ON public.proof_submissions;
CREATE POLICY "Managers review proofs"
  ON public.proof_submissions FOR UPDATE
  USING (
    (submitted_by_id <> auth.uid() OR public.get_my_role() = 'ADMIN')
    AND EXISTS (
      SELECT 1 FROM public.action_items a
      WHERE a.id = action_item_id AND public.can_manage_meeting(a.meeting_id)
    )
  )
  WITH CHECK (reviewed_by_id IS NULL OR reviewed_by_id = auth.uid());

-- ------------------------------------------------------------
-- AUDIT LOGS — you can only write entries as yourself
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Audit visible to managers" ON public.audit_logs;
CREATE POLICY "Audit visible to managers"
  ON public.audit_logs FOR SELECT
  USING (
    actor_id = auth.uid()
    OR public.get_my_role() = 'ADMIN'
    OR (meeting_id IS NOT NULL AND public.can_manage_meeting(meeting_id))
  );

DROP POLICY IF EXISTS "Audit insert" ON public.audit_logs;
CREATE POLICY "Audit insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());

COMMIT;

-- ------------------------------------------------------------
-- AFTER RUNNING: check for accounts that may already have self-promoted.
-- Review this list and demote anyone who should not be ADMIN/MANAGER:
--   UPDATE public.users SET role = 'STAFF' WHERE id = '<user-id>';
-- ------------------------------------------------------------
SELECT u.id, u.name, u.email, u.role, u.department, a.created_at, a.raw_user_meta_data->>'role' AS signup_role
FROM public.users u
JOIN auth.users a ON a.id = u.id
WHERE u.role IN ('ADMIN', 'MANAGER')
ORDER BY a.created_at;