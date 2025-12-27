import { ChartOptions } from 'chart.js';

export const getColumnChartConfig = (
  labels: string[],
  currentData: number[],
  targetData: number[],
  type: 'calls' | 'collections'
): {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
      borderRadius: number;
    }>;
  };
  options: ChartOptions<'bar'>;
} => {
  const isCurrency = type === 'collections';
  const colors = type === 'calls'
    ? { current: 'rgba(59, 130, 246, 0.8)', target: 'rgba(59, 130, 246, 0.3)', border: 'rgba(59, 130, 246, 1)' }
    : { current: 'rgba(16, 185, 129, 0.8)', target: 'rgba(16, 185, 129, 0.3)', border: 'rgba(16, 185, 129, 1)' };

  return {
    data: {
      labels,
      datasets: [
        {
          label: 'Current',
          data: currentData,
          backgroundColor: colors.current,
          borderColor: colors.border,
          borderWidth: 2,
          borderRadius: 6
        },
        {
          label: 'Target',
          data: targetData,
          backgroundColor: colors.target,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (value === null) return `${label}: N/A`;
              if (isCurrency) {
                return `${label}: ₹${value.toLocaleString('en-IN')}`;
              }
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 11
            },
            callback: function (value) {
              if (isCurrency) {
                return '₹' + (value as number).toLocaleString('en-IN', { maximumFractionDigits: 0 });
              }
              return value;
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  };
};

export const getPieChartConfig = (
  current: number,
  target: number,
  type: 'calls' | 'collections'
): {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }>;
  };
  options: ChartOptions<'pie'>;
} => {
  const remaining = Math.max(target - current, 0);
  const isCurrency = type === 'collections';
  const colors = type === 'calls'
    ? { achieved: 'rgba(59, 130, 246, 0.8)', remaining: 'rgba(229, 231, 235, 0.8)' }
    : { achieved: 'rgba(16, 185, 129, 0.8)', remaining: 'rgba(229, 231, 235, 0.8)' };

  return {
    data: {
      labels: ['Achieved', 'Remaining'],
      datasets: [
        {
          data: [current, remaining],
          backgroundColor: [colors.achieved, colors.remaining],
          borderColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 11,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = target;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

              if (isCurrency) {
                return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
              }
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  };
};
