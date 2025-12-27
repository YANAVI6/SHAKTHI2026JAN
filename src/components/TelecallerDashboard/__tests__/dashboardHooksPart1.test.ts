import { describe, it, expect, vi, beforeEach } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react';
import {
    useCustomerCases,
    useColumnConfigurations,
    useActivityLog
} from '../hooks';
import { customerCaseService } from '../../../services/customerCaseService';
import { columnConfigService } from '../../../services/columnConfigService';

// Mock services
vi.mock('../../../services/customerCaseService', () => ({
    customerCaseService: {
        getCasesByEmployee: vi.fn()
    }
}));

vi.mock('../../../services/columnConfigService', () => ({
    columnConfigService: {
        getActiveColumnConfigurations: vi.fn()
    }
}));

describe('TelecallerDashboard Hooks - Part 1', () => {
    const mockUser = { id: '1', empId: 'EMP001', tenantId: 't1', name: 'Test' } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useCustomerCases', () => {
        it('should fetch and format cases for employee', async () => {
            const mockServiceCases = [
                { id: 'c1', customer_name: 'John', loan_id: 'L1', dpd: 10 }
            ];
            vi.mocked(customerCaseService.getCasesByEmployee).mockResolvedValue(mockServiceCases as any);

            const { result } = renderHook(() => useCustomerCases(mockUser));

            expect(result.current.isLoading).toBe(true);

            await vi.waitFor(() => {
                expect(result.current.customerCases).toHaveLength(1);
                expect(result.current.customerCases[0].customerName).toBe('John');
                expect(result.current.customerCases[0].tenant_id).toBe('t1');
            });
        });

        it('should handle error', async () => {
            vi.mocked(customerCaseService.getCasesByEmployee).mockRejectedValue(new Error('Fail'));
            const { result } = renderHook(() => useCustomerCases(mockUser));

            await vi.waitFor(() => {
                expect(result.current.error).toBe('Failed to load customer cases');
                expect(result.current.isLoading).toBe(false);
            });
        });
    });

    describe('useColumnConfigurations', () => {
        it('should fetch and format column configs', async () => {
            const mockConfigs = [
                { id: '101', column_name: 'c1', display_name: 'C1', is_active: true }
            ];
            vi.mocked(columnConfigService.getActiveColumnConfigurations).mockResolvedValue(mockConfigs as any);

            const { result } = renderHook(() => useColumnConfigurations(mockUser));

            await vi.waitFor(() => {
                expect(result.current.columnConfigs).toHaveLength(1);
                expect(result.current.columnConfigs[0].columnName).toBe('c1');
                expect(result.current.columnConfigs[0].id).toBe(101);
            });
        });
    });

    describe('useActivityLog', () => {
        it('should initialize with default data and allow adding', () => {
            const { result } = renderHook(() => useActivityLog());

            expect(result.current.activityLog).toHaveLength(5); // Default length

            act(() => {
                result.current.addActivity({
                    type: 'call',
                    time: '12:00',
                    customer: 'New',
                    duration: '1m',
                    result: 'Success',
                    status: 'success'
                });
            });

            expect(result.current.activityLog).toHaveLength(6);
            expect(result.current.activityLog[0].customer).toBe('New');
        });
    });
});
