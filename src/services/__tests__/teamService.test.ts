import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { TeamService } from '../teamService';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis()
        }))
    }
}));

describe('TeamService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createTeam', () => {
        it('should throw error if name is missing', async () => {
            await expect(TeamService.createTeam({
                tenant_id: 't-1', name: '', team_incharge_id: 'emp-1', product_name: 'P1', telecaller_ids: []
            })).rejects.toThrow('Team name is required');
        });

        it('should create team successfully', async () => {
            const mockIncharge = { id: 'emp-1', role: 'TeamIncharge' };
            const mockTeam = { id: 'team-1', name: 'Sales' };

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'teams') {
                    // check existing name (select) -> null
                    // insert -> success
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                        single: vi.fn().mockResolvedValue({ data: mockTeam, error: null }),
                        insert: vi.fn().mockReturnThis()
                    };
                }
                if (table === 'employees') {
                    // verify incharge
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockResolvedValue({ data: mockIncharge, error: null }),
                        update: vi.fn().mockResolvedValue({ error: null }), // for assigning telecallers
                        in: vi.fn().mockReturnThis()
                    };
                }
                return {};
            });

            const result = await TeamService.createTeam({
                tenant_id: 't-1', name: 'Sales', team_incharge_id: 'emp-1', product_name: 'P1', telecaller_ids: ['tel-1']
            });

            expect(result.id).toBe('team-1');
        });

        it('should fail if team name already exists', async () => {
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ex-1' }, error: null })
            }));

            await expect(TeamService.createTeam({
                tenant_id: 't-1', name: 'Sales', team_incharge_id: 'emp-1', product_name: 'P1', telecaller_ids: []
            })).rejects.toThrow('already exists');
        });
    });

    describe('getTeams', () => {
        it('should return teams with details', async () => {
            const mockTeams = [{ id: 'team-1', name: 'Sales' }];
            const mockTelecallers = [{ id: 'tel-1' }];

            // Create a smart "thenable" mock builder
            const createMockBuilder = (data: unknown) => {
                const builder = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    then: (resolve: (v: unknown) => void) => Promise.resolve({ data, error: null }).then(resolve)
                };
                return builder;
            };

            const teamBuilder = createMockBuilder(mockTeams);
            const employeeBuilder = createMockBuilder(mockTelecallers);

            // Special builder for "count" queries
            const countBuilder = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockResolvedValue({ count: 5, error: null }),
                then: (resolve: (v: unknown) => void) => Promise.resolve({ count: 5, error: null }).then(resolve)
            };

            (supabase.from as unknown as Mock).mockImplementation((table: string) => {
                if (table === 'teams') return teamBuilder;
                if (table === 'employees') return employeeBuilder;
                if (table === 'customer_cases') return countBuilder;
                return createMockBuilder([]);
            });

            const result = await TeamService.getTeams('t-1');
            expect(result).toHaveLength(1);
            expect(result[0].total_cases).toBe(5);
        });
    });

    describe('deleteTeam', () => {
        it('should delete team', async () => {
            const mockDelete = vi.fn().mockReturnThis();
            (supabase.from as unknown as Mock).mockImplementation(() => ({
                delete: mockDelete,
                eq: vi.fn().mockResolvedValue({ error: null })
            }));

            await TeamService.deleteTeam('t-1');
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
