import { supabase } from '../lib/supabase';
import { comparePassword } from '../utils/passwordUtils';
import { SUPER_ADMIN_TABLE, COMPANY_ADMIN_TABLE, EMPLOYEE_TABLE } from '../models';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  tenantId?: string;
  email?: string;
  name?: string;
  role?: string;
  teamId?: string;
  mobile?: string;
  avatarUrl?: string;
}

export const loginSuperAdmin = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
  const { username, password } = credentials;

  console.log('Attempting login with username:', username);

  const { data, error } = await supabase
    .from(SUPER_ADMIN_TABLE)
    .select('id, username, password_hash')
    .eq('username', username)
    .maybeSingle();

  console.log('Query result:', { data, error });

  if (error) {
    console.error('Database error:', error);
    throw new Error('Authentication failed');
  }

  if (!data) {
    console.log('No user found with username:', username);
    throw new Error('Invalid username or password');
  }

  console.log('Found user, comparing password...');
  const isPasswordValid = await comparePassword(password, data.password_hash);
  console.log('Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  return {
    id: data.id,
    username: data.username
  };
};

export const loginCompanyAdmin = async (credentials: LoginCredentials, tenantSlug?: string): Promise<AuthenticatedUser> => {
  const { username, password } = credentials;

  console.log('Attempting login with identifier:', username);

  let tenantId: string | undefined;

  if (tenantSlug) {
    console.log('Validating against tenant slug:', tenantSlug);
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle();

    if (tenantError || !tenantData) {
      console.error('Tenant not found for slug:', tenantSlug);
      throw new Error('Invalid tenant');
    }

    tenantId = tenantData.id;
  }

  let adminQuery = supabase
    .from(COMPANY_ADMIN_TABLE)
    .select('id, employee_id, name, email, password_hash, tenant_id')
    .eq('employee_id', username);

  if (tenantId) {
    adminQuery = adminQuery.eq('tenant_id', tenantId);
  }

  const { data: adminData, error: adminError } = await adminQuery.maybeSingle();

  console.log('Company admin query result:', { adminData, adminError });

  if (adminError) {
    console.error('Company admin query error:', adminError);
    throw new Error('Authentication failed');
  }

  if (adminData) {
    console.log('Found company admin, validating password...');
    const isPasswordValid = await comparePassword(password, adminData.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid employee ID or password');
    }

    // Password is valid - now track login activity
    console.log('✅ Password valid, tracking login activity for Company Admin:', adminData.employee_id);

    return {
      id: adminData.id,
      username: adminData.employee_id,
      email: adminData.email,
      name: adminData.name || adminData.employee_id,
      tenantId: adminData.tenant_id,
      role: 'CompanyAdmin'
    };
  }

  let employeeQuery = supabase
    .from(EMPLOYEE_TABLE)
    .select('id, name, emp_id, mobile, email, password_hash, role, tenant_id, team_id, status, avatar_url')
    .eq('emp_id', username);

  if (tenantId) {
    employeeQuery = employeeQuery.eq('tenant_id', tenantId);
  }

  const { data: employeeData, error: employeeError } = await employeeQuery.maybeSingle();

  console.log('Employee query result:', { employeeData, employeeError });

  if (employeeError) {
    console.error('Employee query error:', employeeError);
    throw new Error('Authentication failed');
  }

  if (employeeData) {
    if (employeeData.status !== 'active') {
      console.log('❌ Login failed: Account inactive for employee:', employeeData.emp_id);
      throw new Error('Your account is inactive. Please contact your administrator.');
    }

    console.log('Found employee, validating password...');
    const isPasswordValid = await comparePassword(password, employeeData.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Login failed: Invalid password for employee:', employeeData.emp_id);
      throw new Error('Invalid employee ID or password');
    }

    // Password is valid - now track login activity
    console.log('✅ Password valid, tracking login activity for employee:', employeeData.emp_id);

    return {
      id: employeeData.id,
      username: employeeData.emp_id,
      email: employeeData.email,
      mobile: employeeData.mobile,
      name: employeeData.name,
      tenantId: employeeData.tenant_id,
      role: employeeData.role || 'Employee',
      teamId: employeeData.team_id,
      avatarUrl: employeeData.avatar_url
    };
  }

  console.log('No user found with identifier:', username);
  throw new Error('Invalid credentials');
};

