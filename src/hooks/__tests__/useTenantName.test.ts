import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTenantName } from '../useTenantName';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
        }))
    }
}));

describe('useTenantName', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and return tenant name', async () => {
        (supabase.from as unknown as Mock).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: 'Tenant A' }, error: null })
        }));

        const { result } = renderHook(() => useTenantName('t1'));

        expect(result.current.loading).toBe(true);

        await vi.waitFor(() => {
            expect(result.current.tenantName).toBe('Tenant A');
            expect(result.current.loading).toBe(false);
        });
    });

    it('should handle error and return empty string', async () => {
        (supabase.from as unknown as Mock).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
        }));

        const { result } = renderHook(() => useTenantName('t1'));

        await vi.waitFor(() => {
            expect(result.current.tenantName).toBe('');
            expect(result.current.loading).toBe(false);
        });
    });
});
