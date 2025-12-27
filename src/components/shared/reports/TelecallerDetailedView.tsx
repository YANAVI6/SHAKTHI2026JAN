import React from 'react';
import { User, Target, Phone, DollarSign, TrendingUp, Award } from 'lucide-react';
import type { TelecallerPerformanceData } from '../../../types/reports';
import { ReportPieChart } from '../ReportPieChart';
import { formatIndianCurrency } from '../../../utils/dateUtils';

interface TelecallerDetailedViewProps {
  telecaller: TelecallerPerformanceData;
  isLoading: boolean;
}

export const TelecallerDetailedView: React.FC<TelecallerDetailedViewProps> = ({
  telecaller,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-32" />
        ))}
      </div>
    );
  }

  const caseStatusLabels = ['Pending', 'In Progress', 'Resolved', 'Closed'];
  const caseStatusData = [
    telecaller.cases_pending,
    telecaller.cases_in_progress,
    telecaller.cases_resolved,
    telecaller.cases_closed
  ];
  const caseStatusColors = ['#F59E0B', '#3B82F6', '#10B981', '#6B7280'];

  const periodCallsLabels = ['Daily', 'Weekly', 'Monthly'];
  const periodCallsData = [
    telecaller.daily_calls,
    telecaller.weekly_calls,
    telecaller.monthly_calls
  ];

  const periodCollectionLabels = ['Daily', 'Weekly', 'Monthly'];
  const periodCollectionData = [
    telecaller.daily_collection,
    telecaller.weekly_collection,
    telecaller.monthly_collection
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{telecaller.telecaller_name}</h2>
            <p className="text-sm text-gray-600">
              Employee ID: {telecaller.telecaller_emp_id}
              {telecaller.team_name && ` • Team: ${telecaller.team_name}`}
            </p>
          </div>
          {telecaller.ranking && (
            <div className="text-center">
              <Award className="w-10 h-10 text-yellow-500 mx-auto mb-1" />
              <div className="text-sm font-medium text-gray-700">Rank #{telecaller.ranking}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-blue-600" />
            <span className="text-sm text-gray-600">Cases Assigned</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{telecaller.total_cases_assigned}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-6 h-6 text-green-600" />
            <span className="text-sm text-gray-600">Total Calls</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{telecaller.total_calls_made}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
            <span className="text-sm text-gray-600">Total Collection</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {formatIndianCurrency(telecaller.total_amount_collected)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-orange-600" />
            <span className="text-sm text-gray-600">Success Rate</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{telecaller.call_success_rate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportPieChart
          title="Case Status Distribution"
          labels={caseStatusLabels}
          data={caseStatusData}
          colors={caseStatusColors}
          height={280}
        />

        <ReportPieChart
          title="Calls by Period"
          labels={periodCallsLabels}
          data={periodCallsData}
          height={280}
        />

        <ReportPieChart
          title="Collection by Period"
          labels={periodCollectionLabels}
          data={periodCollectionData}
          height={280}
          showPercentage={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Daily Calls</span>
                <span className="text-lg font-bold text-gray-900">{telecaller.daily_calls}</span>
              </div>
              <div className="text-xs text-gray-500">
                Today's calling activity
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Weekly Calls</span>
                <span className="text-lg font-bold text-gray-900">{telecaller.weekly_calls}</span>
              </div>
              <div className="text-xs text-gray-500">
                Last 7 days performance
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Monthly Calls</span>
                <span className="text-lg font-bold text-gray-900">{telecaller.monthly_calls}</span>
              </div>
              {telecaller.target_calls && (
                <>
                  <div className="text-xs text-gray-500 mb-2">
                    Target: {telecaller.target_calls} ({telecaller.call_target_achievement}% achieved)
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(telecaller.call_target_achievement, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Call Duration</span>
                <span className="text-lg font-bold text-gray-900">
                  {Math.floor(telecaller.average_call_duration / 60)}m {telecaller.average_call_duration % 60}s
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Daily Collection</span>
                <span className="text-lg font-bold text-green-600">
                  {formatIndianCurrency(telecaller.daily_collection)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Today's collections
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Weekly Collection</span>
                <span className="text-lg font-bold text-green-600">
                  {formatIndianCurrency(telecaller.weekly_collection)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Last 7 days collections
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Monthly Collection</span>
                <span className="text-lg font-bold text-green-600">
                  {formatIndianCurrency(telecaller.monthly_collection)}
                </span>
              </div>
              {telecaller.target_collection && (
                <>
                  <div className="text-xs text-gray-500 mb-2">
                    Target: {formatIndianCurrency(telecaller.target_collection)} ({telecaller.collection_target_achievement}% achieved)
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(telecaller.collection_target_achievement, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">PTP Fulfillment</span>
                <span className="text-lg font-bold text-purple-600">
                  {telecaller.ptp_fulfillment_rate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Performance Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Call Efficiency</div>
              <div className="text-sm text-gray-600">
                {telecaller.call_success_rate}% of calls result in positive outcomes
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Case Progress</div>
              <div className="text-sm text-gray-600">
                {((telecaller.cases_resolved + telecaller.cases_closed) / telecaller.total_cases_assigned * 100).toFixed(1)}% of cases resolved or closed
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Collection Rate</div>
              <div className="text-sm text-gray-600">
                Average {formatIndianCurrency(telecaller.total_amount_collected / telecaller.total_cases_assigned)} per case
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5" />
            <div>
              <div className="font-medium text-gray-900">Activity Level</div>
              <div className="text-sm text-gray-600">
                {(telecaller.total_calls_made / telecaller.total_cases_assigned).toFixed(1)} calls per case on average
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
