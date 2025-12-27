import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { customerCaseService } from '../customerCaseService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis()
        }))
    }
}));

describe('customerCaseService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCasesByEmployee', () => {
        it('should return cases for an employee', async () => {
            const mockCases = [{ id: 'case-1', assigned_employee_id: 'emp-1' }];
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockCases, error: null })
            }));

            const result = await customerCaseService.getCasesByEmployee('tenant-1', 'emp-1');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('case-1');
        });

        it('should throw error on fetch failure', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
            }));

            await expect(customerCaseService.getCasesByEmployee('tenant-1', 'emp-1'))
                .rejects.toThrow('Failed to fetch customer cases');
        });
    });

    describe('getCaseById', () => {
        it('should return a single case', async () => {
            const mockCase = { id: 'case-1', customer_name: 'John Doe' };
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockCase, error: null })
            }));

            const result = await customerCaseService.getCaseById('case-1');
            expect(result.customer_name).toBe('John Doe');
        });

        it('should throw error if case not found', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            }));

            await expect(customerCaseService.getCaseById('case-1'))
                .rejects.toThrow('Failed to fetch case');
        });
    });

    describe('createCase', () => {
        it('should create a case successfully', async () => {
            const newCase = { tenant_id: 'tenant-1', customer_name: 'Jane Doe', loan_id: 'L123' };
            const createdCase = { id: 'case-2', ...newCase };

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: createdCase, error: null })
            }));

            const result = await customerCaseService.createCase(newCase);
            expect(result.id).toBe('case-2');
            expect(result.customer_name).toBe('Jane Doe');
        });
    });

    describe('updateCase', () => {
        it('should update a case successfully', async () => {
            const updates = { status: 'in_progress' as const };
            const updatedCase = { id: 'case-1', status: 'in_progress' };

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: updatedCase, error: null })
            }));

            const result = await customerCaseService.updateCase('case-1', updates);
            expect(result.status).toBe('in_progress');
        });
    });

    describe('deleteCase (Soft Delete)', () => {
        it('should soft delete a case', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: mockUpdate,
                eq: vi.fn().mockResolvedValue({ error: null })
            }));

            await customerCaseService.deleteCase('case-1');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                case_status: 'deleted'
            }));
        });
    });

    describe('permanentlyDeleteCase', () => {
        it('should delete case and related logs', async () => {
            const mockDelete = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                delete: mockDelete,
                eq: vi.fn().mockResolvedValue({ error: null })
            }));

            await customerCaseService.permanentlyDeleteCase('case-1');
            // Called twice: once for logs, once for case
            expect(mockDelete).toHaveBeenCalledTimes(2);
        });
    });

    describe('getTeamCases', () => {
        it('should return enriched team cases', async () => {
            const mockCases = [{
                id: 'case-1',
                case_call_logs: [{ call_status: 'Connected', created_at: new Date().toISOString() }]
            }];

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'employees') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) };

                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    neq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    range: vi.fn().mockResolvedValue({ data: mockCases, error: null })
                };
            });

            const result = await customerCaseService.getTeamCases('tenant-1', 'team-1');
            expect(result).toHaveLength(1);
            expect(result[0].latest_call_status).toBe('Connected');
        });
    });
});
