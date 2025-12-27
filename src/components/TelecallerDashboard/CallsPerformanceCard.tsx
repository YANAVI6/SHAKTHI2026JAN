import React from 'react';
import { Phone, Target, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import {
  getDateRangeString,
  calculateProgress
} from '../../utils/dateUtils';

ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CallsPerformanceCardProps {
  performanceData: {
    dailyCalls: { current: number; target: number };
    weeklyCalls: { current: number; target: number };
    monthlyCalls: { current: number; target: number };
  };
}

export const CallsPerformanceCard: React.FC<CallsPerformanceCardProps> = ({ performanceData }) => {
  const hasTargets = performanceData.monthlyCalls.target > 0;
  const monthlyProgress = calculateProgress(performanceData.monthlyCalls.current, performanceData.monthlyCalls.target);
  const remainingCalls = Math.max(performanceData.monthlyCalls.target - performanceData.monthlyCalls.current, 0);

  const monthlyPieData = {
    labels: ['Achieved', 'Remaining'],
    datasets: [
      {
        data: [
          performanceData.monthlyCalls.current,
          remainingCalls
        ],
        backgroundColor: ['#3B82F6', '#E5E7EB'],
        borderWidth: 0
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 15,
          font: {
            size: 12,
            weight: 'bold' as const
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        callbacks: {
          label: function (context: TooltipItem<'pie'>) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${value} calls (${percentage}%)`;
          }
        }
      }
    }
  };

  if (!hasTargets) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Call Performance</h3>
            <p className="text-sm text-gray-500">{getDateRangeString('monthly')}</p>
          </div>
        </div>
        <div className="text-center py-16">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-base font-medium text-gray-600 mb-2">No Targets Set</h4>
          <p className="text-sm text-gray-500">Contact your Team Incharge to set call targets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Phone className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Call Performance</h3>
          <p className="text-sm text-gray-500">{getDateRangeString('monthly')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-blue-600 mb-1">{monthlyProgress}%</div>
            <div className="text-sm text-gray-500">Monthly Achievement</div>
          </div>
          <div className="h-[240px] w-full max-w-[280px]">
            <Pie data={monthlyPieData} options={pieOptions} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200/50 flex-wrap gap-2">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
              <span className="font-semibold text-gray-700 whitespace-nowrap">Calls Made</span>
            </div>
            <span className="text-lg font-bold text-blue-700 break-all">{performanceData.monthlyCalls.current}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200/50 flex-wrap gap-2">
            <div className="flex items-center">
              <Target className="w-4 h-4 text-gray-600 mr-2" />
              <span className="font-semibold text-gray-700 whitespace-nowrap">Monthly Target</span>
            </div>
            <span className="text-lg font-bold text-gray-700 break-all">{performanceData.monthlyCalls.target}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200/50 flex-wrap gap-2">
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-orange-600 mr-2" />
              <span className="font-semibold text-gray-700 whitespace-nowrap">Remaining Calls</span>
            </div>
            <span className="text-lg font-bold text-orange-700 break-all">{remainingCalls}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200/50 flex-wrap gap-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-green-600 mr-2" />
              <span className="font-semibold text-gray-700 whitespace-nowrap">Today's Calls</span>
            </div>
            <span className="text-lg font-bold text-green-700 break-all">{performanceData.dailyCalls.current}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200/50 flex-wrap gap-2 md:col-span-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-purple-600 mr-2" />
              <span className="font-semibold text-gray-700 whitespace-nowrap">This Week's Calls</span>
            </div>
            <span className="text-lg font-bold text-purple-700 break-all">{performanceData.weeklyCalls.current}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
