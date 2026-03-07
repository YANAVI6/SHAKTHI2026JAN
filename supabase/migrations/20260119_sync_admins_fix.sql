-- Sync missing Company Admins to Employees table to fix FK errors
-- Error 23503: Key is not present in table "employees".

BEGIN;

-- 1. Insert missing admins
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
  ca.employee_id, -- Use employee_id as temporary mobile if missing
  ca.email,
  NOW(),
  NOW()
FROM public.company_admins ca
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e WHERE e.id = ca.id
);

-- 2. Ensure trigger is active (in case it was disabled)
DROP TRIGGER IF EXISTS on_company_admin_created ON public.company_admins;
-- Re-create the function just to be safe it's latest version
CREATE OR REPLACE FUNCTION public.sync_company_admin_to_employee()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employees (
    id, tenant_id, name, emp_id, role, status, password_hash, mobile, email, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.tenant_id,
    NEW.name,
    NEW.employee_id,
    'CompanyAdmin',
    'active',
    NEW.password_hash,
    NEW.employee_id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_company_admin_created
  AFTER INSERT ON public.company_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_company_admin_to_employee();

COMMIT;
