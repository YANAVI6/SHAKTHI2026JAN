import { describe, it, expect } from 'vitest';
import {
    getDateRangeString,
    getCurrentPeriodLabel,
    formatIndianCurrency,
    getPerformanceStatus,
    getStatusColor,
    calculateProgress
} from '../dateUtils';

describe('dateUtils', () => {
    describe('getDateRangeString', () => {
        it('should return formatted date for daily', () => {
            const date = new Date().toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            expect(getDateRangeString('daily')).toBe(date);
        });

        it('should return formatted date range for weekly', () => {
            const range = getDateRangeString('weekly');
            expect(range).toContain('-');
        });

        it('should return formatted date for monthly', () => {
            const date = new Date().toLocaleDateString('en-IN', {
                month: 'long', year: 'numeric'
            });
            expect(getDateRangeString('monthly')).toBe(date);
        });
    });

    describe('getCurrentPeriodLabel', () => {
        it('should return correct labels', () => {
            expect(getCurrentPeriodLabel('daily')).toBe('Today');
            expect(getCurrentPeriodLabel('weekly')).toBe('This Week');
            expect(getCurrentPeriodLabel('monthly')).toBe('This Month');
        });
    });

    describe('formatIndianCurrency', () => {
        it('should format numbers correctly', () => {
            expect(formatIndianCurrency(1000)).toMatch(/₹\s?1,000/);
            expect(formatIndianCurrency(100000)).toMatch(/₹\s?1,00,000/);
            expect(formatIndianCurrency('50000')).toMatch(/₹\s?50,000/);
        });

        it('should handle invalid/null inputs', () => {
            expect(formatIndianCurrency(null)).toBe('₹0');
            expect(formatIndianCurrency(undefined)).toBe('₹0');
            expect(formatIndianCurrency('abc')).toBe('₹0');
        });
    });

    describe('getPerformanceStatus', () => {
        it('should return correct status based on percentage', () => {
            expect(getPerformanceStatus(80, 100)).toBe('on-track');
            expect(getPerformanceStatus(50, 100)).toBe('behind');
            expect(getPerformanceStatus(40, 100)).toBe('critical');
            expect(getPerformanceStatus(0, 0)).toBe('no-target');
        });
    });

    describe('getStatusColor', () => {
        it('should return correct color classes', () => {
            expect(getStatusColor('on-track')).toContain('green');
            expect(getStatusColor('behind')).toContain('yellow');
            expect(getStatusColor('critical')).toContain('red');
            expect(getStatusColor('no-target')).toContain('gray');
        });
    });

    describe('calculateProgress', () => {
        it('should calculate capped percentage', () => {
            expect(calculateProgress(50, 100)).toBe(50);
            expect(calculateProgress(150, 100)).toBe(100);
            expect(calculateProgress(0, 0)).toBe(0);
        });
    });
});
