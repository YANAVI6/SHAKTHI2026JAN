import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { auditLogService } from '../auditLogService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: [], error: null }))
        }))
    }
}));

describe('auditLogService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('logAction', () => {
        it('should insert audit log entry', async () => {
            const mockInsert = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: mockInsert,
                then: (resolve: (v: unknown) => void) => resolve({ error: null })
            }));

            await auditLogService.logAction({
                tenant_id: 't-1',
                user_id: 'u-1',
                action_type: 'assign',
                entity_type: 'case'
            });

            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                tenant_id: 't-1',
                action_type: 'assign'
            }));
        });
    });

    describe('logCaseAssignment', () => {
        it('should log case assignment with correct metadata', async () => {
            const mockInsert = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: mockInsert,
                then: (resolve: (v: unknown) => void) => resolve({ error: null })
            }));

            await auditLogService.logCaseAssignment('t-1', 'u-1', 'c-1', 'tel-1', 'Round Robin');

            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                action_type: 'assign',
                entity_id: 'c-1',
                to_value: 'tel-1',
                reason: 'Round Robin'
            }));
        });
    });

    describe('getAuditLogs', () => {
        it('should fetch logs with filters', async () => {
            const mockLogs = [{ id: 'log-1', action_type: 'assign' }];
            const mockEq = vi.fn().mockReturnThis();

            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: mockEq,
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: mockLogs, error: null })
            }));

            const result = await auditLogService.getAuditLogs('t-1', { userId: 'u-1' });

            expect(result).toHaveLength(1);
            expect(mockEq).toHaveBeenCalledWith('user_id', 'u-1');
        });
    });
});
