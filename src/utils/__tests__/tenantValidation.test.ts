import { describe, it, expect } from 'vitest';
import {
    validateTenantAccess,
    ensureTenantId,
    validateTenantConsistency,
    sanitizeTenantIdForLogging,
    validateRequestTenant
} from '../tenantValidation';

describe('tenantValidation', () => {
    describe('validateTenantAccess', () => {
        it('should validate matching tenant IDs', () => {
            expect(() => validateTenantAccess('t-1', 't-1')).not.toThrow();
        });

        it('should throw if tenant IDs mismatch', () => {
            expect(() => validateTenantAccess('t-1', 't-2')).toThrow('Unauthorized');
        });

        it('should throw if IDs missing', () => {
            expect(() => validateTenantAccess(undefined, 't-2')).toThrow('User tenant ID is missing');
        });
    });

    describe('ensureTenantId', () => {
        it('should return valid tenant id', () => {
            const validUuid = '12345678-1234-1234-1234-1234567890ab';
            expect(ensureTenantId(validUuid)).toBe(validUuid);
        });

        it('should throw on invalid format', () => {
            expect(() => ensureTenantId('invalid-uuid')).toThrow('Invalid tenantId format');
        });
    });

    describe('validateTenantConsistency', () => {
        it('should pass for consistent items', () => {
            const items = [{ tenant_id: 't-1' }, { tenant_id: 't-1' }];
            expect(() => validateTenantConsistency(items, 't-1')).not.toThrow();
        });

        it('should throw for inconsistent items', () => {
            const items = [{ tenant_id: 't-1' }, { tenant_id: 't-2' }];
            expect(() => validateTenantConsistency(items, 't-1')).toThrow('Data integrity error');
        });
    });

    describe('sanitizeTenantIdForLogging', () => {
        it('should mask tenant id', () => {
            expect(sanitizeTenantIdForLogging('12345678-1234-1234-1234-1234567890ab')).toBe('12345678...');
        });
    });

    describe('validateRequestTenant', () => {
        it('should pass matching request tenant', () => {
            const uuid = '12345678-1234-1234-1234-1234567890ab';
            expect(() => validateRequestTenant(uuid, uuid)).not.toThrow();
        });
    });
});
