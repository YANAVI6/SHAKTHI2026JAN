import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../LoginPage';
import { BrowserRouter } from 'react-router-dom';

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        isAuthenticated: false
    })
}));

// Mock supabase for tenant check
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'active', name: 'Test Tenant', slug: 'test' }, error: null }),
        }))
    }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form correctly', () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );
        expect(screen.getByPlaceholderText('Enter your Employee ID (e.g., EMP001)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        mockLogin.mockResolvedValue(undefined);

        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter your Employee ID (e.g., EMP001)'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i })); // Button says "Login" not "Sign in" for specific roles

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('admin', 'password', 'CompanyAdmin', undefined);
        });
    });

    it('displays error message on login failure', async () => {
        mockLogin.mockRejectedValue(new Error('Invalid credentials'));

        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText('Enter your Employee ID (e.g., EMP001)'), { target: { value: 'admin' } });
        fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });
});
