-- ==============================================================================
-- PROJECT MIGRATION: Update Departments to Projects and "Monitoring" to "Vaccine Financing"
-- ==============================================================================

-- 1. Migrate all users with 'Monitoring' or 'Monitoring & Evaluation' to 'Vaccine Financing'
UPDATE public.users
SET department = 'Vaccine Financing'
WHERE department ILIKE '%monitor%' OR department IS NULL;

-- 2. Migrate all meetings with 'Monitoring' or 'Monitoring & Evaluation' to 'Vaccine Financing'
UPDATE public.meetings
SET department = 'Vaccine Financing'
WHERE department ILIKE '%monitor%' OR department IS NULL;

-- 3. Update any user metadata in auth.users if applicable
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{department}', '"Vaccine Financing"')
WHERE raw_user_meta_data->>'department' ILIKE '%monitor%';

-- 4. Verify the updated users and projects
SELECT id, name, email, role, department FROM public.users ORDER BY department;
