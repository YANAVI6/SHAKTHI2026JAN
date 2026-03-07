docker exec supabase-db psql -U supabase_admin -d postgres -c "SELECT id, employee_id, name, tenant_id FROM company_admins;"
docker exec supabase-db psql -U supabase_admin -d postgres -c "SELECT id, slug, name FROM tenants;"
