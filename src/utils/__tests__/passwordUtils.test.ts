import { describe, it, expect, vi } from 'vitest';
import { hashPassword, comparePassword } from '../passwordUtils';
import bcrypt from 'bcryptjs';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn().mockResolvedValue(true)
    }
}));

describe('passwordUtils', () => {
    describe('hashPassword', () => {
        it('should hash a password', async () => {
            const password = 'test_password';
            const hashed = await hashPassword(password);
            expect(hashed).toBe('hashed_password');
            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        });
    });

    describe('comparePassword', () => {
        it('should return true if passwords match', async () => {
            const result = await comparePassword('password', 'hash');
            expect(result).toBe(true);
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
        });

        it('should handle comparison errors', async () => {
            vi.mocked(bcrypt.compare).mockRejectedValueOnce(new Error('error') as never);
            const result = await comparePassword('password', 'hash');
            expect(result).toBe(false);
        });
    });
});
