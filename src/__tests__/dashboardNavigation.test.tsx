import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { USER_STORAGE_KEY } from '../contexts/AuthContext';
import React from 'react';

// Refined mock for Supabase that is "thenable" for await
const mockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
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

// Mock services
vi.mock('../services/securityAuditService', () => ({
    securityAuditService: { logLogin: vi.fn(), logLogout: vi.fn() }
}));
vi.mock('../services/activityService', () => ({
    activityService: { updateLastActive: vi.fn(), trackLogout: vi.fn(), trackLogoutBeacon: vi.fn() }
}));

// Mock UI
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

describe('Integration: Dashboard Navigation', () => {
    const mockUser = {
        id: 'admin1',
        username: 'admin',
        name: 'Admin User',
        role: 'CompanyAdmin',
        tenantId: 't1'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
        window.history.pushState({}, 'Dashboard', '/admin');

        vi.mocked(mockSupabaseQuery.maybeSingle).mockResolvedValue({
            data: { status: 'active', name: 'Test Tenant', slug: 'test' },
            error: null
        });
        vi.mocked(mockSupabaseQuery.single).mockResolvedValue({
            data: { name: 'Test Tenant' },
            error: null
        });
    });

    it('navigates to All Cases section when sidebar item is clicked', async () => {
        render(<App />);

        // Wait for Dashboard to render
        expect(await screen.findByText(/Shakti - Company Admin/i)).toBeInTheDocument();

        // Find "All Cases" sidebar button
        const allCasesButton = screen.getByRole('button', { name: /All Cases/i });
        fireEvent.click(allCasesButton);

        // Verify CaseListSection renders
        expect(await screen.findByText(/All Recovery Cases/i)).toBeInTheDocument();
    });

    it('navigates to Employee Management section', async () => {
        render(<App />);

        expect(await screen.findByText(/Shakti - Company Admin/i)).toBeInTheDocument();

        const employeeMgmtButton = screen.getByRole('button', { name: /Employee Management/i });
        fireEvent.click(employeeMgmtButton);

        // Should find "Employee Management" header in the section
        expect(await screen.findByRole('heading', { name: 'Employee Management', level: 2 })).toBeInTheDocument();

        // Should find "Add Employee" button (empty state or header)
        const addButtons = await screen.findAllByText(/Add Employee/i);
        expect(addButtons.length).toBeGreaterThan(0);
    });
});
