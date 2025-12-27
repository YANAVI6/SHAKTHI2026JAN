/**
 * Tenant Context Management - DEPRECATED
 * 
 * This file is no longer used since RLS is disabled for custom authentication.
 * Tenant isolation is now handled at the application level through query filters.
 * 
 * All functions in this file are no-ops to prevent errors in existing code.
 */

/**
 * No-op function - RLS disabled, using app-level filtering
 */
export async function setTenantContext(tenantId: string): Promise<void> {
    // No-op: RLS is disabled, tenant filtering happens at application level
    console.log(`📝 Tenant ID stored in memory: ${tenantId}`);
}

/**
 * No-op function - RLS disabled, using app-level filtering
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setUserContext(_userId: string): Promise<void> {
    // No-op: RLS is disabled
}

/**
 * No-op function - RLS disabled, using app-level filtering
 */
export async function clearTenantContext(): Promise<void> {
    // No-op: RLS is disabled
}

/**
 * No-op function - RLS disabled, using app-level filtering
 */
export async function getCurrentTenantContext(): Promise<string | null> {
    return null;
}

/**
 * No-op function - RLS disabled, using app-level filtering
 */
export async function validateTenantContext(): Promise<void> {
    // No-op: RLS is disabled, validation happens at application level
}
