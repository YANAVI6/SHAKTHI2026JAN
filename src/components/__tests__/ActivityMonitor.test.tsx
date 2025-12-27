import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivityMonitor } from '../ActivityMonitor';

// Mock useAuth
const mockLogout = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: '1', tenantId: 'tenant-1' },
        isAuthenticated: true,
        logout: mockLogout,
    })
}));

// Mock activityService
vi.mock('../services/activityService', () => ({
    activityService: {
        updateLastActive: vi.fn(),
        setIdle: vi.fn(),
        trackLogout: vi.fn().mockResolvedValue(undefined),
    }
}));

describe('ActivityMonitor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders children correctly', () => {
        const { getByText } = render(
            <ActivityMonitor>
                <div>Child Content</div>
            </ActivityMonitor>
        );
        expect(getByText('Child Content')).toBeInTheDocument();
    });

    it('attaches event listeners on mount', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        render(
            <ActivityMonitor>
                <div>Content</div>
            </ActivityMonitor>
        );
        expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    // Note: Testing actual timeout logic usually requires more complex setup with firing events
    // For now, these basic tests confirm the component mounts and hooks up listeners
});
