import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyAdminDashboard } from '../components/CompanyAdmin/CompanyAdminDashboard';


// Mock Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockQuery = (defaultData: any = []) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Test' }, error: null }),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: function (onFulfilled: (value: { data: any, error: any }) => any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        return Promise.resolve({ data: defaultData, error: null }).then(onFulfilled);
    }
});

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => createMockQuery([])),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn()
        })),
        removeChannel: vi.fn()
    }
}));

// Mock Auth
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'admin1', tenantId: 't1', role: 'CompanyAdmin' },
        isAuthenticated: true
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock Notification
vi.mock('../components/shared/Notification', () => ({
    useNotification: () => ({
        showNotification: vi.fn(),
    }),
    notificationHelpers: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
    NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock Celebration
vi.mock('../contexts/CelebrationContext', () => ({
    useCelebration: () => ({
        triggerCelebration: vi.fn(),
    }),
    CelebrationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock services
vi.mock('../services/activityService', () => ({
    activityService: { updateLastActive: vi.fn().mockResolvedValue(undefined), trackLogout: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('../services/securityAuditService', () => ({
    securityAuditService: { logLogout: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('../services/customerCaseService', () => ({
    customerCaseService: {
        getAllCases: vi.fn(),
        getCaseById: vi.fn(),
        getCallLogsWithEmployeeDetails: vi.fn().mockResolvedValue([]),
    }
}));

// Mock UI
vi.mock('../components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>, // eslint-disable-line @typescript-eslint/no-explicit-any
        nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>, // eslint-disable-line @typescript-eslint/no-explicit-any
        header: ({ children, ...props }: any) => <header {...props}>{children}</header>, // eslint-disable-line @typescript-eslint/no-explicit-any
        main: ({ children, ...props }: any) => <main {...props}>{children}</main>, // eslint-disable-line @typescript-eslint/no-explicit-any
        h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>, // eslint-disable-line @typescript-eslint/no-explicit-any
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>, // eslint-disable-line @typescript-eslint/no-explicit-any
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
    Group: ({ children }: { children: React.ReactNode }) => <div data-testid="resize-group">{children}</div>,
    Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="resize-panel">{children}</div>,
    Separator: () => <div data-testid="resize-handle" />,
}));

describe('Integration: Company Admin Dashboard Flow', () => {
    const mockUser = {
        id: 'admin1',
        empId: 'ADM001',
        name: 'Admin User',
        role: 'CompanyAdmin',
        tenantId: 't1'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('navigates to All Cases and opens Case Details Modal', async () => {
        const mockCase = {
            id: 'case1',
            customer_name: 'John Doe',
            customerName: 'John Doe',
            loan_id: 'LOAN123',
            loanId: 'LOAN123',
            tenant_id: 't1',
            team: { name: 'Team Alpha' },
            created_at: new Date().toISOString()
        };

        const { customerCaseService } = await import('../services/customerCaseService');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(customerCaseService.getAllCases).mockResolvedValue([mockCase as any]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(customerCaseService.getCaseById).mockResolvedValue(mockCase as any);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(<CompanyAdminDashboard user={mockUser as any} onLogout={vi.fn()} />);

        // 1. Initial State: Dashboard
        expect(await screen.findByText(/Dashboard Overview/i)).toBeInTheDocument();

        // 2. Click "All Cases" in Sidebar
        const allCasesBtn = screen.getByText(/All Cases/i).closest('button');
        fireEvent.click(allCasesBtn!);

        // 3. Verify Case List renders
        expect(await screen.findByText(/All Recovery Cases/i)).toBeInTheDocument();
        expect(await screen.findByText('John Doe')).toBeInTheDocument();

        // 4. Click "View Details" (Eye icon)
        const viewBtn = await screen.findByTitle(/View Details/i);
        fireEvent.click(viewBtn);

        // 5. Verify Modal opens with rich details
        expect(await screen.findByText(/Customer Information/i)).toBeInTheDocument();
        // Use getAllByText because it appears in table and modal
        expect(screen.getAllByText('LOAN123').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Case Details/i)).toBeInTheDocument();
    });
});
