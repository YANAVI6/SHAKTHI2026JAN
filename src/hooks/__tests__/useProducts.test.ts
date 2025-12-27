import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProducts } from '../useProducts';
import { columnConfigService } from '../../services/columnConfigService';

// Mock service
vi.mock('../../services/columnConfigService', () => ({
    columnConfigService: {
        getColumnConfigurations: vi.fn(),
        initializeDefaultColumns: vi.fn(),
        deleteProductConfigurations: vi.fn()
    }
}));

describe('useProducts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should load products on mount', async () => {
        const mockConfigs = [{ product_name: 'P1' }, { product_name: 'P2' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValue(mockConfigs as any);

        const { result } = renderHook(() => useProducts('t1'));

        await vi.waitFor(() => {
            expect(result.current.products).toEqual(['P1', 'P2']);
            expect(result.current.selectedProduct).toBe('P1');
        });
        expect(localStorage.getItem('companyProducts')).toContain('P1');
    });

    it('should add product and initialize columns', async () => {
        const mockConfigs = [{ product_name: 'P1' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValue(mockConfigs as any);

        const { result } = renderHook(() => useProducts('t1'));
        await vi.waitFor(() => expect(result.current.products).toHaveLength(1));

        await act(async () => {
            await result.current.addProduct('P2', 't1');
        });

        expect(columnConfigService.initializeDefaultColumns).toHaveBeenCalledWith('t1', 'P2');
        expect(result.current.products).toEqual(['P1', 'P2']);
        expect(result.current.selectedProduct).toBe('P2');
    });

    it('should handle product deletion', async () => {
        const mockConfigs = [{ product_name: 'P1' }, { product_name: 'P2' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValue(mockConfigs as any);

        const { result } = renderHook(() => useProducts('t1'));
        await vi.waitFor(() => expect(result.current.products).toHaveLength(2));

        await act(async () => {
            await result.current.deleteProduct('P1', 't1');
        });

        expect(columnConfigService.deleteProductConfigurations).toHaveBeenCalledWith('t1', 'P1');
        expect(result.current.products).toEqual(['P2']);
        expect(result.current.selectedProduct).toBe('P2');
    });
});
