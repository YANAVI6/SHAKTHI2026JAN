import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnConfig } from '../useColumnConfig';
import { useCustomColumns } from '../useCustomColumns';
import { columnConfigService } from '../../services/columnConfigService';

// Mock service
vi.mock('../../services/columnConfigService', () => ({
    columnConfigService: {
        getActiveColumnConfigurations: vi.fn(),
        getColumnConfigurations: vi.fn(),
        initializeDefaultColumns: vi.fn(),
        saveColumnConfigurations: vi.fn()
    }
}));

describe('Column Configuration Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useColumnConfig', () => {
        it('should load active configs', async () => {
            const mockConfigs = [{ id: '1', column_name: 'c1' }];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(columnConfigService.getActiveColumnConfigurations).mockResolvedValue(mockConfigs as any);

            const { result } = renderHook(() => useColumnConfig('t1'));

            await vi.waitFor(() => {
                expect(result.current.columnConfigs).toEqual(mockConfigs);
            });
        });
    });

    describe('useCustomColumns', () => {
        it('should load or initialize default columns', async () => {
            // Mock empty config to trigger initialization
            vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValueOnce([]);
            vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValueOnce([
                { id: '1', column_name: 'customerName', display_name: 'Name', is_active: true, is_custom: false }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any);

            const { result } = renderHook(() => useCustomColumns('t1', 'product1'));

            await vi.waitFor(() => {
                expect(columnConfigService.initializeDefaultColumns).toHaveBeenCalled();
                expect(result.current.columns[0].columnName).toBe('customerName');
            });
        });

        it('should toggle column visibility', async () => {
            vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValue([
                { id: '1', column_name: 'c1', display_name: 'C1', is_active: true, is_custom: false }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any);

            const { result } = renderHook(() => useCustomColumns('t1', 'p1'));
            await vi.waitFor(() => expect(result.current.columns).toHaveLength(1));

            act(() => {
                result.current.toggleColumn(0, false);
            });

            expect(result.current.columns[0].isActive).toBe(false);
        });

        it('should add custom columns', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(columnConfigService.getColumnConfigurations).mockResolvedValue([] as any);
            const { result } = renderHook(() => useCustomColumns('t1', 'p1'));

            act(() => {
                result.current.addCustomColumn('new_col', 'New Col');
            });

            expect(result.current.customColumns).toHaveLength(1);
            expect(result.current.customColumns[0].columnName).toBe('new_col');
        });
    });
});
