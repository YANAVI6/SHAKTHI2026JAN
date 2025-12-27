import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { queryTable, insertRecord, updateRecord, deleteRecord, countRecords, TABLE_NAMES } from '../database.utils';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            single: vi.fn(),
            then: vi.fn((resolve) => resolve({ data: [], count: 0, error: null }))
        }))
    }
}));

describe('database.utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('queryTable', () => {
        it('should query table with filters', async () => {
            const mockSelect = vi.fn().mockReturnThis();
            const mockEq = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: mockSelect,
                eq: mockEq,
                then: (resolve: (value: { data: any[], error: any }) => void) => resolve({ data: [{ id: 1 }], error: null }) // eslint-disable-line @typescript-eslint/no-explicit-any
            }));

            const result = await queryTable<Record<string, unknown>>(TABLE_NAMES.EMPLOYEES, { id: 1 });
            expect(result).toHaveLength(1);
            expect(mockEq).toHaveBeenCalledWith('id', 1);
        });
    });

    describe('insertRecord', () => {
        it('should insert record', async () => {
            const mockInsert = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                insert: mockInsert,
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
            }));

            const result = await insertRecord<Record<string, unknown>>(TABLE_NAMES.EMPLOYEES, { name: 'Test' });
            expect(mockInsert).toHaveBeenCalledWith({ name: 'Test' });
            expect(result.id).toBe(1);
        });
    });

    describe('updateRecord', () => {
        it('should update record', async () => {
            const mockUpdate = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                update: mockUpdate,
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
            }));

            await updateRecord<Record<string, unknown>>(TABLE_NAMES.EMPLOYEES, '1', { name: 'Updated' });
            expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated' });
        });
    });

    describe('deleteRecord', () => {
        it('should delete record', async () => {
            const mockDelete = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                delete: mockDelete,
                eq: vi.fn().mockResolvedValue({ error: null })
            }));

            await deleteRecord(TABLE_NAMES.EMPLOYEES, '1');
            expect(mockDelete).toHaveBeenCalled();
        });
    });

    describe('countRecords', () => {
        it('should count records', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                then: (resolve: (value: { count: number, error: any }) => void) => resolve({ count: 5, error: null }) // eslint-disable-line @typescript-eslint/no-explicit-any
            }));

            const count = await countRecords(TABLE_NAMES.EMPLOYEES, { role: 'admin' });
            expect(count).toBe(5);
        });
    });
});
