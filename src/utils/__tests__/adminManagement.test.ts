/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
    getAdminsByTenantId,
    createAdmin,
    toggleAdminStatus
} from '../adminManagement';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            selectReturnThis: vi.fn().mockReturnThis()
        }))
    }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_pass')
    }
}));

describe('adminManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAdminsByTenantId', () => {
        it('should fetch admins and map fields', async () => {
            const mockData = [{
                id: '1',
                tenant_id: 't1',
                name: 'Admin',
                employee_id: 'E1',
                email: 'a@a.com',
                status: 'active',
                role: 'CompanyAdmin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }];

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockData, error: null })
            }));

            const result = await getAdminsByTenantId('t1');
            expect(result).toHaveLength(1);
            expect(result[0].tenantId).toBe('t1');
            expect(result[0].name).toBe('Admin');
        });
    });

    describe('createAdmin', () => {
        it('should hash password and insert admin', async () => {
            const mockAdmin = {
                id: '1',
                tenant_id: 't1',
                name: 'New',
                employee_id: 'E2',
                email: 'b@b.com',
                status: 'active',
                role: 'CompanyAdmin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockAdmin, error: null })
            }));

            const result = await createAdmin('t1', {
                name: 'New',
                employeeId: 'E2',
                email: 'b@b.com',
                password: 'pass'
            });

            expect(bcrypt.hash).toHaveBeenCalled();
            expect(result.name).toBe('New');
        });
    });

    describe('toggleAdminStatus', () => {
        it('should toggle from active to inactive', async () => {
            const mockAdmin = { id: '1', status: 'active' };

            // First call to getAdminById
            vi.mocked(supabase.from).mockImplementationOnce(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockAdmin, tenant_id: 't1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, error: null })
            }) as unknown as any);

            // Second call to update
            vi.mocked(supabase.from).mockImplementationOnce(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { ...mockAdmin, status: 'inactive', tenant_id: 't1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, error: null })
            }) as unknown as any);

            const result = await toggleAdminStatus('1');
            expect(result.status).toBe('inactive');
        });
    });
});
