import React, { useState, useEffect } from 'react';
import { Users, Phone, CheckCircle, Clock, Activity, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff, Edit, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
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

interface LiveMonitoringProps {
    onCaseClick?: (caseData: any) => void;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ onCaseClick }) => {
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
            case 'DISPUTE': return 'bg-red-100 text-red-800';
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
        <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                        Live Monitoring
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Real-time telecaller activity and case progress for today
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <div className="text-xs md:text-sm text-gray-600">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                    <label className="flex items-center gap-2 text-xs md:text-sm">
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
                        className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs md:text-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">{totalTelecallers}</h3>
                    <p className="text-xs md:text-sm text-gray-600">Total Telecallers</p>
                    <p className="text-xs text-green-600 mt-1">{onlineTelecallers} online now</p>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Phone className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                        </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">{totalCases}</h3>
                    <p className="text-xs md:text-sm text-gray-600">Total Cases</p>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Activity className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                        </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">{totalLiveCases}</h3>
                    <p className="text-xs md:text-sm text-gray-600">Live Cases Today</p>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Clock className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                        </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                        {teamStats.reduce((sum, team) =>
                            sum + team.telecallers.reduce((s, t) => s + t.completedToday, 0), 0
                        )}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">Completed Today</p>
                </div>
            </div>

            <div className="space-y-4">
                {teamStats.map((team) => (
                    <div key={team.teamId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h3 className="text-base md:text-lg font-semibold text-gray-900">{team.teamName}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm">
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
                                        <th className="px-4 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telecaller</th>
                                        <th className="px-4 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cases</th>
                                        <th className="px-4 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Cases</th>
                                        <th className="px-4 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Today</th>
                                        <th className="px-4 py-3 md:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {team.telecallers.map((telecaller) => (
                                        <React.Fragment key={telecaller.id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 md:px-6 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs md:text-sm">
                                                            {telecaller.name.charAt(0)}
                                                        </div>
                                                        <div className="ml-2 md:ml-3">
                                                            <p className="text-sm font-medium text-gray-900">{telecaller.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 md:px-6 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(telecaller.status)}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${telecaller.status === 'Online' ? 'bg-green-400' : telecaller.status === 'Idle' ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
                                                        {telecaller.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 md:px-6 whitespace-nowrap text-sm text-gray-900">{telecaller.totalCases}</td>
                                                <td className="px-4 py-3 md:px-6 whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-green-600">{telecaller.liveCases}</span>
                                                </td>
                                                <td className="px-4 py-3 md:px-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                        <span className="text-sm text-gray-900">{telecaller.completedToday}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 md:px-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {telecaller.casesDetails.length > 0 && (
                                                            <>
                                                                <button
                                                                    onClick={() => toggleTelecaller(telecaller.id)}
                                                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                                                >
                                                                    {expandedTelecallers.has(telecaller.id) ? (
                                                                        <>
                                                                            <ChevronUp className="w-4 h-4" />
                                                                            <span className="hidden sm:inline">Hide</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ChevronDown className="w-4 h-4" />
                                                                            <span className="hidden sm:inline">View Cases</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            if (telecaller.casesDetails.length === 0) {
                                                                                alert('No cases worked today');
                                                                                return;
                                                                            }

                                                                            // Get case IDs from today's worked cases
                                                                            const caseIds = telecaller.casesDetails.map((c: any) => c.id);

                                                                            // Fetch full call logs for these cases from today
                                                                            const today = new Date();
                                                                            today.setHours(0, 0, 0, 0);

                                                                            const { data: callLogs } = await supabase
                                                                                .from('case_call_logs')
                                                                                .select('*')
                                                                                .in('case_id', caseIds)
                                                                                .gte('created_at', today.toISOString())
                                                                                .order('created_at', { ascending: true });

                                                                            // Group call logs by case
                                                                            const logsByCase = new Map();
                                                                            callLogs?.forEach((log: any) => {
                                                                                if (!logsByCase.has(log.case_id)) {
                                                                                    logsByCase.set(log.case_id, []);
                                                                                }
                                                                                logsByCase.get(log.case_id).push(log);
                                                                            });

                                                                            // Create detailed CSV rows
                                                                            const rows: string[] = [];
                                                                            telecaller.casesDetails.forEach((caseDetail: any) => {
                                                                                const logs = logsByCase.get(caseDetail.id) || [];

                                                                                if (logs.length === 0) {
                                                                                    // Case with no calls today
                                                                                    rows.push([
                                                                                        caseDetail.loanId || '',
                                                                                        caseDetail.customerName || '',
                                                                                        caseDetail.mobileNo || '',
                                                                                        '',
                                                                                        '',
                                                                                        '',
                                                                                        '',
                                                                                        ''
                                                                                    ].join(','));
                                                                                } else {
                                                                                    // One row per call log
                                                                                    logs.forEach((log: any, index: number) => {
                                                                                        rows.push([
                                                                                            index === 0 ? caseDetail.loanId || '' : '',
                                                                                            index === 0 ? caseDetail.customerName || '' : '',
                                                                                            index === 0 ? caseDetail.mobileNo || '' : '',
                                                                                            log.call_status || '',
                                                                                            `"${(log.call_notes || '').replace(/"/g, '""')}"`,
                                                                                            log.amount_collected || '',
                                                                                            log.ptp_datetime ? new Date(log.ptp_datetime).toLocaleString() : '',
                                                                                            new Date(log.created_at).toLocaleTimeString()
                                                                                        ].join(','));
                                                                                    });
                                                                                }
                                                                            });

                                                                            const csvContent = [
                                                                                ['Loan ID', 'Customer Name', 'Mobile', 'Call Status', 'Remarks', 'Amount Collected', 'PTP Date', 'Call Time'].join(','),
                                                                                ...rows
                                                                            ].join('\n');

                                                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                                            const url = window.URL.createObjectURL(blob);
                                                                            const a = document.createElement('a');
                                                                            a.href = url;
                                                                            a.download = `${telecaller.name}_today_calls_${new Date().toISOString().split('T')[0]}.csv`;
                                                                            a.click();
                                                                            window.URL.revokeObjectURL(url);
                                                                        } catch (error) {
                                                                            console.error('Error downloading cases:', error);
                                                                            alert('Failed to download cases. Please try again.');
                                                                        }
                                                                    }}
                                                                    className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm font-medium"
                                                                    title="Download Today's Cases with Call Logs"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">Download</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedTelecallers.has(telecaller.id) && telecaller.casesDetails.length > 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-3 md:px-6 bg-gray-50">
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold text-gray-700 mb-2 md:mb-3">
                                                                Cases Worked Today ({telecaller.casesDetails.length})
                                                            </h4>
                                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Loan ID</th>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Customer Name</th>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Mobile</th>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Call Status</th>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Last Call</th>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Calls Today</th>
                                                                                <th className="px-3 py-2 md:px-4 text-left text-xs font-medium text-gray-600 whitespace-nowrap">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-200">
                                                                            {telecaller.casesDetails.map((caseDetail) => (
                                                                                <React.Fragment key={caseDetail.id}>
                                                                                    <tr className="hover:bg-gray-50">
                                                                                        <td className="px-3 py-2 md:px-4 font-medium text-gray-900 whitespace-nowrap">{caseDetail.loanId}</td>
                                                                                        <td className="px-3 py-2 md:px-4 text-gray-700 whitespace-nowrap">{caseDetail.customerName}</td>
                                                                                        <td className="px-3 py-2 md:px-4 text-gray-600 whitespace-nowrap">{caseDetail.mobileNo}</td>
                                                                                        <td className="px-3 py-2 md:px-4 whitespace-nowrap">
                                                                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCallStatusColor(caseDetail.callStatus)}`}>
                                                                                                {caseDetail.callStatus}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-3 py-2 md:px-4 text-gray-600 whitespace-nowrap">{caseDetail.lastCallTime}</td>
                                                                                        <td className="px-3 py-2 md:px-4 text-center whitespace-nowrap">
                                                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                                                                                {caseDetail.callCount}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-3 py-2 md:px-4 whitespace-nowrap">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <button
                                                                                                    onClick={() => toggleCase(caseDetail.id)}
                                                                                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                                                                                                >
                                                                                                    {expandedCases.has(caseDetail.id) ? (
                                                                                                        <>
                                                                                                            <EyeOff className="w-3 h-3" />
                                                                                                            <span className="hidden sm:inline">Hide</span>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <Eye className="w-3 h-3" />
                                                                                                            <span className="hidden sm:inline">Details</span>
                                                                                                        </>
                                                                                                    )}
                                                                                                </button>

                                                                                                {onCaseClick && (
                                                                                                    <button
                                                                                                        onClick={() => onCaseClick(caseDetail)}
                                                                                                        className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
                                                                                                        title="Manage Case"
                                                                                                    >
                                                                                                        <Edit className="w-3 h-3" />
                                                                                                        <span className="hidden sm:inline">Manage</span>
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                    {expandedCases.has(caseDetail.id) && (
                                                                                        <tr>
                                                                                            <td colSpan={7} className="px-3 py-2 md:px-4 bg-blue-50">
                                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 text-xs">
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
