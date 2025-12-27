import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as authService from '../services/authService';
import React from 'react';

// Refined mock for Supabase that is "thenable" for await
const mockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then: function (onFulfilled: (value: { data: any[]; error: any }) => any) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
    }
};

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => mockSupabaseQuery),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis()
        })),
        removeChannel: vi.fn()
    }
}));

vi.mock('../services/authService', () => ({
    loginCompanyAdmin: vi.fn(),
    loginSuperAdmin: vi.fn()
}));

vi.mock('../services/securityAuditService', () => ({
    securityAuditService: {
        logLogin: vi.fn().mockResolvedValue(undefined),
        logLogout: vi.fn().mockResolvedValue(undefined),
        logFailedLogin: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('../services/activityService', () => ({
    activityService: {
        updateLastActive: vi.fn().mockResolvedValue(undefined),
        trackLogout: vi.fn().mockResolvedValue(undefined),
        trackLogoutBeacon: vi.fn()
    }
}));

// Mock sonner and other UI overlays
vi.mock('../components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('framer-motion', () => ({
    motion: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../components/SplashScreen', () => ({
    default: function MockSplashScreen({ onComplete }: { onComplete: () => void }) {
        React.useEffect(() => { onComplete(); }, [onComplete]);
        return <div data-testid="splash">Splash</div>;
    }
}));

describe('Integration: Main Login Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        window.history.pushState({}, 'Login', '/test');

        // Setup specific mock for tenant check
        vi.mocked(mockSupabaseQuery.maybeSingle).mockResolvedValue({
            data: { status: 'active', name: 'Test Tenant', slug: 'test' },
            error: null
        });
    });

    it('successfully logs in and navigates to Company Admin Dashboard', async () => {
        const mockUser = {
            id: 'admin1',
            username: 'admin',
            name: 'Admin User',
            role: 'CompanyAdmin',
            tenantId: 't1'
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(authService.loginCompanyAdmin).mockResolvedValue(mockUser as any);

        render(<App />);

        const empIdInput = await screen.findByPlaceholderText(/Enter your Employee ID/i);
        const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
        const loginButton = screen.getByRole('button', { name: /login/i });

        fireEvent.change(empIdInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(loginButton);

        // Verify Dashboard rendering
        expect(await screen.findByText('Shakti')).toBeInTheDocument();
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();

        // Handle multiple 'Admin User' occurrences (e.g. sidebar and header)
        const userElements = screen.getAllByText('Admin User');
        expect(userElements.length).toBeGreaterThan(0);
        expect(userElements[0]).toBeInTheDocument();
    });
});
