import React, { useState, useEffect, useCallback } from 'react';
import { Users, Target, TrendingUp, Phone, DollarSign, Award, ChevronDown, ChevronUp, Bug, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ReportPieChart } from '../shared/ReportPieChart';
import { formatIndianCurrency } from '../../utils/dateUtils';
import { DataDebugModal } from './DataDebugModal';
import { TelecallerCaseExplorerModal } from './modals/TelecallerCaseExplorerModal';

interface TeamData {
  id: string;
  team_name: string;
  product_name: string;
  telecaller_count: number;
  total_cases: number;
  cases_pending: number;
  cases_in_progress: number;
  cases_resolved: number;
  cases_closed: number;
  total_calls: number;
  total_collected: number;
  individual_targets: number;
  team_target: number;
  achievement_percentage: number;
}

export const TeamPerformanceMetrics: React.FC = () => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [telecallers, setTelecallers] = useState<{ id: string; name: string }[]>([]);
  const [selectedTelecallerId, setSelectedTelecallerId] = useState<string>('all');
  const [telecallerMetrics, setTelecallerMetrics] = useState<{
    totalCases: number;
    pending: number;
    inProgress: number;
    resolved: number;
    closed: number;
    totalCollected: number;
    monthlyTarget: number;
    achievement: number;
    ptpCount: number;
    ptpPosValue: number;
    rnrCount: number;
    callbackCount: number;
    totalCalls: number;
  } | null>(null);
  const [showCaseExplorer, setShowCaseExplorer] = useState(false);
  const { user } = useAuth();

  const loadTeamData = useCallback(async () => {
    if (!user || !user.tenantId) return;

    setIsLoading(true);
    try {
      console.log('=== Starting Team Data Load ===');
      console.log('User Tenant ID:', user.tenantId);

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, product_name, tenant_id, status')
        .eq('tenant_id', user.tenantId)
        .eq('status', 'active');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      if (!teamsData || teamsData.length === 0) {
        console.log('No teams found');
        setTeams([]);
        setIsLoading(false);
        return;
      }

      console.log('✅ Fetched teams:', teamsData);
      console.log('Number of teams:', teamsData.length);

      const processedTeams: TeamData[] = await Promise.all(
        teamsData.map(async (team) => {
          console.log(`\n--- Processing Team: ${team.name} (ID: ${team.id}) ---`);

          const { data: teamTelecallers, error: ttError } = await supabase
            .from('team_telecallers')
            .select(`
              employees:telecaller_id(id, name, emp_id, role, status)
            `)
            .eq('team_id', team.id);

          if (ttError) {
            console.error('Error fetching telecallers for team:', team.id, ttError);
          }

          // Extract telecaller data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const teamEmployees = teamTelecallers?.map((tt: any) => tt.employees).filter((emp: any) =>
            emp && emp.role?.toLowerCase() === 'telecaller' && emp.status?.toLowerCase() === 'active'
          ) || [];

          console.log(`Telecallers in ${team.name}:`, teamEmployees.length, teamEmployees);

          const telecallerIds = teamEmployees.map(emp => emp.id);
          console.log(`Telecaller IDs for ${team.name}:`, telecallerIds);

          // Fetch cases for this team in batches
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const teamCases: any[] = [];
          let casesPage = 0;
          let casesHasMore = true;

          while (casesHasMore) {
            let casesQuery = supabase
              .from('customer_cases')
              .select('id, case_status, telecaller_id');
            // REMOVED: .eq('team_id', team.id) -> reliable aggregation by telecaller

            // Filter by telecaller_id
            if (telecallerIds.length > 0) {
              casesQuery = casesQuery.in('telecaller_id', telecallerIds);
            } else {
              // If no telecallers, fetch nothing (or cases directly assigned to team if that's a thing? Assuming telecaller-centric)
              casesHasMore = false;
              break;
            }

            const { data: casesBatch, error: casesError } = await casesQuery.range(casesPage * 1000, (casesPage + 1) * 1000 - 1);

            if (casesError) {
              console.error('Error fetching cases for team:', team.id, casesError);
              break;
            }

            if (casesBatch) {
              // use push for performance
              for (const c of casesBatch) {
                teamCases.push(c);
              }
              if (casesBatch.length < 1000) {
                casesHasMore = false;
              }
              casesPage++;
            } else {
              casesHasMore = false;
            }
          }



          console.log(`Cases for ${team.name}:`, teamCases?.length || 0, teamCases);

          const telecallerCount = teamEmployees?.length || 0;
          const casesPending = teamCases?.filter(c => c.case_status === 'pending').length || 0;
          const casesInProgress = teamCases?.filter(c => c.case_status === 'in_progress').length || 0;
          const casesResolved = teamCases?.filter(c => c.case_status === 'resolved').length || 0;
          const casesClosed = teamCases?.filter(c => c.case_status === 'closed').length || 0;

          // Fetch call logs - try both methods
          let callLogsData = null;

          if (telecallerIds.length > 0) {
            // Method 1: Fetch by employee_id (most common)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let allCallLogs: any[] = [];
            let logsPage = 0;
            let logsHasMore = true;

            while (logsHasMore) {
              const { data: callLogs, error: callLogsError } = await supabase
                .from('case_call_logs')
                .select('id, amount_collected, employee_id')
                .in('employee_id', telecallerIds)
                .range(logsPage * 1000, (logsPage + 1) * 1000 - 1);

              if (callLogsError) {
                console.error(`Error fetching call logs for ${team.name}:`, callLogsError);
                break;
              }

              if (callLogs) {
                allCallLogs = [...allCallLogs, ...callLogs];
                if (callLogs.length < 1000) {
                  logsHasMore = false;
                }
                logsPage++;
              } else {
                logsHasMore = false;
              }
            }
            callLogsData = allCallLogs;
          }

          const totalCalls = callLogsData?.length || 0;
          const totalCollected = callLogsData?.reduce((sum, log) => sum + (parseFloat(log.amount_collected) || 0), 0) || 0;

          console.log(`Call logs for ${team.name}:`, totalCalls, 'calls, Total collected:', totalCollected);

          let individualTargets = 0;

          if (telecallerIds.length > 0) {
            const { data: targets, error: targetsError } = await supabase
              .from('telecaller_targets')
              .select('monthly_collections_target')
              .in('telecaller_id', telecallerIds);

            if (targetsError) {
              console.error('Error fetching targets:', targetsError);
            } else if (targets) {
              console.log(`Targets for ${team.name}:`, targets);
              individualTargets = targets.reduce((sum, t) => {
                const targetValue = parseFloat(t.monthly_collections_target || '0');
                console.log('  - Target value:', t.monthly_collections_target, 'Parsed:', targetValue);
                return sum + targetValue;
              }, 0);
              console.log(`Total individual targets for ${team.name}:`, individualTargets);
            } else {
              console.log(`No targets found for ${team.name}`);
            }
          }

          const teamTarget = individualTargets;
          const achievementPercentage = teamTarget > 0 ? (totalCollected / teamTarget) * 100 : 0;

          const teamData = {
            id: team.id,
            team_name: team.name,
            product_name: team.product_name,
            telecaller_count: telecallerCount,
            total_cases: teamCases?.length || 0,
            cases_pending: casesPending,
            cases_in_progress: casesInProgress,
            cases_resolved: casesResolved,
            cases_closed: casesClosed,
            total_calls: totalCalls,
            total_collected: totalCollected,
            individual_targets: individualTargets,
            team_target: teamTarget,
            achievement_percentage: Math.round(achievementPercentage),
          };

          console.log(`Summary for ${team.name}:`, teamData);
          return teamData;
        })
      );

      console.log('\n=== Final Processed Teams Data ===');
      console.log('Total teams processed:', processedTeams.length);
      console.log('Processed teams:', processedTeams);
      setTeams(processedTeams);
    } catch (error) {
      console.error('❌ Error loading team data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTeamData();
    }
  }, [user, loadTeamData]);

  // Fetch Telecallers when Team Changes
  useEffect(() => {
    const fetchTelecallers = async () => {
      console.log('Fetching telecallers for team:', selectedTeamId);

      if (selectedTeamId !== 'all') {
        const { data, error } = await supabase
          .from('team_telecallers')
          .select(`
            employees:telecaller_id(id, name)
          `)
          .eq('team_id', selectedTeamId);

        if (error) {
          console.error('Error fetching team telecallers:', error);
          setTelecallers([]);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const employees = data?.map((tt: any) => tt.employees).filter(Boolean) || [];
          console.log('Fetched team telecallers:', employees);
          setTelecallers(employees);
        }
      } else if (user?.tenantId) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name')
          .eq('tenant_id', user.tenantId)
          .ilike('role', 'telecaller')
          .ilike('status', 'active');

        if (error) {
          console.error('Error fetching all telecallers:', error);
          setTelecallers([]);
        } else {
          console.log('Fetched all telecallers:', data);
          setTelecallers(data || []);
        }
      }
    };

    if (user?.tenantId) {
      fetchTelecallers();
    }
  }, [selectedTeamId, user?.tenantId]);

  // Fetch Telecaller Metrics
  useEffect(() => {
    const fetchTelecallerMetrics = async () => {
      if (selectedTelecallerId === 'all') {
        setTelecallerMetrics(null);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch Cases in batches
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cases: any[] = [];
        let cPage = 0;
        let cHasMore = true;

        while (cHasMore) {
          const { data: batch, error } = await supabase
            .from('customer_cases')
            .select('*')
            .eq('telecaller_id', selectedTelecallerId)
            .range(cPage * 1000, (cPage + 1) * 1000 - 1);

          if (error) {
            console.error('Error fetching telecaller cases:', error);
            break;
          }

          if (batch) {
            cases = [...cases, ...batch];
            if (batch.length < 1000) cHasMore = false;
            cPage++;
          } else {
            cHasMore = false;
          }
        }

        // Fetch Call Logs in batches
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let logs: any[] = [];
        let lPage = 0;
        let lHasMore = true;

        while (lHasMore) {
          const { data: batch, error } = await supabase
            .from('case_call_logs')
            .select('*')
            .eq('employee_id', selectedTelecallerId)
            .range(lPage * 1000, (lPage + 1) * 1000 - 1);

          if (error) {
            console.error('Error fetching telecaller logs:', error);
            break;
          }

          if (batch) {
            logs = [...logs, ...batch];
            if (batch.length < 1000) lHasMore = false;
            lPage++;
          } else {
            lHasMore = false;
          }
        }

        // Fetch Target
        const { data: target } = await supabase
          .from('telecaller_targets')
          .select('*')
          .eq('telecaller_id', selectedTelecallerId)
          .maybeSingle();

        const totalCases = cases?.length || 0;
        const pending = cases?.filter(c => c.case_status === 'pending').length || 0;
        const inProgress = cases?.filter(c => c.case_status === 'in_progress').length || 0;
        const resolved = cases?.filter(c => c.case_status === 'resolved').length || 0;
        const closed = cases?.filter(c => c.case_status === 'closed').length || 0;

        const totalCalls = logs?.length || 0;
        const totalCollected = logs?.reduce((sum, log) => sum + (parseFloat(log.amount_collected) || 0), 0) || 0;
        const monthlyTarget = typeof target?.monthly_collections_target === 'string'
          ? parseFloat(target.monthly_collections_target)
          : (target?.monthly_collections_target || 0);

        // Calculate new metrics
        const ptpLogs = logs?.filter(l => l.call_status === 'PTP') || [];
        const ptpCount = ptpLogs.length;
        const rnrCount = logs?.filter(l => l.call_status === 'RNR').length || 0;
        const callbackCount = logs?.filter(l => l.call_status === 'CALL_BACK').length || 0;

        // Calculate PTP POS Value (linking log.case_id to case.id)
        let ptpPosValue = 0;
        if (cases && ptpLogs.length > 0) {
          const caseMap = new Map(cases.map(c => [c.id, c]));

          ptpLogs.forEach(log => {
            const relatedCase = caseMap.get(log.case_id);
            if (relatedCase) {
              // Try to find POS amount in various fields
              let amount = 0;
              // Check top level
              if (relatedCase.pos_amount) amount = parseFloat(relatedCase.pos_amount);
              else if (relatedCase.total_outstanding) amount = parseFloat(relatedCase.total_outstanding);
              // Check case_data
              else if (relatedCase.case_data) {
                const cd = relatedCase.case_data;
                const val = cd.pos_amount || cd.total_outstanding || cd['sc.pos_amount'] || cd['POS Amount'] || cd.pos || 0;
                amount = parseFloat(String(val).replace(/,/g, ''));
              }

              if (!isNaN(amount)) {
                ptpPosValue += amount;
              }
            }
          });
        }

        setTelecallerMetrics({
          totalCases,
          pending,
          inProgress,
          resolved,
          closed,
          totalCalls,
          totalCollected,
          monthlyTarget,
          achievement: monthlyTarget > 0 ? (totalCollected / monthlyTarget) * 100 : 0,
          ptpCount,
          ptpPosValue,
          rnrCount,
          callbackCount
        });

      } catch (error) {
        console.error('Error fetching telecaller metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTelecallerMetrics();
  }, [selectedTelecallerId]);

  const downloadTelecallerReport = () => {
    if (!telecallerMetrics || selectedTelecallerId === 'all') return;

    const telecallerName = telecallers.find(t => t.id === selectedTelecallerId)?.name || 'Telecaller';
    const date = new Date().toISOString().split('T')[0];

    const csvContent = [
      ['Telecaller Performance Report'],
      [`Telecaller Name: ${telecallerName}`],
      [`Date: ${date}`],
      [],
      ['Metric', 'Value'],
      ['Total Cases', telecallerMetrics.totalCases],
      ['Pending Cases', telecallerMetrics.pending],
      ['In Progress Cases', telecallerMetrics.inProgress],
      ['Resolved Cases', telecallerMetrics.resolved],
      ['Closed Cases', telecallerMetrics.closed],
      ['Total Calls Made', telecallerMetrics.totalCalls],
      ['Total Collected Amount', telecallerMetrics.totalCollected],
      ['Monthly Target', telecallerMetrics.monthlyTarget],
      ['Achievement %', `${telecallerMetrics.achievement.toFixed(2)}%`],
      [],
      ['Additional Metrics', ''],
      ['PTP Count', telecallerMetrics.ptpCount],
      ['PTP POS Value', telecallerMetrics.ptpPosValue],
      ['RNR Count', telecallerMetrics.rnrCount],
      ['Callback Count', telecallerMetrics.callbackCount]
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${telecallerName.replace(/\s+/g, '_')}_Report_${date}.csv`;
    a.click();
  };

  const filteredTeams = selectedTeamId === 'all'
    ? teams
    : teams.filter(t => t.id === selectedTeamId);

  const totalTeamTarget = filteredTeams.reduce((sum, t) => sum + t.team_target, 0);
  const totalCollected = filteredTeams.reduce((sum, t) => sum + t.total_collected, 0);
  const totalCases = filteredTeams.reduce((sum, t) => sum + t.total_cases, 0);
  const totalTelecallers = filteredTeams.reduce((sum, t) => sum + t.telecaller_count, 0);
  const overallAchievement = totalTeamTarget > 0 ? (totalCollected / totalTeamTarget) * 100 : 0;



  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clean Header with Team Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Team Performance Metrics</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Team:</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
              >
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.team_name} - {team.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Telecaller:</label>
              <select
                value={selectedTelecallerId}
                onChange={(e) => setSelectedTelecallerId(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
              >
                <option value="all">All Telecallers</option>
                {telecallers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowDebugModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              title="Open Debug Panel"
            >
              <Bug className="w-4 h-4" />
              Debug
            </button>
          </div>
        </div>
      </div>

      {selectedTelecallerId !== 'all' && telecallerMetrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {telecallers.find(t => t.id === selectedTelecallerId)?.name}'s Performance Report
              </h3>
              <p className="text-sm text-gray-600">Detailed metrics for selected telecaller</p>
            </div>
            <button
              onClick={downloadTelecallerReport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collection Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-600 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-green-800">Total Collected</div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatIndianCurrency(telecallerMetrics.totalCollected)}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Target</span>
                  <span className="font-medium text-green-900">{formatIndianCurrency(telecallerMetrics.monthlyTarget)}</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min(telecallerMetrics.achievement, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-green-700 text-right">{telecallerMetrics.achievement.toFixed(1)}% Achieved</div>
              </div>
            </div>

            {/* Calls Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-800">Total Calls</div>
                  <div className="text-2xl font-bold text-blue-900">{telecallerMetrics.totalCalls}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/50 p-2 rounded">
                  <div className="text-blue-700 text-xs">Avg Calls/Case</div>
                  <div className="font-bold text-blue-900">
                    {telecallerMetrics.totalCases > 0 ? (telecallerMetrics.totalCalls / telecallerMetrics.totalCases).toFixed(1) : '0'}
                  </div>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <div className="text-blue-700 text-xs">Total PTP</div>
                  <div className="font-bold text-blue-900">{telecallerMetrics.ptpCount}</div>
                </div>
                <div className="bg-white/50 p-2 rounded col-span-2">
                  <div className="flex justify-between items-center">
                    <div className="text-blue-700 text-xs">PTP POS Value</div>
                    <div className="font-bold text-blue-900">{formatIndianCurrency(telecallerMetrics.ptpPosValue)}</div>
                  </div>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <div className="text-blue-700 text-xs">RNR</div>
                  <div className="font-bold text-blue-900">{telecallerMetrics.rnrCount}</div>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <div className="text-blue-700 text-xs">Callbacks</div>
                  <div className="font-bold text-blue-900">{telecallerMetrics.callbackCount}</div>
                </div>
              </div>
            </div>

            {/* Cases Card */}
            <div
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
              onClick={() => setShowCaseExplorer(true)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-800">Total Cases</div>
                  <div className="text-2xl font-bold text-purple-900">{telecallerMetrics.totalCases}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between bg-white/50 p-1.5 rounded">
                  <span>Pending</span>
                  <span className="font-bold">{telecallerMetrics.pending}</span>
                </div>
                <div className="flex justify-between bg-white/50 p-1.5 rounded">
                  <span>In Progress</span>
                  <span className="font-bold">{telecallerMetrics.inProgress}</span>
                </div>
                <div className="flex justify-between bg-white/50 p-1.5 rounded">
                  <span>Resolved</span>
                  <span className="font-bold">{telecallerMetrics.resolved}</span>
                </div>
                <div className="flex justify-between bg-white/50 p-1.5 rounded">
                  <span>Closed</span>
                  <span className="font-bold">{telecallerMetrics.closed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold text-blue-900">{filteredTeams.length}</div>
          </div>
          <div className="text-sm font-medium text-blue-700">
            {selectedTeamId === 'all' ? 'Active Teams' : 'Selected Team'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold text-purple-900">{totalTelecallers}</div>
          </div>
          <div className="text-sm font-medium text-purple-700">Total Telecallers</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold text-orange-900">{totalCases}</div>
          </div>
          <div className="text-sm font-medium text-orange-700">Total Cases</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold text-green-900">{Math.round(overallAchievement)}%</div>
          </div>
          <div className="text-sm font-medium text-green-700">Achievement</div>
        </div>
      </div>

      {/* Single Donut Chart - Collection vs Target */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Collection Performance Overview</h3>
        {filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              {totalTeamTarget > 0 ? (
                <ReportPieChart
                  title="Target vs Collection"
                  labels={['Collected', 'Remaining']}
                  data={[totalCollected, Math.max(0, totalTeamTarget - totalCollected)]}
                  height={320}
                  showPercentage={true}
                />
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div style={{ height: '320px' }} className="flex flex-col items-center justify-center">
                    <DollarSign className="w-16 h-16 text-green-600 mb-4" />
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-900 mb-2">
                        {formatIndianCurrency(totalCollected)}
                      </div>
                      <div className="text-sm text-gray-600">Total Collections</div>
                      <div className="text-xs text-orange-600 mt-3 bg-orange-50 px-4 py-2 rounded-lg border border-orange-200">
                        No targets set for telecallers
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Total Collection</span>
                </div>
                <div className="text-3xl font-bold text-green-900">{formatIndianCurrency(totalCollected)}</div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Total Target</span>
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {totalTeamTarget > 0 ? formatIndianCurrency(totalTeamTarget) : 'Not Set'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Remaining</span>
                </div>
                <div className="text-3xl font-bold text-orange-900">
                  {totalTeamTarget > 0 ? formatIndianCurrency(Math.max(0, totalTeamTarget - totalCollected)) : 'N/A'}
                </div>
              </div>

              {totalTeamTarget > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Achievement Progress</span>
                    <span className="text-lg font-bold text-purple-900">{Math.round(overallAchievement)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${overallAchievement >= 100
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : overallAchievement >= 75
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : overallAchievement >= 50
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                      style={{ width: `${Math.min(overallAchievement, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[320px] text-gray-400">
            <Users className="w-16 h-16 mb-3 opacity-30" />
            <p className="text-sm">No teams found</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredTeams.map((team, index) => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{team.team_name}</h3>
                      <p className="text-sm text-gray-600">Product: {team.product_name}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">{team.achievement_percentage}%</div>
                      <div className="text-xs text-gray-600">Achievement</div>
                    </div>
                    <button
                      onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                      className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
                    >
                      {expandedTeam === team.id ? (
                        <ChevronUp className="w-6 h-6 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-blue-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">Telecallers</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{team.telecaller_count}</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="text-xs text-purple-700 font-medium">Total Cases</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">{team.total_cases}</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Collected</span>
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {formatIndianCurrency(team.total_collected)}
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <span className="text-xs text-orange-700 font-medium">Team Target</span>
                  </div>
                  <div className="text-lg font-bold text-orange-900">
                    {formatIndianCurrency(team.team_target)}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs text-indigo-700 font-medium">Total Calls</span>
                  </div>
                  <div className="text-2xl font-bold text-indigo-900">{team.total_calls}</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Target Progress</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatIndianCurrency(team.total_collected)} / {formatIndianCurrency(team.team_target)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {team.team_target > 0 ? `${team.achievement_percentage}% achieved` : 'No target set'}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${team.achievement_percentage >= 100
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : team.achievement_percentage >= 75
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : team.achievement_percentage >= 50
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                    style={{ width: `${Math.min(team.achievement_percentage, 100)}%` }}
                  />
                </div>
              </div>

              {expandedTeam === team.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Case Status Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="text-xs text-yellow-700 font-medium mb-1">Pending</div>
                      <div className="text-2xl font-bold text-yellow-900">{team.cases_pending}</div>
                      <div className="text-xs text-yellow-600 mt-1">
                        {team.total_cases > 0 ? `${Math.round((team.cases_pending / team.total_cases) * 100)}%` : '0%'}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-xs text-blue-700 font-medium mb-1">In Progress</div>
                      <div className="text-2xl font-bold text-blue-900">{team.cases_in_progress}</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {team.total_cases > 0 ? `${Math.round((team.cases_in_progress / team.total_cases) * 100)}%` : '0%'}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-xs text-green-700 font-medium mb-1">Resolved</div>
                      <div className="text-2xl font-bold text-green-900">{team.cases_resolved}</div>
                      <div className="text-xs text-green-600 mt-1">
                        {team.total_cases > 0 ? `${Math.round((team.cases_resolved / team.total_cases) * 100)}%` : '0%'}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-700 font-medium mb-1">Closed</div>
                      <div className="text-2xl font-bold text-gray-900">{team.cases_closed}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {team.total_cases > 0 ? `${Math.round((team.cases_closed / team.total_cases) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Performance Insights
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5" />
                        <div>
                          <span className="font-medium text-gray-900">Efficiency Rate: </span>
                          <span className="text-gray-700">
                            {team.total_cases > 0
                              ? `${Math.round(((team.cases_resolved + team.cases_closed) / team.total_cases) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                        <div>
                          <span className="font-medium text-gray-900">Avg Collection per Case: </span>
                          <span className="text-gray-700">
                            {team.total_cases > 0 ? formatIndianCurrency(team.total_collected / team.total_cases) : '₹0'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5" />
                        <div>
                          <span className="font-medium text-gray-900">Avg Calls per Case: </span>
                          <span className="text-gray-700">
                            {team.total_cases > 0 ? (team.total_calls / team.total_cases).toFixed(1) : '0'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5" />
                        <div>
                          <span className="font-medium text-gray-900">Target per Telecaller: </span>
                          <span className="text-gray-700">
                            {team.telecaller_count > 0
                              ? formatIndianCurrency(team.team_target / team.telecaller_count)
                              : '₹0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Telecaller Case Explorer Modal */}
      {user?.tenantId && (
        <TelecallerCaseExplorerModal
          isOpen={showCaseExplorer}
          onClose={() => setShowCaseExplorer(false)}
          tenantId={user.tenantId}
          initialTeamId={selectedTeamId === 'all' ? '' : selectedTeamId}
          initialTelecallerId={selectedTelecallerId === 'all' ? '' : selectedTelecallerId}
        />
      )}

      {/* Debug Modal */}
      <DataDebugModal
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        teams={teams}
      />
    </div>
  );
};
