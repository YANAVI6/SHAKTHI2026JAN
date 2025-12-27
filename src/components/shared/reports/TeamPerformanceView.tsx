import React from 'react';
import { Users, TrendingUp, Phone, DollarSign } from 'lucide-react';
import type { TeamPerformanceData } from '../../../types/reports';
import { ReportPieChart } from '../ReportPieChart';
import { formatIndianCurrency } from '../../../utils/dateUtils';

interface TeamPerformanceViewProps {
  teams: TeamPerformanceData[];
  isLoading: boolean;
}

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  teams,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-32" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <div className="text-gray-400 text-lg mb-2">No team data available</div>
        <p className="text-gray-500 text-sm">Teams will appear here once configured</p>
      </div>
    );
  }

  const totalCollection = teams.reduce((sum, t) => sum + t.total_collection, 0);
  const totalCalls = teams.reduce((sum, t) => sum + t.total_calls, 0);

  const teamCollectionLabels = teams.map(t => t.team_name);
  const teamCollectionData = teams.map(t => t.total_collection);

  const teamCasesLabels = teams.map(t => t.team_name);
  const teamCasesData = teams.map(t => t.total_cases);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">{teams.length}</span>
          </div>
          <div className="text-sm font-medium text-blue-700">Active Teams</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <span className="text-lg font-bold text-green-900">
              {formatIndianCurrency(totalCollection)}
            </span>
          </div>
          <div className="text-sm font-medium text-green-700">Total Collection</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-purple-900">{totalCalls}</span>
          </div>
          <div className="text-sm font-medium text-purple-700">Total Calls</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportPieChart
          title="Collection by Team"
          labels={teamCollectionLabels}
          data={teamCollectionData}
          height={320}
          showPercentage={false}
        />

        <ReportPieChart
          title="Cases by Team"
          labels={teamCasesLabels}
          data={teamCasesData}
          height={320}
        />
      </div>

      <div className="space-y-4">
        {teams.map(team => (
          <div key={team.team_id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{team.team_name}</h3>
                  <p className="text-sm text-gray-600">Product: {team.product_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{team.achievement_percentage}%</div>
                  <div className="text-xs text-gray-600">Target Achievement</div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="text-xs text-yellow-700 mb-1">Assigned</div>
                  <div className="text-xl font-bold text-yellow-900">{team.cases_assigned}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">In Progress</div>
                  <div className="text-xl font-bold text-blue-900">{team.cases_in_progress}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-xs text-green-700 mb-1">Resolved</div>
                  <div className="text-xl font-bold text-green-900">{team.cases_resolved}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-700 mb-1">Closed</div>
                  <div className="text-xl font-bold text-gray-900">{team.cases_closed}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">Total</div>
                  <div className="text-xl font-bold text-purple-900">{team.total_cases}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-xs text-gray-500">Total Calls</div>
                    <div className="text-lg font-bold text-gray-900">{team.total_calls}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-xs text-gray-500">Collection</div>
                    <div className="text-sm font-bold text-gray-900">
                      {formatIndianCurrency(team.total_collection)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div>
                    <div className="text-xs text-gray-500">Telecallers</div>
                    <div className="text-lg font-bold text-gray-900">{team.active_telecallers}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  <div>
                    <div className="text-xs text-gray-500">Efficiency</div>
                    <div className="text-lg font-bold text-gray-900">{team.efficiency_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {team.target_amount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Target Progress</span>
                    <span className="text-sm text-blue-600">
                      {formatIndianCurrency(team.total_collection)} / {formatIndianCurrency(team.target_amount)}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(team.achievement_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
