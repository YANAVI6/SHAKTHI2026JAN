import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { TelecallerTargetService } from '../telecallerTargetService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

describe('TelecallerTargetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('setTarget', () => {
        it('should update existing target', async () => {
            const mockExisting = { id: 'tgt-1' };
            const mockUpdate = vi.fn().mockReturnThis();

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: mockExisting, error: null }),
                update: mockUpdate,
                single: vi.fn().mockResolvedValue({ data: { ...mockExisting, daily_calls_target: 100 }, error: null })
            }));

            const result = await TelecallerTargetService.setTarget('tel-1', {
                daily_calls_target: 100, weekly_calls_target: 500, monthly_calls_target: 2000,
                daily_collections_target: 1000, weekly_collections_target: 5000, monthly_collections_target: 20000
            });

            expect(mockUpdate).toHaveBeenCalled();
            expect(result.daily_calls_target).toBe(100);
        });

        it('should create new target if not exists', async () => {
            const mockInsert = vi.fn().mockReturnThis();

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // does not exist
                insert: mockInsert,
                single: vi.fn().mockResolvedValue({ data: { id: 'tgt-new' }, error: null })
            }));

            await TelecallerTargetService.setTarget('tel-1', {
                daily_calls_target: 100, weekly_calls_target: 500, monthly_calls_target: 2000,
                daily_collections_target: 1000, weekly_collections_target: 5000, monthly_collections_target: 20000
            });

            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe('getPerformanceMetrics', () => {
        it('should calculate metrics from call logs', async () => {
            const now = new Date();
            const mockLogs = [
                { created_at: now.toISOString(), amount_collected: 100 }, // Today
                { created_at: new Date(now.getTime() - 86400000 * 2).toISOString(), amount_collected: 200 } // 2 days ago (in week)
            ];

            (supabase.from as unknown as Mock).mockImplementation(() => {
                const state = { logs: mockLogs, useCount: false };
                const createChain = (s: typeof state) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const chain: any = {
                        select: vi.fn().mockImplementation((_query, options) => {
                            if (options?.count === 'exact') s.useCount = true;
                            return chain;
                        }),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockImplementation((_column, value) => {
                            const date = new Date(value);
                            const dayAgo = new Date();
                            dayAgo.setHours(0, 0, 0, 0);
                            if (date >= dayAgo) {
                                s.logs = [mockLogs[0]];
                            } else {
                                s.logs = mockLogs;
                            }
                            return chain;
                        }),
                        order: vi.fn().mockReturnThis(),
                        range: vi.fn().mockReturnThis(),
                        then: vi.fn().mockImplementation((resolve) => {
                            if (s.useCount) {
                                return resolve({ count: s.logs.length, error: null });
                            }
                            return resolve({ data: s.logs, error: null });
                        }),
                        catch: vi.fn().mockReturnThis()
                    };
                    return chain;
                };
                return createChain(state);
            });

            const metrics = await TelecallerTargetService.getPerformanceMetrics('tel-1');

            expect(metrics.dailyCalls).toBe(1);
            expect(metrics.dailyCollections).toBe(100);
            expect(metrics.weeklyCalls).toBeGreaterThanOrEqual(1); // Depending on day of week
            expect(metrics.monthlyCalls).toBeGreaterThanOrEqual(1);
        });
    });
});
