import { describe, it, expect } from 'vitest';
import { getRoleDisplayName, getRoleBasedTitle } from '../pageUtils';

describe('pageUtils', () => {
    describe('getRoleDisplayName', () => {
        it('should return correct display names', () => {
            expect(getRoleDisplayName('SuperAdmin')).toBe('Super Administrator');
            expect(getRoleDisplayName('CompanyAdmin')).toBe('Company Administrator');
            expect(getRoleDisplayName('TeamIncharge')).toBe('Team Incharge');
            expect(getRoleDisplayName('Telecaller')).toBe('Telecaller');
            expect(getRoleDisplayName('Unknown')).toBe('User');
        });
    });

    describe('getRoleBasedTitle', () => {
        it('should return title with tenant name if provided', () => {
            expect(getRoleBasedTitle('CompanyAdmin', 'My Corp')).toBe('Company Administrator Dashboard - My Corp');
        });

        it('should not include tenant for SuperAdmin', () => {
            expect(getRoleBasedTitle('SuperAdmin', 'My Corp')).toBe('Super Administrator Dashboard');
        });

        it('should return base title if no tenant', () => {
            expect(getRoleBasedTitle('Telecaller')).toBe('Telecaller Dashboard');
        });
    });
});
