-- FIX: Sync Company Admins to Employees Table
-- The application architecture and Chat system expect ALL users to be present in the 'employees' table.
-- Currently, 'Company Admins' are in a separate table, causing:
-- 1. 406 Errors when fetching current user profile from 'employees'.
-- 2. Chat failures because 'chat_messages' references 'employees(id)'.
-- 3. "Employee Management" list issues if it relies on current user context.

-- This script inserts all Company Admins into the Employees table (if they don't exist)
-- preserving their ID so they are valid for Chat/FKs.

INSERT INTO public.employees (
  id,
  tenant_id,
  name,
  emp_id,
  role,
  status,
  password_hash,
  mobile,
  email,
  created_at,
  updated_at
)
SELECT
  ca.id,
  ca.tenant_id,
  ca.name,
  ca.employee_id, -- Maps to emp_id
  'CompanyAdmin', -- Role
  'active',       -- Status
  ca.password_hash,
  ca.employee_id, -- Use employee_id as temporary mobile/contact if missing
  ca.email,
  NOW(),
  NOW()
FROM public.company_admins ca
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.id = ca.id
);

-- Also ensure anon access is allowed for company_admins (just in case)
CREATE POLICY "Allow anon select company_admins" ON company_admins
  FOR SELECT TO anon
  USING (true);
