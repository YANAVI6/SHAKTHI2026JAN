import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Chart,
  TooltipItem
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReportPieChartProps {
  title: string;
  labels: string[];
  data: number[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  showPercentage?: boolean;
}

const DEFAULT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#F97316',
  '#84CC16'
];

export const ReportPieChart: React.FC<ReportPieChartProps> = ({
  title,
  labels,
  data,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  showPercentage = true
}) => {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        },
        padding: {
          top: 10,
          bottom: 20
        },
        color: '#111827'
      },
      legend: {
        display: showLegend,
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          boxHeight: 15,
          padding: 15,
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: (chart: Chart) => {
            const data = chart.data;
            if (data.labels?.length && data.datasets.length) {
              return data.labels.map((label: unknown, i: number) => {
                const value = (data.datasets[0].data as number[])[i];
                const total = (data.datasets[0].data as number[]).reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

                return {
                  text: showPercentage ? `${label}: ${value} (${percentage}%)` : `${label}: ${value}`,
                  fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function (context: TooltipItem<'pie'>) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div style={{ height: `${height}px` }}>
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};
