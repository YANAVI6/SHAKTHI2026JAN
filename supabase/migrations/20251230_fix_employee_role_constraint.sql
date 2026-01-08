-- FIX: Allow 'CompanyAdmin' in employees table and Re-Sync
-- Root Cause: The table 'employees' had a constraint check(role in ('TeamIncharge', 'Telecaller'))
-- preventing 'CompanyAdmin' from being inserted.

-- 1. Update the Constraint to allow CompanyAdmin
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE public.employees ADD CONSTRAINT employees_role_check 
  CHECK (role IN ('TeamIncharge', 'Telecaller', 'CompanyAdmin'));

-- 2. Re-run the Sync (Insert Admin into Employees)
-- Requested Change: Set the visible name to "Company Admin" instead of the person's real name.

INSERT INTO public.employees (
  id,
  tenant_id,
  name,
  emp_id,
  role,
  status,
  password_hash,
  mobile,
  created_at,
  updated_at
)
SELECT
  ca.id,
  ca.tenant_id,
  'Company Admin', -- STATIC NAME REQUESTED BY USER
  ca.employee_id,
  'CompanyAdmin',
  'active',
  ca.password_hash,
  ca.employee_id,
  NOW(),
  NOW()
FROM public.company_admins ca
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.id = ca.id
);

-- If the admin already exists (from a previous failed attempt that maybe partial), 
-- update their name to 'Company Admin' to enforce the static naming.
UPDATE public.employees
SET name = 'Company Admin'
WHERE role = 'CompanyAdmin';
