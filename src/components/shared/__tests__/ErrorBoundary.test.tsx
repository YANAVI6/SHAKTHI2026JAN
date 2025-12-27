import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';
import { errorService } from '../../../services/errorService';

// Mock the error service
vi.mock('../../../services/errorService', () => ({
    errorService: {
        logError: vi.fn(),
    },
}));

// Component that throws an error
const ThrowError = () => {
    throw new Error('Test Error');
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Prevent console.error from cluttering output during tests
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('renders children when no error occurs', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <div>Content</div>
            </ErrorBoundary>
        );
        expect(getByText('Content')).toBeInTheDocument();
    });

    it('renders error UI when an error occurs', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(getByText('Oops! Something went wrong')).toBeInTheDocument();
        expect(getByText('We encountered an unexpected error. Please try again or go back to the home page.')).toBeInTheDocument();
    });

    it('logs error to errorService when an error occurs', () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(errorService.logError).toHaveBeenCalled();
        // Verify it was called with an Error object
        expect(errorService.logError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({ componentStack: expect.any(String) })
        );
    });
});
