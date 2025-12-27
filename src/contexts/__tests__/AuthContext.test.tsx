import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth, USER_STORAGE_KEY } from '../AuthContext';
import * as authService from '../../services/authService';
import { activityService } from '../../services/activityService';
import React from 'react';

// Mock Services
vi.mock('../../services/authService', () => ({
    loginSuperAdmin: vi.fn(),
    loginCompanyAdmin: vi.fn()
}));

vi.mock('../../services/activityService', () => ({
    activityService: {
        trackLogout: vi.fn().mockResolvedValue({}),
        trackLogoutBeacon: vi.fn().mockResolvedValue({}),
        updateLastActive: vi.fn().mockResolvedValue({})
    }
}));

vi.mock('../../services/securityAuditService', () => ({
    securityAuditService: {
        logLogin: vi.fn(),
        logLogout: vi.fn(),
        logFailedLogin: vi.fn()
    }
}));

vi.mock('../../lib/supabase', () => ({
    supabase: {
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis()
        })),
        removeChannel: vi.fn()
    }
}));

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
    );

    it('should initialize with null user', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('should restore user from sessionStorage on mount', () => {
        const mockUser = { id: '1', name: 'Test', role: 'SuperAdmin' };
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));

        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
    });

    describe('login', () => {
        it('should login super admin successfully', async () => {
            const mockUser = { id: '1', username: 'admin' };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(authService.loginSuperAdmin).mockResolvedValue(mockUser as any);

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('admin', 'pass', 'SuperAdmin');
            });

            expect(result.current.user?.role).toBe('SuperAdmin');
            expect(sessionStorage.getItem(USER_STORAGE_KEY)).toContain('admin');
        });

        it('should login company admin successfully', async () => {
            const mockUser = { id: '1', name: 'Admin', role: 'CompanyAdmin', tenantId: 't1' };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(authService.loginCompanyAdmin).mockResolvedValue(mockUser as any);

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.login('admin', 'pass', 'CompanyAdmin', 'slug');
            });

            expect(result.current.user?.tenantId).toBe('t1');
            expect(result.current.isAuthenticated).toBe(true);
        });
    });

    describe('logout', () => {
        it('should clear state and sessionStorage', async () => {
            const mockUser = { id: '1', name: 'Test', role: 'Telecaller', tenantId: 't1' };
            sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));

            const { result } = renderHook(() => useAuth(), { wrapper });

            await act(async () => {
                await result.current.logout('Manual');
            });

            expect(result.current.user).toBeNull();
            expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull();
            expect(activityService.trackLogout).toHaveBeenCalledWith('1', 'Manual');
        });
    });

    describe('Auto-logout', () => {
        it('should auto-logout after inactivity', async () => {
            vi.useFakeTimers();
            const mockUser = { id: '1', name: 'Test', role: 'Telecaller', tenantId: 't1' };

            // Render with initial user to trigger the inactivity effect
            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider initialUser={mockUser}>{children}</AuthProvider>
            });

            expect(result.current.isAuthenticated).toBe(true);

            // Advance time by 6 minutes (360,000 ms)
            await act(async () => {
                vi.advanceTimersByTime(360000);
                // Need to wait for interval and async logout
                await Promise.resolve();
            });

            expect(result.current.user).toBeNull();
            vi.useRealTimers();
        });
    });
});
