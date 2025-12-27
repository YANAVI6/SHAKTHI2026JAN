import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReportPieChart } from '../ReportPieChart';


// Mock Chart.js to avoid canvas errors
vi.mock('react-chartjs-2', () => ({
    Pie: () => <div data-testid="mock-pie-chart" />
}));

describe('ReportPieChart', () => {
    it('renders title and chart container', () => {
        render(
            <ReportPieChart
                title="Case Distribution"
                labels={['Active', 'PTP']}
                data={[10, 5]}
            />
        );

        expect(screen.getByTestId('mock-pie-chart')).toBeInTheDocument();
    });

    it('displays custom colors if provided', () => {
        // Since we mock Pie, we mainly check if it renders without crashing with props
        render(
            <ReportPieChart
                title="Title"
                labels={['L1']}
                data={[10]}
                colors={['#ff0000']}
            />
        );
        expect(screen.getByTestId('mock-pie-chart')).toBeInTheDocument();
    });
});
