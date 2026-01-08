/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock Notification globally
global.Notification = {
    requestPermission: vi.fn().mockResolvedValue('granted'),
    permission: 'granted',
} as any;

// Mock UI
vi.mock('../components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../components/SplashScreen', () => ({
    default: function MockSplashScreen({ onComplete }: any) {
        React.useEffect(() => { onComplete(); }, [onComplete]);
        return <div data-testid="splash">Splash</div>;
    }
}));

vi.mock('react-resizable-panels', () => ({
    Group: ({ children }: any) => <div data-testid="resize-group">{children}</div>,
    Panel: ({ children }: any) => <div data-testid="resize-panel">{children}</div>,
    Separator: () => <div data-testid="resize-handle" />,
}));

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: () => null,
    Line: () => null,
    BarChart: () => null,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    PieChart: () => null,
    Pie: () => null,
    Cell: () => null
}));

// Mock Lazy Loaded Dashboards to avoid Suspense issues
vi.mock('../components/CompanyAdmin/CompanyAdminDashboard', () => ({
    CompanyAdminDashboard: () => <div>Shakthi - Company Admin</div>
}));
vi.mock('../components/SuperAdminDashboard', () => ({
    default: () => <div>Super Admin Dashboard</div>
}));

// Ultimate Supabase Mock
const mockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    onConflict: vi.fn().mockReturnThis(),
    then: function (onFulfilled: any) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
    },
    catch: function (onRejected: any) {
        return Promise.resolve({ data: [], error: null }).catch(onRejected);
    }
};

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => mockSupabaseQuery),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn()
        })),
        removeChannel: vi.fn()
    }
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
        setIdle: vi.fn().mockResolvedValue(undefined),
        trackLogoutBeacon: vi.fn().mockReturnValue(true),
        getActivityLogs: vi.fn().mockResolvedValue({ logs: [], hasMore: false }),
        getActivityStats: vi.fn().mockResolvedValue({ total: 0, online: 0, onBreak: 0, idle: 0 })
    }
}));

vi.mock('../services/authService', () => ({
    loginCompanyAdmin: vi.fn().mockResolvedValue({ id: '1', role: 'CompanyAdmin' }),
    loginSuperAdmin: vi.fn().mockResolvedValue({ id: '1', role: 'SuperAdmin' })
}));

import App from '../App';
import * as authService from '../services/authService';

describe('Integration: Main Login Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        // Set route to a tenant slug to trigger LoginPage
        window.history.pushState({}, 'Login', '/test-tenant');

        // Setup specific mock for tenant check
        vi.mocked(mockSupabaseQuery.maybeSingle).mockResolvedValue({
            data: { status: 'active', name: 'Test Tenant', slug: 'test-tenant' },
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
        vi.mocked(authService.loginCompanyAdmin).mockResolvedValue(mockUser as any);

        render(<App />);

        const empIdInput = await screen.findByPlaceholderText(/Enter your Employee ID/i);
        const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
        const loginButton = screen.getByRole('button', { name: /login/i });

        fireEvent.change(empIdInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(loginButton);

        // Verify Dashboard rendering (our mock returns plain text)
        expect(await screen.findByText('Shakthi - Company Admin', {}, { timeout: 10000 })).toBeInTheDocument();

    });
});
