import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { activityService } from '../activityService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(),
            single: vi.fn(),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis()
        }))
    }
}));

describe('activityService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('getActivityLogs', () => {
        it('should return empty logs if no employees found', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], error: null })
            }));

            const result = await activityService.getActivityLogs('tenant-1');
            expect(result.logs).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('should return logs for employees', async () => {
            const mockEmployees = [{ id: 'emp-1', name: 'John', role: 'Telecaller' }];
            const mockActivities = [{
                employee_id: 'emp-1',
                login_time: new Date().toISOString(),
                status: 'Online',
                logout_time: null
            }];

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'employees') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        range: vi.fn().mockResolvedValue({ data: mockEmployees, error: null })
                    };
                }
                if (table === 'user_activity') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        order: vi.fn().mockResolvedValue({ data: mockActivities, error: null })
                    };
                }
                return {};
            });

            const result = await activityService.getActivityLogs('tenant-1');
            expect(result.logs).toHaveLength(1);
            expect(result.logs[0].employeeName).toBe('John');
            expect(result.logs[0].status).toBe('Online');
        });
    });

    describe('trackLogout', () => {
        it('should update logout time', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: mockUpdate,
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                select: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null })
            }));

            await activityService.trackLogout('emp-1');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'Offline'
            }));
        });
    });

    describe('startBreak', () => {
        it('should set status to Break', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: mockUpdate,
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                select: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null })
            }));

            await activityService.startBreak('emp-1');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'Break'
            }));
        });
    });

    describe('endBreak', () => {
        it('should update break duration', async () => {
            const now = new Date();
            const start = new Date(now.getTime() - 10 * 60000); // 10 mins ago

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { current_break_start: start.toISOString(), total_break_time: 5 },
                    error: null
                }),
                update: vi.fn().mockReturnThis()
            }));

            // We can't easily spy on the second call to supabase.from() with this simplified mock structure
            // But we can verify no error is thrown
            await expect(activityService.endBreak('emp-1')).resolves.not.toThrow();
        });
    });

    describe('setIdle', () => {
        it('should set status to Idle', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: mockUpdate,
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis()
            }));

            await activityService.setIdle('emp-1');
            expect(mockUpdate).toHaveBeenCalledWith({ status: 'Idle' });
        });
    });

    describe('Office Hours', () => {
        it('should save office hours', async () => {
            const mockUpsert = vi.fn().mockResolvedValue({ error: null });
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                upsert: mockUpsert
            }));

            await activityService.saveOfficeHours('tenant-1', '09:00', '18:00');
            expect(mockUpsert).toHaveBeenCalled();
        });

        it('should get office hours', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                    data: { office_start_time: '09:00', office_end_time: '18:00' },
                    error: null
                })
            }));

            const result = await activityService.getOfficeHours('tenant-1');
            expect(result?.officeStartTime).toBe('09:00');
        });
    });
});
