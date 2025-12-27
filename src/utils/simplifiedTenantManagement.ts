import { supabase } from '../lib/supabase';
import { Tenant as DbTenant, TenantInsert } from '../models/tenant.model';

// UI-friendly interface with camelCase
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  proprietorName?: string;
  phoneNumber?: string;
  address?: string;
  gstNumber?: string;
  plan?: 'basic' | 'standard' | 'premium' | 'enterprise';
  maxUsers?: number;
  maxConnections?: number;
}

// Transform database response (snake_case) to UI format (camelCase)
const transformDbToUi = (dbTenant: DbTenant): Tenant => ({
  id: dbTenant.id,
  name: dbTenant.name,
  slug: dbTenant.slug,
  subdomain: dbTenant.subdomain,
  status: dbTenant.status as 'active' | 'inactive',
  created_at: dbTenant.created_at,
  updated_at: dbTenant.updated_at,
  proprietorName: dbTenant.proprietor_name || undefined,
  phoneNumber: dbTenant.phone_number || undefined,
  address: dbTenant.address || undefined,
  gstNumber: dbTenant.gst_number || undefined,
  plan: dbTenant.plan,
  maxUsers: dbTenant.max_users,
  maxConnections: dbTenant.max_connections,
});

export interface TenantCreateData {
  name: string;
  slug: string;
}

export const getAllTenants = async (): Promise<Tenant[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(transformDbToUi);
};

export const createTenant = async (tenantData: TenantInsert): Promise<Tenant> => {
  const { data, error } = await supabase
    .from('tenants')
    .insert([tenantData])
    .select()
    .single();

  if (error) throw error;
  return transformDbToUi(data);
};

export const updateTenant = async (id: string, tenantData: Partial<Tenant>): Promise<Tenant> => {
  // Remove read-only fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _created, updated_at: _updated, ...updateData } = tenantData;

  // Map camelCase to snake_case for database columns
  const dbData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updateData)) {
    switch (key) {
      case 'proprietorName':
        dbData.proprietor_name = value;
        break;
      case 'phoneNumber':
        dbData.phone_number = value;
        break;
      case 'gstNumber':
        dbData.gst_number = value;
        break;
      case 'maxUsers':
        dbData.max_users = value;
        break;
      case 'maxConnections':
        dbData.max_connections = value;
        break;
      default:
        dbData[key] = value;
    }
  }

  console.log('Mapped DB data for update:', dbData);

  const { data, error } = await supabase
    .from('tenants')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    throw error;
  }
  return transformDbToUi(data);
};

export const deleteTenant = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const checkSlugAvailability = async (slug: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return !data;
};

export const sanitizeSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
};
