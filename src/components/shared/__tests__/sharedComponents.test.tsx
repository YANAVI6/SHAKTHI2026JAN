import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MetricCard } from '../MetricCard';
import { ConfirmationModal } from '../ConfirmationModal';
import { Users } from 'lucide-react';


describe('Shared Components', () => {
    describe('MetricCard', () => {
        it('renders title, value and subtitle', () => {
            render(
                <MetricCard
                    title="Total Users"
                    value="1,234"
                    icon={Users}
                    color="blue"
                    subtitle="Last 30 days"
                />
            );
            expect(screen.getByText('Total Users')).toBeInTheDocument();
            expect(screen.getByText('1,234')).toBeInTheDocument();
            expect(screen.getByText('Last 30 days')).toBeInTheDocument();
        });

        it('applies correct color classes', () => {
            const { container } = render(
                <MetricCard title="Test" value="0" icon={Users} color="red" />
            );
            expect(container.firstChild).toHaveClass('bg-red-50');
            expect(container.firstChild).toHaveClass('border-red-200');
        });
    });

    describe('ConfirmationModal', () => {
        const mockOnClose = vi.fn();
        const mockOnConfirm = vi.fn();

        it('does not render when isOpen is false', () => {
            render(
                <ConfirmationModal
                    isOpen={false}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    title="Delete?"
                    message="Are you sure?"
                />
            );
            expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
        });

        it('renders title and message when open', () => {
            render(
                <ConfirmationModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    title="Delete?"
                    message="Are you sure?"
                />
            );
            expect(screen.getByText('Delete?')).toBeInTheDocument();
            expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        });

        it('calls onConfirm when confirm button clicked', () => {
            render(
                <ConfirmationModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    title="Delete?"
                    message="Are you sure?"
                    confirmText="Yes, delete"
                />
            );
            fireEvent.click(screen.getByText('Yes, delete'));
            expect(mockOnConfirm).toHaveBeenCalled();
        });

        it('calls onClose when cancel button clicked', () => {
            render(
                <ConfirmationModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    title="Delete?"
                    message="Are you sure?"
                />
            );
            fireEvent.click(screen.getByText('Cancel'));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('shows loading state on confirm button', () => {
            render(
                <ConfirmationModal
                    isOpen={true}
                    onClose={mockOnClose}
                    onConfirm={mockOnConfirm}
                    title="Delete?"
                    message="Are you sure?"
                    isLoading={true}
                />
            );
            expect(screen.getByText('Processing...')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
        });
    });
});
