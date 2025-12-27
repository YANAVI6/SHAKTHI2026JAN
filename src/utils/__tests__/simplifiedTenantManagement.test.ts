import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
    getAllTenants,
    updateTenant,
    sanitizeSlug
} from '../simplifiedTenantManagement';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

describe('simplifiedTenantManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sanitizeSlug', () => {
        it('should sanitize strings correctly', () => {
            expect(sanitizeSlug('Test Company')).toBe('testcompany');
            expect(sanitizeSlug('Test-Company!')).toBe('test-company');
            expect(sanitizeSlug('--leading-trailing--')).toBe('leading-trailing');
        });
    });

    describe('getAllTenants', () => {
        it('should fetch and transform tenants', async () => {
            const mockDbTenant = {
                id: '1',
                name: 'Test',
                slug: 'test',
                subdomain: 'test',
                status: 'active',
                created_at: '2023-01-01',
                updated_at: '2023-01-01',
                proprietor_name: 'Owner'
            };

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [mockDbTenant], error: null })
            }));

            const result = await getAllTenants();
            expect(result).toHaveLength(1);
            expect(result[0].proprietorName).toBe('Owner');
            expect(result[0].name).toBe('Test');
        });
    });

    describe('updateTenant', () => {
        it('should map camelCase to snake_case and call update', async () => {
            const mockDbTenant = {
                id: '1',
                name: 'Updated',
                slug: 'test',
                subdomain: 'test',
                status: 'active',
                created_at: '2023-01-01',
                updated_at: '2023-01-01'
            };

            const mockUpdate = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: mockUpdate,
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockDbTenant, error: null })
            }));

            await updateTenant('1', { proprietorName: 'New Owner' } as unknown as { proprietorName: string });

            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                proprietor_name: 'New Owner'
            }));
        });
    });
});
