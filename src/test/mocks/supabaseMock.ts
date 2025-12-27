import { vi } from 'vitest';

export const createSupabaseMock = () => {
    const fromReturn = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn().mockReturnThis(),
    };

    return {
        auth: {
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn(),
        },
        from: vi.fn(() => fromReturn),
        // Expose the mock chain for assertions
        _mocks: {
            fromReturn,
        }
    };
};
