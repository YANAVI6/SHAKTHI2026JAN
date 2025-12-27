import React from 'react';
import { BarChart3, TrendingUp, Phone, DollarSign } from 'lucide-react';
import type { PerformanceMetrics } from '../../../types/reports';
import { ReportPieChart } from '../ReportPieChart';
import { formatIndianCurrency } from '../../../utils/dateUtils';

interface PerformanceAnalyticsViewProps {
  metrics: PerformanceMetrics;
  isLoading: boolean;
}

export const PerformanceAnalyticsView: React.FC<PerformanceAnalyticsViewProps> = ({
  metrics,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-64" />
        ))}
      </div>
    );
  }

  const caseStatusLabels = Object.keys(metrics.case_status_distribution).map(
    key => key.replace('_', ' ').toUpperCase()
  );
  const caseStatusData = Object.values(metrics.case_status_distribution);
  const caseStatusColors = ['#F59E0B', '#3B82F6', '#10B981', '#6B7280'];

  const callStatusLabels = Object.keys(metrics.call_status_distribution);
  const callStatusData = Object.values(metrics.call_status_distribution);

  const dpdBucketLabels = Object.keys(metrics.dpd_bucket_distribution);
  const dpdBucketData = Object.values(metrics.dpd_bucket_distribution);
  const dpdBucketColors = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

  const paymentStatusLabels = ['Success', 'Failed', 'Pending'];
  const paymentStatusData = [
    metrics.payment_status_distribution.success,
    metrics.payment_status_distribution.failed,
    metrics.payment_status_distribution.pending
  ];
  const paymentStatusColors = ['#10B981', '#EF4444', '#F59E0B'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">{metrics.total_cases}</span>
          </div>
          <div className="text-sm font-medium text-blue-700">Total Cases</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-green-900">{metrics.total_calls}</span>
          </div>
          <div className="text-sm font-medium text-green-700">Total Calls</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <span className="text-lg font-bold text-purple-900">
              {formatIndianCurrency(metrics.total_collection)}
            </span>
          </div>
          <div className="text-sm font-medium text-purple-700">Total Collection</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-orange-900">{metrics.resolution_rate}%</span>
          </div>
          <div className="text-sm font-medium text-orange-700">Resolution Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportPieChart
          title="Case Status Distribution"
          labels={caseStatusLabels}
          data={caseStatusData}
          colors={caseStatusColors}
          height={320}
        />

        <ReportPieChart
          title="Call Status Breakdown"
          labels={callStatusLabels}
          data={callStatusData}
          height={320}
        />

        <ReportPieChart
          title="DPD Bucket Distribution"
          labels={dpdBucketLabels}
          data={dpdBucketData}
          colors={dpdBucketColors}
          height={320}
        />

        <ReportPieChart
          title="Payment Status Distribution"
          labels={paymentStatusLabels}
          data={paymentStatusData}
          colors={paymentStatusColors}
          height={320}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">Collection Efficiency</h4>
            <div className="text-2xl font-bold text-blue-600">{metrics.collection_efficiency}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${metrics.collection_efficiency}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Percentage of cases with successful payments
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">Resolution Rate</h4>
            <div className="text-2xl font-bold text-green-600">{metrics.resolution_rate}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${metrics.resolution_rate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Percentage of resolved and closed cases
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">PTP Conversion</h4>
            <div className="text-2xl font-bold text-purple-600">{metrics.ptp_conversion_rate}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${metrics.ptp_conversion_rate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Promise to Pay fulfillment rate
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Active Cases</div>
              <div className="text-gray-600">
                {metrics.case_status_distribution.pending + metrics.case_status_distribution.in_progress} cases are currently being worked on
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Successful Closures</div>
              <div className="text-gray-600">
                {metrics.case_status_distribution.resolved + metrics.case_status_distribution.closed} cases have been successfully resolved
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Average Collection</div>
              <div className="text-gray-600">
                {metrics.total_cases > 0
                  ? formatIndianCurrency(metrics.total_collection / metrics.total_cases)
                  : '₹0'}{' '}
                per case
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Call Efficiency</div>
              <div className="text-gray-600">
                {metrics.total_cases > 0
                  ? (metrics.total_calls / metrics.total_cases).toFixed(1)
                  : '0'}{' '}
                calls per case on average
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
