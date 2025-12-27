import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { loginSuperAdmin, loginCompanyAdmin } from '../authService';
import { supabase } from '../../lib/supabase';

// Mock the supabase client module
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(),
        }))
    }
}));

// Mock password utils
vi.mock('../../utils/passwordUtils', () => ({
    comparePassword: vi.fn().mockResolvedValue(true)
}));

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loginSuperAdmin', () => {
        it('should return user data on successful login', async () => {
            const mockUser = { id: 'user-123', username: 'admin' };
            const mockSecureData = { id: 'user-123', username: 'admin', password_hash: 'hashed' };

            // Mock DB response
            const mockMaybeSingle = vi.fn().mockResolvedValue({
                data: mockSecureData,
                error: null
            });

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: mockMaybeSingle
            }));

            const result = await loginSuperAdmin({ username: 'admin', password: 'password' });

            expect(result).toEqual(mockUser);
        });

        it('should throw error when user not found', async () => {
            // Mock DB response empty
            const mockMaybeSingle = vi.fn().mockResolvedValue({
                data: null,
                error: null
            });

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: mockMaybeSingle
            }));

            await expect(loginSuperAdmin({ username: 'admin', password: 'password' }))
                .rejects.toThrow('Invalid username or password');
        });
    });

    describe('loginCompanyAdmin', () => {
        const mockCredentials = { username: 'EMP001', password: 'password123' };

        it('should login successfully as Company Admin', async () => {
            const mockAdmin = {
                id: 'admin-123',
                employee_id: 'EMP001',
                email: 'admin@test.com',
                name: 'Test Admin',
                password_hash: 'hashed_password',
                tenant_id: 'tenant-1'
            };

            // Mock Tenant Check (Optional)
            // Mock Company Admin Query
            const mockMaybeSingleAdmin = vi.fn().mockResolvedValue({
                data: mockAdmin,
                error: null
            });

            // We need to manage the chain for company admin query
            // loginCompanyAdmin checks table COMPANY_ADMIN_TABLE first
            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'company_admins') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: mockMaybeSingleAdmin
                    };
                }
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                };
            });

            const result = await loginCompanyAdmin(mockCredentials);

            expect(result).toEqual({
                id: 'admin-123',
                username: 'EMP001',
                email: 'admin@test.com',
                name: 'Test Admin',
                tenantId: 'tenant-1',
                role: 'CompanyAdmin'
            });
            expect(mockMaybeSingleAdmin).toHaveBeenCalled();
        });

        it('should login successfully as Employee', async () => {
            // Mock Admin not found
            const mockMaybeSingleAdmin = vi.fn().mockResolvedValue({ data: null, error: null });

            // Mock Employee found
            const mockEmployee = {
                id: 'emp-123',
                emp_id: 'EMP001',
                name: 'Test Employee',
                mobile: '9999999999',
                password_hash: 'hashed_password',
                role: 'Telecaller',
                tenant_id: 'tenant-1',
                team_id: 'team-1',
                status: 'active'
            };

            const mockMaybeSingleEmployee = vi.fn().mockResolvedValue({
                data: mockEmployee,
                error: null
            });

            // Mock Activity Tracking (Insert/Update)
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockReturnThis();

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'company_admins') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: mockMaybeSingleAdmin
                    };
                }
                if (table === 'employees') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: mockMaybeSingleEmployee
                    };
                }
                if (table === 'user_activity') {
                    return {
                        update: mockUpdate,
                        insert: mockInsert,
                        eq: vi.fn().mockReturnThis(),
                        is: vi.fn().mockReturnThis()
                    };
                }
                return { select: vi.fn().mockReturnThis() };
            });

            const result = await loginCompanyAdmin(mockCredentials);

            expect(result).toEqual({
                id: 'emp-123',
                username: 'EMP001',
                email: '9999999999',
                name: 'Test Employee',
                tenantId: 'tenant-1',
                role: 'Telecaller',
                teamId: 'team-1'
            });
        });

        it('should throw error if account is inactive', async () => {
            const mockEmployee = {
                id: 'emp-123',
                emp_id: 'EMP001',
                password_hash: 'hashed_password',
                status: 'inactive'
            };

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'company_admins') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
                if (table === 'employees') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: mockEmployee }) };
                return { select: vi.fn().mockReturnThis() };
            });

            await expect(loginCompanyAdmin(mockCredentials))
                .rejects.toThrow('Your account is inactive');
        });

        it('should throw error for invalid credentials (user not found)', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            }));

            await expect(loginCompanyAdmin(mockCredentials))
                .rejects.toThrow('Invalid credentials');
        });
    });
});
