import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AlertService } from '../alertService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

describe('AlertService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAlerts', () => {
        it('should classify time-sensitive alerts correctly', async () => {
            const userId = 'user-1';
            const now = new Date();
            const overdue = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
            const upcoming = new Date(now.getTime() + 1000 * 60 * 15); // 15 mins from now

            const ptpData = [
                {
                    id: 'ptp-1',
                    ptp_datetime: overdue.toISOString(),
                    customer_cases: { id: 'case-1', customer_name: 'OverduePTP' }
                }
            ];
            const callbackData = [
                {
                    id: 'cb-1',
                    callback_datetime: upcoming.toISOString(),
                    customer_cases: { id: 'case-2', customer_name: 'UpcomingCB' }
                }
            ];

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                const builder: Record<string, unknown> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis()
                };

                (builder as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve: (v: unknown) => void) => {
                    let data: unknown[] = [];
                    // Simple heuristic to differentiate calls:
                    // PTP query uses 'or' for call_status
                    // Callback query uses 'eq' for call_status=CALL_BACK
                    // We can check which mocks were called if we used spies, but inside here we rely on order or loose matching.
                    // Or simpler: Return superset? 
                    // No, implementation separates PTPs and Callbacks into different vars.
                    // If we return same array, keys might conflict (ptp_datetime vs callback_datetime).

                    // Let's rely on sequential calls if we can, or just mock resolved value once.
                    // But mockImplementation receives the table. Both use 'case_call_logs'.
                    // We can differentiate by some other property?
                    // Actually, the service awaits them sequentially.
                    // 1. PTPs
                    // 2. Callbacks
                    // 3. Viewed Logs ('viewed_case_logs')

                    if (table === 'viewed_case_logs') {
                        data = [];
                    } else if (table === 'case_call_logs') {
                        // This is tricky. Let's try to return data that matches both shapes appropriately, 
                        // or use a counter if we want strict sequencing.
                        // But for robustness, let's just make the return have both fields filled for test items 
                        // so it works regardless of which array it falls into, OR rely on `ptp_datetime` vs `callback_datetime` presence.

                        // BUT the service logic:
                        // (ptps as PtpData[]).forEach... checks ptp.ptp_datetime
                        // (callbacks as Callback[]).forEach... checks cb.callback_datetime

                        // So we can return a list containing BOTH types of objects.
                        data = [...ptpData, ...callbackData];
                    }

                    resolve({ data, error: null });
                };
                return builder;
            });

            const result = await AlertService.getAlerts(userId, 'team-1');

            expect(result.cases.length).toBeGreaterThan(0);

            // Check for RED status (overdue PTP)
            const redAlert = result.cases.find(c => c.customer_name === 'OverduePTP');
            expect(redAlert).toBeDefined();
            expect(redAlert?.status).toBe('RED');

            // Check for YELLOW status (upcoming Callback)
            const yellowAlert = result.cases.find(c => c.customer_name === 'UpcomingCB');
            expect(yellowAlert).toBeDefined();
            expect(yellowAlert?.status).toBe('YELLOW');

            expect(result.status).toBe('RED'); // Overall status matches worst case
        });
    });

    describe('markAsViewed', () => {
        it('should upsert viewed log', async () => {
            const mockUpsert = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                upsert: mockUpsert,
                then: (resolve: (v: unknown) => void) => resolve({ error: null })
            }));

            await AlertService.markAsViewed('case-1', 'user-1');
            expect(mockUpsert).toHaveBeenCalled();
        });
    });
});
