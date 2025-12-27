import { describe, it, expect } from 'vitest';
import { getColumnChartConfig, getPieChartConfig } from '../chartUtils';

describe('chartUtils', () => {
    describe('getColumnChartConfig', () => {
        it('should return chart data with correct structure', () => {
            const config = getColumnChartConfig(['Jan'], [100], [200], 'calls');
            expect(config.data.labels).toEqual(['Jan']);
            expect(config.data.datasets).toHaveLength(2);
            expect(config.data.datasets[0].label).toBe('Current');
            expect(config.data.datasets[1].label).toBe('Target');
        });

        it('should set colors based on type', () => {
            const callsConfig = getColumnChartConfig([], [], [], 'calls');
            expect(callsConfig.data.datasets[0].backgroundColor).toContain('59, 130, 246'); // Blue for calls

            const collectionsConfig = getColumnChartConfig([], [], [], 'collections');
            expect(collectionsConfig.data.datasets[0].backgroundColor).toContain('16, 185, 129'); // Green for collections
        });
    });

    describe('getPieChartConfig', () => {
        it('should calculate remaining value correctly', () => {
            const config = getPieChartConfig(60, 100, 'calls');
            // Dataset data: [current, remaining]
            expect(config.data.datasets[0].data).toEqual([60, 40]);
        });

        it('should handle over-achievement', () => {
            const config = getPieChartConfig(120, 100, 'calls');
            // Remaining should be 0
            expect(config.data.datasets[0].data).toEqual([120, 0]);
        });
    });
});
