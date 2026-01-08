import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Layout from '../Layout';
import PageHeader from '../PageHeader';
import { Home, Users } from 'lucide-react';
import { BrowserRouter } from 'react-router-dom';

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(() => ({
        user: { name: 'John Doe', role: 'CompanyAdmin' }
    }))
}));

// Mock react-resizable-panels to avoid JSDOM style errors
vi.mock('react-resizable-panels', () => ({
    Group: ({ children }: { children: React.ReactNode }) => <div data-testid="resize-group">{children}</div>,
    Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="resize-panel">{children}</div>,
    Separator: () => <div data-testid="resize-handle" />,
}));

describe('Layout and PageHeader', () => {
    describe('Layout', () => {
        const mockUser = { name: 'John Doe', role: 'CompanyAdmin' };
        const mockOnLogout = vi.fn();
        const menuItems = [
            { name: 'Dashboard', icon: Home, active: true, onClick: vi.fn() },
            { name: 'Users', icon: Users, active: false, onClick: vi.fn() }
        ];

        it('renders sidebar with menu items', async () => {
            render(
                <BrowserRouter>
                    <Layout
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        user={mockUser as any}
                        onLogout={mockOnLogout}
                        menuItems={menuItems}
                        title="Company Dashboard"
                        roleColor="bg-blue-600"
                    >
                        <div>Main Content</div>
                    </Layout>
                </BrowserRouter>
            );

            expect(await screen.findByText('Shakthi')).toBeInTheDocument();
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Users')).toBeInTheDocument();
        });

        it('calls onLogout when logout button clicked', async () => {
            render(
                <BrowserRouter>
                    <Layout
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        user={mockUser as any}
                        onLogout={mockOnLogout}
                        menuItems={menuItems}
                        title="Title"
                        roleColor="bg-blue-600"
                    >
                        <div />
                    </Layout>
                </BrowserRouter>
            );
            fireEvent.click(await screen.findByText(/logout/i));
            expect(mockOnLogout).toHaveBeenCalled();
        });
    });

    describe('PageHeader', () => {
        it('renders title and user info', async () => {
            render(
                <PageHeader title="User Management" subtitle="Manage your team" />
            );

            expect(await screen.findByText('User Management')).toBeInTheDocument();
            expect(screen.getByText(/Welcome, John Doe/)).toBeInTheDocument();
        });
    });
});
