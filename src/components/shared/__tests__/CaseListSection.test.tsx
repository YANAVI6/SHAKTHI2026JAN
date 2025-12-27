import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaseListSection } from '../CaseListSection';
import { customerCaseService } from '../../../services/customerCaseService';
import { TeamService } from '../../../services/teamService';
import { employeeService } from '../../../services/employeeService';

// Mock dependencies
vi.mock('../../../services/customerCaseService');
vi.mock('../../../services/teamService');
vi.mock('../../../services/employeeService');
vi.mock('../../../utils/caseMapper', () => ({
    mapServiceCaseToDashboardCase: (c: Record<string, unknown>) => ({
        id: c.id as string,
        customerName: (c.customer_name || c.customerName) as string,
        loanId: (c.loan_id || c.loanId) as string,
        tenantId: (c.tenant_id || c.tenantId) as string,
        dpd: (c.dpd as number) || 0,
        outstandingAmount: (c.outstandingAmount as string) || '0'
    })
}));

describe('CaseListSection', () => {
    const mockUser = { id: 'u1', role: 'company_admin', tenantId: 't1' };
    const mockCases = [
        { id: 'c1', customer_name: 'Case 1', loan_id: 'L1', tenant_id: 't1' },
        { id: 'c2', customer_name: 'Case 2', loan_id: 'L2', tenant_id: 't1' }
    ];

    beforeEach(() => {
        vi.resetAllMocks();
        cleanup();
        vi.mocked(TeamService.getTeams).mockResolvedValue([]);
        vi.mocked(employeeService.getEmployees).mockResolvedValue([]);
    });

    it('renders cases correctly', async () => {
        vi.mocked(customerCaseService.getAllCases).mockResolvedValue(mockCases as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any
        render(<CaseListSection user={mockUser} onCaseClick={vi.fn()} />);

        expect(await screen.findByText('Case 1')).toBeInTheDocument();
        expect(screen.getByText('Case 2')).toBeInTheDocument();
    });

    it('filters cases by search term', async () => {
        vi.mocked(customerCaseService.getAllCases).mockResolvedValue(mockCases as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any
        render(<CaseListSection user={mockUser} onCaseClick={vi.fn()} />);

        const searchInput = screen.getByPlaceholderText(/search cases\.\.\./i);
        fireEvent.change(searchInput, { target: { value: 'Case 1' } });

        expect(await screen.findByText('Case 1')).toBeInTheDocument();
        expect(screen.queryByText('Case 2')).not.toBeInTheDocument();
    });

    it('handles pagination', async () => {
        const paginationUser = { ...mockUser, tenantId: 't-pagination' };
        const manyCases = Array.from({ length: 15 }, (_, i) => ({
            id: `c${i}`,
            customer_name: `Customer ${i}`,
            loan_id: `L${i}`,
            tenant_id: 't-pagination',
            dpd: 100 - i, // Ensure descending order so Customer 0 is first
            outstandingAmount: '1000'
        }));
        vi.mocked(customerCaseService.getAllCases).mockResolvedValue(manyCases as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any

        render(<CaseListSection user={paginationUser} onCaseClick={vi.fn()} />);

        // Wait for first page to load
        await waitFor(() => {
            expect(screen.getByText(/Showing/i)).toBeInTheDocument();
            expect(screen.getByText('1-10')).toBeInTheDocument();
            expect(screen.getByText('15')).toBeInTheDocument();
        });

        expect(await screen.findByText('Customer 0')).toBeInTheDocument();

        // Find Next button
        const nextButton = screen.getByText(/next/i);
        fireEvent.click(nextButton);

        // Wait for second page
        await waitFor(() => {
            expect(screen.getByText('11-15')).toBeInTheDocument();
        });

        expect(await screen.findByText('Customer 10')).toBeInTheDocument();
    });
});
