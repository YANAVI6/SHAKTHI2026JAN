import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useNotifications,
    useSearch,
    usePagination,
    useModal,
    useToast
} from '../hooks';
import * as utils from '../utils';

// Mock utils
vi.mock('../utils', () => ({
    generateTransactionId: vi.fn(() => 'TXN123'),
    formatDateTime: vi.fn(() => '2023-01-01 12:00'),
    showNotification: vi.fn()
}));

describe('TelecallerDashboard Hooks - Part 2', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useNotifications', () => {
        it('should show and hide payment notification', () => {
            const { result } = renderHook(() => useNotifications());

            act(() => {
                result.current.showPaymentNotification('John', '1000');
            });

            expect(result.current.notification?.show).toBe(true);
            expect(result.current.notification?.customer).toBe('John');
            expect(utils.showNotification).toHaveBeenCalled();

            act(() => {
                result.current.hideNotification();
            });
            expect(result.current.notification).toBeNull();
        });
    });

    describe('useSearch', () => {
        it('should update search term', () => {
            const { result } = renderHook(() => useSearch('initial'));
            expect(result.current.searchTerm).toBe('initial');

            act(() => {
                result.current.updateSearchTerm('new');
            });
            expect(result.current.searchTerm).toBe('new');
        });
    });

    describe('usePagination', () => {
        it('should handle page navigation', () => {
            const { result } = renderHook(() => usePagination());
            expect(result.current.currentPage).toBe(1);

            act(() => {
                result.current.nextPage();
            });
            expect(result.current.currentPage).toBe(2);

            act(() => {
                result.current.prevPage();
            });
            expect(result.current.currentPage).toBe(1);

            act(() => {
                result.current.setCurrentPage(5);
            });
            expect(result.current.currentPage).toBe(5);
        });
    });

    describe('useModal', () => {
        it('should open and close', () => {
            const { result } = renderHook(() => useModal());
            expect(result.current.isOpen).toBe(false);

            act(() => {
                result.current.open();
            });
            expect(result.current.isOpen).toBe(true);

            act(() => {
                result.current.close();
            });
            expect(result.current.isOpen).toBe(false);
        });
    });

    describe('useToast', () => {
        it('should add and remove toasts', () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.success('Title', 'Message');
            });

            expect(result.current.toasts).toHaveLength(1);
            expect(result.current.toasts[0].type).toBe('success');

            // Auto-remove
            act(() => {
                vi.advanceTimersByTime(5000);
            });

            expect(result.current.toasts).toHaveLength(0);
            vi.useRealTimers();
        });
    });
});
