/**
 * Tenant Validation Utilities
 * 
 * Helper functions to validate tenant access and prevent cross-tenant data leaks
 */

/**
 * Validates that a user has access to a specific tenant's resource
 * 
 * @param userTenantId - The tenant ID of the current user
 * @param resourceTenantId - The tenant ID of the resource being accessed
 * @throws Error if tenant IDs don't match
 */
export function validateTenantAccess(
    userTenantId: string | undefined,
    resourceTenantId: string | undefined
): void {
    if (!userTenantId) {
        throw new Error('User tenant ID is missing');
    }

    if (!resourceTenantId) {
        throw new Error('Resource tenant ID is missing');
    }

    if (userTenantId !== resourceTenantId) {
        console.error('Cross-tenant access attempt detected:', {
            userTenantId,
            resourceTenantId
        });
        throw new Error('Unauthorized: Cross-tenant access denied');
    }
}

/**
 * Ensures a tenant ID is provided and valid
 * 
 * @param tenantId - The tenant ID to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated tenant ID
 * @throws Error if tenant ID is missing or invalid
 */
export function ensureTenantId(
    tenantId: string | undefined | null,
    fieldName: string = 'tenantId'
): string {
    if (!tenantId) {
        throw new Error(`${fieldName} is required`);
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
        throw new Error(`Invalid ${fieldName} format`);
    }

    return tenantId;
}

/**
 * Validates that all items in an array belong to the same tenant
 * 
 * @param items - Array of objects with tenant_id property
 * @param expectedTenantId - The expected tenant ID
 * @throws Error if any item has a different tenant ID
 */
export function validateTenantConsistency<T extends { tenant_id?: string }>(
    items: T[],
    expectedTenantId: string
): void {
    const invalidItems = items.filter(
        item => item.tenant_id && item.tenant_id !== expectedTenantId
    );

    if (invalidItems.length > 0) {
        throw new Error(
            `Data integrity error: Found ${invalidItems.length} items with incorrect tenant_id`
        );
    }
}

/**
 * Sanitizes tenant ID for logging (masks part of the UUID)
 * 
 * @param tenantId - The tenant ID to sanitize
 * @returns Partially masked tenant ID for safe logging
 */
export function sanitizeTenantIdForLogging(tenantId: string): string {
    if (!tenantId || tenantId.length < 8) {
        return '****';
    }

    // Show first 8 chars, mask the rest
    return `${tenantId.substring(0, 8)}...`;
}

/**
 * Creates a tenant-scoped error message
 * 
 * @param message - The error message
 * @param tenantId - The tenant ID (will be sanitized)
 * @returns Error message with sanitized tenant info
 */
export function createTenantError(message: string, tenantId?: string): Error {
    const sanitizedId = tenantId ? sanitizeTenantIdForLogging(tenantId) : 'unknown';
    return new Error(`[Tenant: ${sanitizedId}] ${message}`);
}

/**
 * Validates tenant ID matches between user and request
 * Useful for API endpoints
 * 
 * @param userTenantId - Tenant ID from authenticated user
 * @param requestTenantId - Tenant ID from request body/params
 * @throws Error if IDs don't match
 */
export function validateRequestTenant(
    userTenantId: string | undefined,
    requestTenantId: string | undefined
): void {
    const validUserTenantId = ensureTenantId(userTenantId, 'User tenant ID');
    const validRequestTenantId = ensureTenantId(requestTenantId, 'Request tenant ID');

    if (validUserTenantId !== validRequestTenantId) {
        throw new Error(
            'Tenant ID mismatch: Request tenant does not match authenticated user tenant'
        );
    }
}
