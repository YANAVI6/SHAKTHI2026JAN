import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '../use-toast';

describe('use-toast', () => {
    beforeEach(() => {
        // Reset internal state if possible, or just re-render
        vi.clearAllMocks();
    });

    it('should add a toast and return it in the list', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: 'Success', description: 'Done' });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].title).toBe('Success');
    });

    it('should dismiss a toast', () => {
        const { result } = renderHook(() => useToast());

        let toastId: string = '';
        act(() => {
            const t = toast({ title: 'To Dismiss' });
            toastId = t.id;
        });

        expect(result.current.toasts).toHaveLength(1);

        act(() => {
            result.current.dismiss(toastId);
        });

        // In many toast implementations, dismiss marks it but might keep it in list for exit animations
        // Let's check the implementation or just verify it was called
        expect(result.current.toasts[0].open).toBe(false);
    });

    it('should handle updates to existing toast', () => {
        const { result } = renderHook(() => useToast());

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let updateFn: ((props: any) => void) | undefined;
        act(() => {
            const t = toast({ title: 'Initial' });
            updateFn = t.update;
        });

        act(() => {
            if (updateFn) {
                updateFn({ id: result.current.toasts[0].id, title: 'Updated' });
            }
        });

        expect(result.current.toasts[0].title).toBe('Updated');
    });
});
