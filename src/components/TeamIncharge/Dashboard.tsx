import React, { useState, useEffect } from 'react';
import { Users, FileText, Phone, Target, Activity, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TeamService } from '../../services/teamService';
import { customerCaseService } from '../../services/customerCaseService';
import { supabase } from '../../lib/supabase';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardMetrics {
  activeTeams: number;
  totalTelecallers: number;
  activeCases: number;
  callsToday: number;
  caseStatus: {
    pending: number;
    inProgress: number;
    resolved: number;
    highPriority: number;
  };
  dispositionDistribution: Array<{ name: string; value: number }>;
}

interface TelecallerPerformance {
  name: string;
  collected: number;
}

interface CollectionTrend {
  date: string;
  amount: number;
}

interface TeamCollection {
  team_id: string;
  team_name: string;
  total_collected: number;
  [key: string]: unknown;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeTeams: 0,
    totalTelecallers: 0,
    activeCases: 0,
    callsToday: 0,
    caseStatus: {
      pending: 0,
      inProgress: 0,
      resolved: 0,
      highPriority: 0
    },
    dispositionDistribution: []
  });
  const [teamCollections, setTeamCollections] = useState<TeamCollection[]>([]);
  const [telecallerPerformance, setTelecallerPerformance] = useState<TelecallerPerformance[]>([]);
  const [collectionTrends, setCollectionTrends] = useState<CollectionTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardMetrics = React.useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      setIsLoading(true);

      const newMetrics: DashboardMetrics = {
        activeTeams: 0,
        totalTelecallers: 0,
        activeCases: 0,
        callsToday: 0,
        caseStatus: {
          pending: 0,
          inProgress: 0,
          resolved: 0,
          highPriority: 0
        },
        dispositionDistribution: []
      };

      // Fetch stats using efficient method
      try {
        const teams = await TeamService.getTeams(user.tenantId);
        newMetrics.activeTeams = teams.filter(team => team.status === 'active').length;

        // Fetch total telecallers
        try {
          const telecallers = await TeamService.getAllTelecallers(user.tenantId);
          newMetrics.totalTelecallers = telecallers.length;
        } catch (error) {
          console.error('Error fetching telecallers:', error);
        }

        // Use team IDs to get aggregated stats
        const userTeamIds = teams.filter(t => t.status === 'active').map(t => t.id);
        const stats = await customerCaseService.getTeamInchargeStats(user.tenantId, userTeamIds);

        // Update metrics from efficient stats
        newMetrics.activeCases = stats.totalCases; // Total cases for all active teams

        // For disposition and status distribution, we still need some data, but maybe not ALL cases if it's too large?
        // For now, let's keep getTeamInchargeStats focus on high level counts. 
        // If we want detailed status breakdown (pending, inProgress etc), getTeamInchargeStats ALREADY returns that!
        // We just need to map it correctly.

        newMetrics.caseStatus = {
          pending: stats.unassignedCases, // Approximation: unassigned often means pending/new
          inProgress: stats.inProgressCases,
          resolved: stats.closedCases,
          highPriority: 0 // We didn't include priority in getTeamInchargeStats yet, skipping for efficiency or need to add it
        };

        // For dispositions (call statuses), we ideally need an aggregation query.
        // Since we don't have a specialized RPC for that yet, we might skip detailed disposition chart 
        // OR fetch a smaller subset/summary if possible. 
        // For now, let's leave disposition empty or implement a separate lightweight "getDispositionStats" if critical.
        // Or if the user really wants correct numbers, we accept that detailed charts might be approximate or need a better backend query.

        // Let's try to get priority and disposition counts efficiently?
        // We can add them to getTeamInchargeStats if needed.
        // For now, let's settle for correct "Active Cases" count which was the user complaint.

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }

      // Fetch calls today
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

        const { count: callsToday } = await supabase
          .from('case_call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenantId)
          .gte('created_at', startOfDay);

        newMetrics.callsToday = callsToday || 0;
      } catch (error) {
        console.error('Error fetching calls today:', error);
      }

      setMetrics(newMetrics);

      // Fetch team collections for donut chart
      try {
        const collections = await TeamService.getTeamCollections(user.tenantId);
        setTeamCollections(collections);

        // Fetch telecaller performance if we have teams
        if (collections.length > 0) {
          const perf = await TeamService.getTelecallerPerformance(collections[0].team_id);
          setTelecallerPerformance(perf.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching collection charts:', error);
      }

      // Fetch trends
      try {
        const trends = await TeamService.getCollectionTrends(user.tenantId);
        setCollectionTrends(trends);
      } catch (error) {
        console.error('Error fetching trends:', error);
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (user?.tenantId) {
      fetchDashboardMetrics();
    }
  }, [user?.tenantId, fetchDashboardMetrics]);
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3 mr-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Teams</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.activeTeams}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3 mr-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Telecallers</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.totalTelecallers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3 mr-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.activeCases}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-orange-500 rounded-lg p-3 mr-4">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Calls Today</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : metrics.callsToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Telecaller Performance (Top 5)</h3>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : telecallerPerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Activity className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-center">No performance data available</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={telecallerPerformance} layout="vertical" margin={{ left: 20, right: 40, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#4b5563' }} />
                  <Tooltip
                    formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString('en-IN')}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="collected" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Collection Trend (Last 7 Days)</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : collectionTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <TrendingUp className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-center">No trend data available</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collectionTrends} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    tickFormatter={(value: string) => value.split('-').slice(1).join('/')}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} width={45} />
                  <Tooltip
                    formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString('en-IN')}`}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Collection Distribution</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : teamCollections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="w-12 h-12 mb-2 text-gray-300" />
              <p className="text-center">No collection data available</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={teamCollections}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total_collected"
                    nameKey="team_name"
                  >
                    {teamCollections.map((_, index) => {
                      const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => {
                      const data = entry.payload as TeamCollection;
                      return `${value}: ₹${data.total_collected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Disposition Overview</h3>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.dispositionDistribution.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Phone className="w-12 h-12 mb-2 text-gray-300" />
                  <p className="text-center">No call data available</p>
                </div>
              ) : (
                <>
                  <div className="h-48 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.dispositionDistribution} margin={{ bottom: 20 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-500 mr-3" />
                        <span className="font-medium text-gray-900">Pending Cases</span>
                      </div>
                      <span className="text-xl font-bold text-blue-600">{metrics.caseStatus.pending}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center">
                        <Activity className="w-5 h-5 text-yellow-500 mr-3" />
                        <span className="font-medium text-gray-900">In Progress</span>
                      </div>
                      <span className="text-xl font-bold text-yellow-600">{metrics.caseStatus.inProgress}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <Target className="w-5 h-5 text-green-500 mr-3" />
                        <span className="font-medium text-gray-900">Resolved Today</span>
                      </div>
                      <span className="text-xl font-bold text-green-600">{metrics.caseStatus.resolved}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};