import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmployees } from '../useEmployees';
import { employeeService } from '../../services/employeeService';

// Mock employee service
vi.mock('../../services/employeeService', () => ({
    employeeService: {
        getEmployees: vi.fn(),
        createEmployee: vi.fn(),
        updateEmployee: vi.fn(),
        deleteEmployee: vi.fn(),
        bulkDeleteEmployees: vi.fn(),
        resetEmployeePassword: vi.fn(),
        toggleEmployeeStatus: vi.fn()
    }
}));

describe('useEmployees', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should load employees and update state', async () => {
        const mockEmployees = [{ id: '1', name: 'Emp 1' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(employeeService.getEmployees).mockResolvedValue(mockEmployees as any);

        const { result } = renderHook(() => useEmployees());

        await act(async () => {
            await result.current.loadEmployees('t1');
        });

        expect(result.current.employees).toEqual(mockEmployees);
        expect(result.current.isLoading).toBe(false);
    });

    it('should handle creation and reload', async () => {
        const { result } = renderHook(() => useEmployees());

        await act(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await result.current.createEmployee('t1', 'admin', { name: 'New' } as any);
        });

        expect(employeeService.createEmployee).toHaveBeenCalled();
        expect(employeeService.getEmployees).toHaveBeenCalled();
    });

    it('should delete employee and update state locally', async () => {
        const mockEmployees = [{ id: '1', name: 'Emp 1' }, { id: '2', name: 'Emp 2' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(employeeService.getEmployees).mockResolvedValue(mockEmployees as any);

        const { result } = renderHook(() => useEmployees());

        await act(async () => {
            await result.current.loadEmployees('t1');
        });

        await act(async () => {
            await result.current.deleteEmployee('1');
        });

        expect(employeeService.deleteEmployee).toHaveBeenCalledWith('1');
        expect(result.current.employees).toHaveLength(1);
        expect(result.current.employees[0].id).toBe('2');
    });

    it('should toggle employee status', async () => {
        const mockEmployees = [{ id: '1', name: 'Emp 1', status: 'active' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(employeeService.getEmployees).mockResolvedValue(mockEmployees as any);

        const { result } = renderHook(() => useEmployees());

        await act(async () => {
            await result.current.loadEmployees('t1');
        });

        await act(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await result.current.toggleEmployeeStatus(mockEmployees[0] as any);
        });

        expect(employeeService.toggleEmployeeStatus).toHaveBeenCalledWith('1', 'active');
        expect(result.current.employees[0].status).toBe('inactive');
    });
});
