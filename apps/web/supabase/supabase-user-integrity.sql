-- ============================================================
-- Meeting Intelligence Platform — User integrity (run AFTER supabase-hardening.sql)
-- Safe to re-run. Run the whole file in the Supabase SQL Editor.
--
-- Deleting a login (e.g. from Authentication → Users) must also delete its profile in
-- public.users. Without this link, the profile is left behind still holding the email,
-- and onboarding that email again fails with:
--   duplicate key value violates unique constraint "users_email_key"
--
-- NOT VALID: enforced for every new row and every future delete, without failing on
-- profiles that are already orphaned. The app re-attaches those when the email is
-- onboarded again (same id, so meetings and tasks are kept).
-- ============================================================

BEGIN;

DO $$
DECLARE
  con RECORD;
BEGIN
  -- Drop whatever foreign key currently sits on public.users.id (if any) …
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.users'::regclass
      AND a.attname = 'id'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', con.conname);
  END LOOP;

  -- … and re-create it so a deleted login takes its profile with it.
  ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
END;
$$;

COMMIT;

-- ------------------------------------------------------------
-- Check: profiles with no login (left over from deleted logins).
-- Re-onboarding one of these emails in the app restores the person with their history.
-- ------------------------------------------------------------
SELECT u.id, u.name, u.email, u.role, u.department
FROM public.users u
LEFT JOIN auth.users a ON a.id = u.id
WHERE a.id IS NULL
ORDER BY u.email;
