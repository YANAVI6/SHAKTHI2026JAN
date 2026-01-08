import React, { useMemo, useState, useEffect } from 'react';
import { MetricCard } from '../../shared/MetricCard';
import { Users, Briefcase, UserCheck, Phone, TrendingUp, AlertCircle, CheckCircle, Clock, DollarSign, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Employee } from '../../../types/employee';

interface DashboardOverviewProps {
  employees: Employee[];
  products: string[];
  teamIncharges: Employee[];
  telecallers: Employee[];
  admins: Employee[];
}

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalCollected: number;
  todayCollection: number;
  pendingFollowups: number;
  overdueCallbacks: number;
}

interface ChartDataPoint {
  date: string;
  collection: number;
  cases: number;
}

interface TeamPerformance {
  name: string;
  cases: number;
  collection: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  employees,
  products,
  teamIncharges,
  telecallers,
  admins,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    activeCases: 0,
    totalCollected: 0,
    todayCollection: 0,
    pendingFollowups: 0,
    overdueCallbacks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);

  const activeEmployees = useMemo(
    () => employees.filter(emp => emp.status === 'active'),
    [employees]
  );

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user?.tenantId) return;

      try {
        setLoading(true);

        // Fetch total and active cases
        const { count: totalCases } = await supabase
          .from('customer_cases')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenantId);

        const { count: activeCases } = await supabase
          .from('customer_cases')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenantId)
          .neq('case_status', 'closed');

        // Fetch total collected amount
        const { data: collectionData } = await supabase
          .from('customer_cases')
          .select('total_collected_amount')
          .eq('tenant_id', user.tenantId);

        const totalCollected = collectionData?.reduce((sum, c) => sum + (c.total_collected_amount || 0), 0) || 0;

        // Fetch today's collection
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: todayLogs } = await supabase
          .from('case_call_logs')
          .select('amount_collected')
          .eq('tenant_id', user.tenantId)
          .gte('created_at', today.toISOString())
          .gt('amount_collected', 0);

        const todayCollection = todayLogs?.reduce((sum, log) => sum + (log.amount_collected || 0), 0) || 0;

        // Fetch pending follow-ups
        const { count: pendingFollowups } = await supabase
          .from('customer_cases')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenantId)
          .lte('next_action_date', new Date().toISOString());

        // Fetch overdue callbacks
        const { count: overdueCallbacks } = await supabase
          .from('case_call_logs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', user.tenantId)
          .eq('call_status', 'CALL_BACK')
          .eq('callback_completed', false)
          .lt('callback_datetime', new Date().toISOString());

        // Fetch last 7 days data for charts
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });

        const chartDataPromises = last7Days.map(async (date) => {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          const { data: dayLogs } = await supabase
            .from('case_call_logs')
            .select('amount_collected')
            .eq('tenant_id', user.tenantId)
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDay.toISOString())
            .gt('amount_collected', 0);

          const dayCollection = dayLogs?.reduce((sum, log) => sum + (log.amount_collected || 0), 0) || 0;

          const { count: dayCases } = await supabase
            .from('customer_cases')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', user.tenantId)
            .gte('created_at', date.toISOString())
            .lt('created_at', nextDay.toISOString());

          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            collection: dayCollection,
            cases: dayCases || 0,
          };
        });

        const resolvedChartData = await Promise.all(chartDataPromises);
        setChartData(resolvedChartData);

        // Fetch team performance data
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name')
          .eq('tenant_id', user.tenantId);

        if (teams) {
          const teamPerfPromises = teams.slice(0, 6).map(async (team) => {
            const { count: teamCases } = await supabase
              .from('customer_cases')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', team.id)
              .neq('case_status', 'closed');

            const { data: teamCollectionData } = await supabase
              .from('customer_cases')
              .select('total_collected_amount')
              .eq('team_id', team.id);

            const teamCollection = teamCollectionData?.reduce((sum, c) => sum + (c.total_collected_amount || 0), 0) || 0;

            return {
              name: team.name,
              cases: teamCases || 0,
              collection: teamCollection,
            };
          });

          const resolvedTeamPerf = await Promise.all(teamPerfPromises);
          setTeamPerformance(resolvedTeamPerf);
        }

        setStats({
          totalCases: totalCases || 0,
          activeCases: activeCases || 0,
          totalCollected,
          todayCollection,
          pendingFollowups: pendingFollowups || 0,
          overdueCallbacks: overdueCallbacks || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user?.tenantId]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>

      {/* Employee Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Team Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Total Employees" value={activeEmployees.length} icon={Users} color="blue" />
          <MetricCard title="Admins" value={admins.length} icon={UserCheck} color="purple" />
          <MetricCard title="Products" value={products.length} icon={Briefcase} color="green" />
          <MetricCard title="Incharges" value={teamIncharges.length} icon={UserCheck} color="blue" />
          <MetricCard title="Telecallers" value={telecallers.length} icon={Phone} color="orange" />
        </div>
      </div>

      {/* Cases & Performance Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Cases & Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{loading ? '...' : stats.totalCases.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{loading ? '' : `${stats.activeCases} active`}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Collected</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{loading ? '...' : `₹${(stats.totalCollected / 100000).toFixed(1)}L`}</p>
                <p className="text-xs text-gray-500 mt-1">{loading ? '' : `₹${stats.todayCollection.toLocaleString()} today`}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{loading ? '...' : stats.pendingFollowups + stats.overdueCallbacks}</p>
                <p className="text-xs text-gray-500 mt-1">{loading ? '' : `${stats.overdueCallbacks} overdue`}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Charts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Company Growth Trends</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-base font-semibold text-gray-900 mb-4">Collection Trend (Last 7 Days)</h4>
            <div style={{ height: '250px' }} className="w-full flex items-center justify-center">
              {chartData.some(d => d.collection > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => `₹${(value || 0).toLocaleString()}`}
                    />
                    <Line type="monotone" dataKey="collection" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No collection data for last 7 days</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-base font-semibold text-gray-900 mb-4">New Cases (Last 7 Days)</h4>
            <div style={{ height: '250px' }} className="w-full flex items-center justify-center">
              {chartData.some(d => d.cases > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="cases" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No new cases in last 7 days</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Team Performance</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Active Cases by Team</h4>
              <div style={{ height: '250px' }} className="w-full flex items-center justify-center">
                {teamPerformance.some(t => t.cases > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={teamPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cases"
                      >
                        {teamPerformance.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-sm">No cases assigned to teams</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Collection by Team</h4>
              <div style={{ height: '250px' }} className="w-full flex items-center justify-center">
                {teamPerformance.some(t => t.collection > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={teamPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: number | undefined) => `₹${((value || 0) / 1000).toFixed(1)}K`}
                      />
                      <Bar dataKey="collection" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-400">
                    <p className="text-sm">No collections by teams yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Highlights */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Today's Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Today's Collection</p>
                <p className="text-2xl font-bold text-blue-600">₹{loading ? '...' : stats.todayCollection.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Overdue Callbacks</p>
                <p className="text-2xl font-bold text-orange-600">{loading ? '...' : stats.overdueCallbacks}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Active Cases</p>
                <p className="text-2xl font-bold text-green-600">{loading ? '...' : stats.activeCases}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Performance</h3>
            <p className="text-purple-100 text-sm">
              Your team is managing {stats.activeCases} active cases with a total collection of ₹{(stats.totalCollected / 100000).toFixed(2)}L
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Target className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-xs text-purple-100">Collection Rate</p>
            <p className="text-xl font-bold mt-1">{stats.totalCases > 0 ? ((stats.totalCollected / stats.totalCases).toFixed(0)) : '0'}</p>
            <p className="text-xs text-purple-100">per case</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-xs text-purple-100">Active Rate</p>
            <p className="text-xl font-bold mt-1">{stats.totalCases > 0 ? ((stats.activeCases / stats.totalCases * 100).toFixed(0)) : '0'}%</p>
            <p className="text-xs text-purple-100">of total</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-xs text-purple-100">Avg per Telecaller</p>
            <p className="text-xl font-bold mt-1">{telecallers.length > 0 ? Math.floor(stats.activeCases / telecallers.length) : '0'}</p>
            <p className="text-xs text-purple-100">cases</p>
          </div>
        </div>
      </div>
    </div>
  );
};