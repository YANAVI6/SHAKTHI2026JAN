import React, { useState, useEffect } from 'react';
import { Users, Phone, CheckCircle, Clock, Activity, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
// import { supabase } from '../../../lib/supabase'; // Unused
import { TeamService } from '../../../services/teamService';
import { customerCaseService } from '../../../services/customerCaseService';

interface CaseDetail {
    id: string;
    loanId: string;
    customerName: string;
    mobileNo: string;
    callStatus: string;
    lastCallTime: string;
    callCount: number;
    // Full case details
    caseStatus?: string;
    dpd?: number;
    pos?: number;
    emi?: number;
    priority?: string;
}

interface TelecallerStats {
    id: string;
    name: string;
    teamName: string;
    totalCases: number;
    liveCases: number;
    completedToday: number;
    lastActivity: string;
    status: 'Online' | 'Offline' | 'Idle' | 'Break';
    casesDetails: CaseDetail[];
}

interface TeamStats {
    teamId: string;
    teamName: string;
    totalCases: number;
    liveCases: number;
    telecallers: TelecallerStats[];
}

export const LiveMonitoring: React.FC = () => {
    const { user } = useAuth();
    const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [expandedTelecallers, setExpandedTelecallers] = useState<Set<string>>(new Set());
    const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

    const toggleTelecaller = (telecallerId: string) => {
        setExpandedTelecallers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(telecallerId)) {
                newSet.delete(telecallerId);
            } else {
                newSet.add(telecallerId);
            }
            return newSet;
        });
    };

    const toggleCase = (caseId: string) => {
        setExpandedCases(prev => {
            const newSet = new Set(prev);
            if (newSet.has(caseId)) {
                newSet.delete(caseId);
            } else {
                newSet.add(caseId);
            }
            return newSet;
        });
    };

    const loadLiveData = async () => {
        if (!user?.tenantId) return;

        try {
            setLoading(true);

            let targetTeamIds: string[] = [];

            if (user.role === 'CompanyAdmin' || user.role === 'Admin') {
                const teams = await TeamService.getTeams(user.tenantId);
                targetTeamIds = teams.filter(t => t.status === 'active').map(t => t.id);
            } else if (user.teamId) {
                targetTeamIds = [user.teamId];
            } else {
                // Fallback for TeamIncharge if teamId not on user object directly (check TeamService)
                // But typically user.teamId is reliable. If not, fetch teams managed by user.
                const teams = await TeamService.getTeams(user.tenantId);
                targetTeamIds = teams
                    .filter(t => t.team_incharge_id === user.id && t.status === 'active')
                    .map(t => t.id);
            }

            if (targetTeamIds.length === 0) {
                setTeamStats([]);
                setLoading(false);
                return;
            }

            // Use the new optimized service method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stats: any[] = await customerCaseService.getLiveMonitoringStats(user.tenantId, targetTeamIds);

            setTeamStats(stats as TeamStats[]);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error loading live data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLiveData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.tenantId]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadLiveData();
        }, 30000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRefresh, user?.tenantId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Online': return 'bg-green-100 text-green-800';
            case 'Break': return 'bg-orange-100 text-orange-800';
            case 'Idle': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getCallStatusColor = (status: string) => {
        switch (status) {
            case 'PTP': return 'bg-green-100 text-green-800';
            case 'PAID': return 'bg-blue-100 text-blue-800';
            case 'RTP': return 'bg-red-100 text-red-800';
            case 'BPTP': return 'bg-orange-100 text-orange-800';
            case 'CALL_BACK': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const totalCases = teamStats.reduce((sum, team) => sum + team.totalCases, 0);
    const totalLiveCases = teamStats.reduce((sum, team) => sum + team.liveCases, 0);
    const totalTelecallers = teamStats.reduce((sum, team) => sum + team.telecallers.length, 0);
    const onlineTelecallers = teamStats.reduce(
        (sum, team) => sum + team.telecallers.filter(t => t.status === 'Online').length,
        0
    );

    if (loading && teamStats.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading live data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-600" />
                        Live Monitoring
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Real-time telecaller activity and case progress for today
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        Auto-refresh (30s)
                    </label>
                    <button
                        onClick={loadLiveData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{totalTelecallers}</h3>
                    <p className="text-sm text-gray-600">Total Telecallers</p>
                    <p className="text-xs text-green-600 mt-1">{onlineTelecallers} online now</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Phone className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{totalCases}</h3>
                    <p className="text-sm text-gray-600">Total Cases</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Activity className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{totalLiveCases}</h3>
                    <p className="text-sm text-gray-600">Live Cases Today</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {teamStats.reduce((sum, team) =>
                            sum + team.telecallers.reduce((s, t) => s + t.completedToday, 0), 0
                        )}
                    </h3>
                    <p className="text-sm text-gray-600">Completed Today</p>
                </div>
            </div>

            <div className="space-y-4">
                {teamStats.map((team) => (
                    <div key={team.teamId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">{team.teamName}</h3>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">
                                        Total Cases: <span className="font-semibold text-gray-900">{team.totalCases}</span>
                                    </span>
                                    <span className="text-gray-600">
                                        Live Cases: <span className="font-semibold text-green-600">{team.liveCases}</span>
                                    </span>
                                    <span className="text-gray-600">
                                        Telecallers: <span className="font-semibold text-blue-600">{team.telecallers.length}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telecaller</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cases</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Cases</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Today</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {team.telecallers.map((telecaller) => (
                                        <React.Fragment key={telecaller.id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                                            {telecaller.name.charAt(0)}
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm font-medium text-gray-900">{telecaller.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(telecaller.status)}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${telecaller.status === 'Online' ? 'bg-green-600' :
                                                            telecaller.status === 'Break' ? 'bg-orange-600' :
                                                                telecaller.status === 'Idle' ? 'bg-yellow-600' :
                                                                    'bg-gray-600'
                                                            }`}></span>
                                                        {telecaller.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{telecaller.totalCases}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-green-600">{telecaller.liveCases}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                        <span className="text-sm text-gray-900">{telecaller.completedToday}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{telecaller.lastActivity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {telecaller.casesDetails.length > 0 && (
                                                        <button
                                                            onClick={() => toggleTelecaller(telecaller.id)}
                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                                        >
                                                            {expandedTelecallers.has(telecaller.id) ? (
                                                                <>
                                                                    <ChevronUp className="w-4 h-4" />
                                                                    Hide
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="w-4 h-4" />
                                                                    View Cases
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedTelecallers.has(telecaller.id) && telecaller.casesDetails.length > 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                                                Cases Worked Today ({telecaller.casesDetails.length})
                                                            </h4>
                                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-gray-100">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Loan ID</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Customer Name</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Mobile</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Call Status</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Last Call</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Calls Today</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {telecaller.casesDetails.map((caseDetail) => (
                                                                            <React.Fragment key={caseDetail.id}>
                                                                                <tr className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-2 font-medium text-gray-900">{caseDetail.loanId}</td>
                                                                                    <td className="px-4 py-2 text-gray-700">{caseDetail.customerName}</td>
                                                                                    <td className="px-4 py-2 text-gray-600">{caseDetail.mobileNo}</td>
                                                                                    <td className="px-4 py-2">
                                                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCallStatusColor(caseDetail.callStatus)}`}>
                                                                                            {caseDetail.callStatus}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-gray-600">{caseDetail.lastCallTime}</td>
                                                                                    <td className="px-4 py-2 text-center">
                                                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                                                                            {caseDetail.callCount}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2">
                                                                                        <button
                                                                                            onClick={() => toggleCase(caseDetail.id)}
                                                                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                                                                                        >
                                                                                            {expandedCases.has(caseDetail.id) ? (
                                                                                                <>
                                                                                                    <EyeOff className="w-3 h-3" />
                                                                                                    Hide
                                                                                                </>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <Eye className="w-3 h-3" />
                                                                                                    Details
                                                                                                </>
                                                                                            )}
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                                {expandedCases.has(caseDetail.id) && (
                                                                                    <tr>
                                                                                        <td colSpan={7} className="px-4 py-3 bg-blue-50">
                                                                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                                                                                <div>
                                                                                                    <span className="font-semibold text-gray-700">Case Status:</span>
                                                                                                    <span className="ml-2 text-gray-900">{caseDetail.caseStatus || 'N/A'}</span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="font-semibold text-gray-700">DPD:</span>
                                                                                                    <span className="ml-2 text-gray-900">{caseDetail.dpd !== undefined ? caseDetail.dpd : 'N/A'}</span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="font-semibold text-gray-700">POS:</span>
                                                                                                    <span className="ml-2 text-gray-900">
                                                                                                        {caseDetail.pos !== undefined && caseDetail.pos !== null ? `₹${caseDetail.pos.toLocaleString()}` : 'N/A'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="font-semibold text-gray-700">EMI:</span>
                                                                                                    <span className="ml-2 text-gray-900">
                                                                                                        {caseDetail.emi !== undefined && caseDetail.emi !== null ? `₹${caseDetail.emi.toLocaleString()}` : 'N/A'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="font-semibold text-gray-700">Priority:</span>
                                                                                                    <span className="ml-2 text-gray-900">{caseDetail.priority || 'N/A'}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                )}
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {teamStats.length === 0 && !loading && (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No teams or telecallers found</p>
                </div>
            )}
        </div>
    );
};
