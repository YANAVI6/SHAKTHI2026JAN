import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from '../useModal';
import { useTabs } from '../useTabs';
import { useIsMobile } from '../use-mobile';

describe('UI Helper Hooks', () => {
    describe('useModal', () => {
        it('should handle open/close/toggle', () => {
            const { result } = renderHook(() => useModal<string>());

            expect(result.current.isOpen).toBe(false);

            act(() => {
                result.current.open('test data');
            });
            expect(result.current.isOpen).toBe(true);
            expect(result.current.data).toBe('test data');

            act(() => {
                result.current.close();
            });
            expect(result.current.isOpen).toBe(false);
            expect(result.current.data).toBeUndefined();

            act(() => {
                result.current.toggle();
            });
            expect(result.current.isOpen).toBe(true);
        });
    });

    describe('useTabs', () => {
        it('should handle tab changes and reset', () => {
            const { result } = renderHook(() => useTabs('tab1'));

            expect(result.current.activeTab).toBe('tab1');

            act(() => {
                result.current.setActiveTab('tab2');
            });
            expect(result.current.activeTab).toBe('tab2');

            act(() => {
                result.current.resetTab();
            });
            expect(result.current.activeTab).toBe('tab1');
        });
    });

    describe('useIsMobile', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
            window.matchMedia = vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // Deprecated
                removeListener: vi.fn(), // Deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));
        });

        it('should return false for desktop width', () => {
            const { result } = renderHook(() => useIsMobile());
            expect(result.current).toBe(false);
        });

        it('should return true for mobile width', () => {
            window.innerWidth = 500;
            const { result } = renderHook(() => useIsMobile());
            expect(result.current).toBe(true);
        });
    });
});
