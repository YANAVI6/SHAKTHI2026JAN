import React from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import type { ReportFilter, ReportPeriod } from '../../../types/reports';

interface ReportFiltersProps {
  filters: ReportFilter;
  onFiltersChange: (filters: ReportFilter) => void;
  showTelecallerFilter?: boolean;
  showTeamFilter?: boolean;
  telecallers?: Array<{ id: string; name: string; emp_id: string }>;
  teams?: Array<{ id: string; team_name: string }>;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  showTelecallerFilter = true,
  showTeamFilter = false,
  telecallers = [],
  teams = []
}) => {
  const handlePeriodChange = (period: ReportPeriod) => {
    const now = new Date();
    let dateFrom = '';
    const dateTo = new Date().toISOString().split('T')[0];

    if (period === 'daily') {
      dateFrom = dateTo;
    } else if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom = weekAgo.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFrom = monthStart.toISOString().split('T')[0];
    }

    onFiltersChange({ ...filters, period, dateFrom, dateTo });
  };

  const handleReset = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof ReportFilter];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Period
          </label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map(period => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filters.period === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {showTelecallerFilter && telecallers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Telecaller
            </label>
            <select
              multiple
              value={filters.telecallerId || []}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                onFiltersChange({ ...filters, telecallerId: selected });
              }}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              size={3}
            >
              {telecallers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.emp_id})
                </option>
              ))}
            </select>
          </div>
        )}

        {showTeamFilter && teams.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Team
            </label>
            <select
              multiple
              value={filters.teamId || []}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                onFiltersChange({ ...filters, teamId: selected });
              }}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              size={3}
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.team_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
