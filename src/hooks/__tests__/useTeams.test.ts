import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeams } from '../useTeams';
import { TeamService } from '../../services/teamService';

// Mock team service
vi.mock('../../services/teamService', () => ({
    TeamService: {
        getTeams: vi.fn(),
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        deleteTeam: vi.fn(),
        toggleTeamStatus: vi.fn()
    }
}));

describe('useTeams', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should load teams on mount if tenantId provided', async () => {
        const mockTeams = [{ id: '1', name: 'Team A' }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams as any);

        const { result } = renderHook(() => useTeams('t1'));

        // useEffect triggers async, so wait for loading to finish
        // Or check loading status updates
        // In this case, loadTeams is called automatically

        // Wait for state update
        await vi.waitFor(() => {
            expect(result.current.teams).toEqual(mockTeams);
        });
    });

    it('should handle team creation errors', async () => {
        const { result } = renderHook(() => useTeams('t1'));
        vi.spyOn(window, 'alert').mockImplementation(() => { });
        vi.mocked(TeamService.createTeam).mockRejectedValue(new Error('Failed'));

        let success;
        await act(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            success = await result.current.createTeam({ name: 'New', team_incharge_id: '1' } as any);
        });

        expect(success).toBe(false);
        expect(result.current.error).toBe('Failed');
        expect(window.alert).toHaveBeenCalledWith('Failed');
    });

    it('should delete team and reload', async () => {
        const { result } = renderHook(() => useTeams('t1'));

        await act(async () => {
            await result.current.deleteTeam('1');
        });

        expect(TeamService.deleteTeam).toHaveBeenCalledWith('1');
        expect(TeamService.getTeams).toHaveBeenCalled();
    });
});
