import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NotificationService } from '../notificationService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

describe('NotificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('getNotifications', () => {
        it('should aggregate notifications from multiple sources', async () => {
            const userId = 'user-1';

            // Mock data for different queries
            const paymentLogs = [{
                id: 'pay-1',
                created_at: new Date().toISOString(),
                amount_collected: 500,
                customer_cases: { customer_name: 'John' }
            }];
            const followupCases = [{
                id: 'case-1',
                customer_name: 'Jane',
                next_action_date: new Date().toISOString()
            }];

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                const builder: Record<string, unknown> = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    gt: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    not: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis()
                };

                if (table === 'case_call_logs') {
                    // This table is used for Payments, PTPs, Callbacks. 
                    // We need to differentiate based on the query, but that's hard in a simple mock.
                    // For now, let's return data for all of them mixed or just differentiate by simple return
                    // simpler: verify structure.

                    // Actually, getting precise return values for sequential calls to the same table is tricky without analyzing the chain.
                    // We can use mockResolvedValueOnce if we know the order.
                    // Order in getNotifications:
                    // 1. Custom Notes (notification table)
                    // 2. Payments (case_call_logs)
                    // 3. Followups (customer_cases)
                    // 4. PTPs (case_call_logs)
                    // 5. Callbacks (case_call_logs)

                    // But wait, the table check happens first.
                }

                // Let's use a simplified approach: Return *something* for everything so code doesn't crash,
                // and then verify that valid data is processed.

                (builder as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve: (v: unknown) => void) => {
                    let data: unknown[] = [];
                    if (table === 'case_call_logs') {
                        // We can guess which query it is by what was called on builder, but simplified: return everything
                        // In reality, type checking in the service usually handles "data as PaymentData[]" etc.
                        // So if we return a merged object structure it might work to test aggregation.
                        data = [
                            ...paymentLogs,
                            { id: 'ptp-1', created_at: new Date().toISOString(), call_notes: 'PTP', call_status: 'PTP', customer_cases: { customer_name: 'Bob' }, ptp_datetime: new Date().toISOString() },
                            { id: 'cb-1', callback_datetime: new Date().toISOString(), call_notes: 'Callback', call_status: 'CALL_BACK', callback_completed: false, customer_cases: { customer_name: 'Alice' } }
                        ];
                    } else if (table === 'customer_cases') {
                        data = followupCases;
                    } else if (table === 'notifications') {
                        data = []; // Custom notifications
                    }
                    resolve({ data, error: null });
                };

                return builder;
            });

            const notifications = await NotificationService.getNotifications(userId);

            // We expect some notifications from our mock data
            // Since we returned combined data for case_call_logs, the service will try to map them.
            // Payment logic checks: gt('amount_collected', 0) -> our payment log has it.
            // PTP logic checks: call_status ilike ptp -> our ptp log has it.
            // Callback logic checks: call_status = CALL_BACK -> our cb log has it.

            // The service iterates the results. If we return the same array for all 3 calls, 
            // the service might misinterpret data if types don't match, but interfaces are loose enough or checked.
            // Actually service casts: (payments as unknown as PaymentData[])

            // So if we return a superset object, it should work for all.
            expect(notifications.length).toBeGreaterThan(0);
            expect(notifications.some(n => n.category === 'Payments')).toBeTruthy();
            expect(notifications.some(n => n.category === 'Follow-ups')).toBeTruthy();
        });
    });

    describe('createNotification', () => {
        it('should insert notification', async () => {
            const mockInsert = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: mockInsert,
                then: (resolve: (v: unknown) => void) => resolve({ error: null })
            }));

            await NotificationService.createNotification({
                tenant_id: 't-1', title: 'Test', message: 'Msg', type: 'info',
                target_type: 'all', sender_id: 'u-1'
            });
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    describe('dismissNotification', () => {
        it('should add id to local storage', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem');
            NotificationService.dismissNotification('notif-1');
            expect(spy).toHaveBeenCalledWith('dismissed_notifications', expect.stringContaining('notif-1'));
        });
    });
});
