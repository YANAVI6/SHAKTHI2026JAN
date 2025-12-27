import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ReportService } from '../reportService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            single: vi.fn(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

describe('ReportService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateCaseDetailsReport', () => {
        it('should generate report with filters', async () => {
            const mockCases = [{
                id: 'case-1',
                customer_name: 'John',
                case_call_logs: [{ amount_collected: '100', call_status: 'Connected' }],
                employees: { name: 'Tel1' }
            }];

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockCases, error: null })
            }));

            const report = await ReportService.generateCaseDetailsReport('t-1', { dateFrom: '2023-01-01' }, 'admin');

            expect(report).toHaveLength(1);
            expect(report[0].total_collected_amount).toBe(100);
            expect(report[0].telecaller_name).toBe('Tel1');
        });
    });

    describe('generatePaymentReport', () => {
        it('should generate payment report', async () => {
            const mockPayments = [{
                id: 'pay-1',
                amount_collected: '500',
                created_at: new Date().toISOString(),
                customer_cases: { customer_name: 'Jane' },
                employees: { name: 'Tel2' }
            }];

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                gt: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
            }));

            const report = await ReportService.generatePaymentReport('t-1', {}, 'admin');

            expect(report).toHaveLength(1);
            expect(report[0].amount_collected).toBe(500);
            expect(report[0].customer_name).toBe('Jane');
        });
    });

    describe('generateTeamPerformanceReport', () => {
        it('should aggregate team metrics', async () => {
            const mockTeams = [{
                id: 'team-1',
                team_name: 'Sales',
                employees: [
                    {
                        status: 'active',
                        customer_cases: [
                            { case_status: 'resolved', case_call_logs: [{ amount_collected: '1000' }] }
                        ]
                    }
                ],
                telecaller_targets: [{ monthly_collection_target: 10000 }]
            }];

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: mockTeams, error: null })
            }));

            const report = await ReportService.generateTeamPerformanceReport('t-1');

            expect(report).toHaveLength(1);
            expect(report[0].total_collection).toBe(1000);
            expect(report[0].cases_resolved).toBe(1);
            expect(report[0].achievement_percentage).toBe(10);
        });
    });
});
