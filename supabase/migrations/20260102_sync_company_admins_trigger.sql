-- 1. Ensure email column exists
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;

-- 2. Create sync function
CREATE OR REPLACE FUNCTION public.sync_company_admin_to_employee_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete any existing employee with the same emp_id but different ID (conflict resolution)
    DELETE FROM public.employees 
    WHERE tenant_id = NEW.tenant_id 
      AND emp_id = NEW.employee_id 
      AND id != NEW.id;

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
    VALUES (
        NEW.id,
        NEW.tenant_id,
        NEW.name,
        NEW.employee_id,
        'CompanyAdmin',
        'active',
        NEW.password_hash,
        NEW.employee_id, -- Use employee_id as temporary mobile if missing
        NEW.email,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        name = EXCLUDED.name,
        emp_id = EXCLUDED.emp_id,
        password_hash = EXCLUDED.password_hash,
        email = EXCLUDED.email,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS sync_company_admin_to_employee_trigger ON public.company_admins;
CREATE TRIGGER sync_company_admin_to_employee_trigger
AFTER INSERT OR UPDATE ON public.company_admins
FOR EACH ROW EXECUTE FUNCTION public.sync_company_admin_to_employee_func();

-- 4. Initial sync for existing admins
-- First, clean up any conflicting employees
DELETE FROM public.employees e
USING public.company_admins ca
WHERE e.tenant_id = ca.tenant_id 
  AND e.emp_id = ca.employee_id 
  AND e.id != ca.id;

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
    ca.employee_id,
    'CompanyAdmin',
    'active',
    ca.password_hash,
    ca.employee_id,
    ca.email,
    ca.created_at,
    ca.updated_at
FROM public.company_admins ca
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    emp_id = EXCLUDED.emp_id,
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
