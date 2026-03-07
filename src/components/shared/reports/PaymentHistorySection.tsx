import React, { useState, useEffect } from 'react';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AnalyticsService, PerformanceStats } from '../../../services/analyticsService';
import { IndianRupee, Phone, History, ArrowDown, Filter, Users } from 'lucide-react';
import { customerCaseService } from '../../../services/customerCaseService';
import { TeamService } from '../../../services/teamService';
import type { TeamInchargeCase } from '../../../types/caseManagement';

interface PaymentHistorySectionProps {
    user: {
        id: string;
        role: string;
        tenantId?: string;
    };
    onCaseClick?: (caseItem: TeamInchargeCase) => void;
    teamId?: string;
}


export const PaymentHistorySection: React.FC<PaymentHistorySectionProps> = ({ user, onCaseClick, teamId: initialTeamId }) => {
    const [cases, setCases] = useState<TeamInchargeCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);

    // Filter states
    const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeamId || 'all');
    const [selectedTelecallerId, setSelectedTelecallerId] = useState<string>('all');
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [telecallers, setTelecallers] = useState<{ id: string; name: string; emp_id?: string; team_id?: string }[]>([]);

    // Analytics State
    const [stats, setStats] = useState<PerformanceStats>({
        totalCases: 0,
        totalPOS: 0,
        totalCollected: 0,
        statusDistribution: []
    });
    const [isStatsLoading, setIsStatsLoading] = useState(false);

    // Fetch Stats when filters change
    useEffect(() => {
        const fetchStats = async () => {
            if (!user.tenantId) return;
            setIsStatsLoading(true);
            try {
                const updatedStats = await AnalyticsService.getPerformanceStats(
                    user.tenantId,
                    selectedTeamId,
                    user.role === 'Telecaller' ? user.id : (selectedTelecallerId === 'all' ? undefined : selectedTelecallerId)
                );
                setStats(updatedStats);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setIsStatsLoading(false);
            }
        };
        fetchStats();
    }, [user.tenantId, selectedTeamId, selectedTelecallerId, user.role, user.id]);

    const loadData = async (pageNum: number, tId?: string, eId?: string) => {
        if (!user.tenantId) return;

        if (pageNum === 0) setIsLoading(true);
        else setIsLoadMoreLoading(true);

        try {
            const currentTeamId = tId === 'all' ? undefined : (tId || undefined);
            const currentEmployeeId = user.role === 'Telecaller' ? user.id : (eId === 'all' ? undefined : (eId || undefined));

            // 50 per page
            const data = await customerCaseService.getPaymentHistory(
                user.tenantId,
                currentEmployeeId,
                currentTeamId,
                pageNum,
                50
            );

            if (pageNum === 0) {
                setCases(data);
            } else {
                setCases(prev => [...prev, ...data]);
            }

            if (data.length < 50) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (error) {
            console.error('Error loading payment history:', error);
        } finally {
            setIsLoading(false);
            setIsLoadMoreLoading(false);
        }
    };

    // Load initial data and teams
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user.tenantId) return;

            if (user.role !== 'Telecaller') {
                try {
                    const fetchedTeams = await TeamService.getTeams(user.tenantId);
                    setTeams(fetchedTeams.filter(t => t.status === 'active'));
                } catch (error) {
                    console.error('Error fetching teams:', error);
                }
            }
        };

        fetchInitialData();
        setPage(0);
        loadData(0, selectedTeamId, selectedTelecallerId);
    }, [user.tenantId, user.role, user.id]);

    // Update telecallers when team changes
    useEffect(() => {
        const fetchTelecallers = async () => {
            if (!user.tenantId || user.role === 'Telecaller') return;

            try {
                if (selectedTeamId === 'all') {
                    const allTelecallers = await TeamService.getAllTelecallers(user.tenantId);
                    setTelecallers(allTelecallers);
                } else {
                    const teamMembers = await TeamService.getTeamMembers(selectedTeamId);
                    setTelecallers(teamMembers);
                }
            } catch (error) {
                console.error('Error fetching telecallers:', error);
            }
        };

        fetchTelecallers();
        // Reset telecaller filter when team changes
        if (selectedTelecallerId !== 'all') {
            setSelectedTelecallerId('all');
        } else {
            // Trigger refresh if telecaller was already 'all'
            setPage(0);
            loadData(0, selectedTeamId, 'all');
        }
    }, [selectedTeamId]);

    // Manual refresh for telecaller change
    useEffect(() => {
        if (page !== 0) {
            setPage(0);
        }
        loadData(0, selectedTeamId, selectedTelecallerId);
    }, [selectedTelecallerId]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadData(nextPage, selectedTeamId, selectedTelecallerId);
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl shadow-sm border border-green-200/50">
                        <History className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Performance Dashboard</h1>
                        <p className="text-gray-500 text-sm font-medium">Analytics, Payments & Case Management</p>
                    </div>
                </div>

                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-sm font-semibold text-gray-700">
                        {cases.length} <span className="text-gray-400 font-normal">Records Loaded</span>
                    </span>
                </div>
            </div>

            {/* Filter Toolbar */}
            {user.role !== 'Telecaller' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/60 sticky top-0 z-10 backdrop-blur-xl bg-white/90">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Team Filter */}
                        <div className="relative group">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-green-600 z-10">Team</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-green-600 transition-colors pointer-events-none">
                                    <Filter className="w-4 h-4" />
                                </div>
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2.5 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all cursor-pointer outline-none appearance-none"
                                >
                                    <option value="all">All Teams</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ArrowDown className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Telecaller Filter */}
                        <div className="relative group">
                            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-green-600 z-10">Telecaller</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-green-600 transition-colors pointer-events-none">
                                    <Users className="w-4 h-4" />
                                </div>
                                <select
                                    value={selectedTelecallerId}
                                    onChange={(e) => setSelectedTelecallerId(e.target.value)}
                                    disabled={telecallers.length === 0}
                                    className="block w-full pl-10 pr-10 py-2.5 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all cursor-pointer outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="all">
                                        {telecallers.length === 0 ? 'No Telecallers Found' : 'All Telecallers'}
                                    </option>
                                    {telecallers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} {t.emp_id ? `(${t.emp_id})` : ''}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <ArrowDown className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Metrics Section */}
            <PerformanceMetrics stats={stats} isLoading={isStatsLoading} />

            {/* Content Rendering - Always Payment History */}
            {cases.length === 0 && !isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IndianRupee className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
                    <p className="text-gray-500">No payment records found matching the criteria.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Received Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    {user.role !== 'Telecaller' && (
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telecaller</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading && page === 0 ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    cases.map((caseItem, index) => (
                                        <tr
                                            key={`${caseItem.id}-${index}`}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                            onClick={() => onCaseClick?.(caseItem)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{caseItem.customer_name || 'Unknown'}</div>
                                                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                    <Phone className="w-3 h-3" />
                                                    {caseItem.mobile_no || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">{caseItem.loan_id}</div>
                                                <div className="text-xs text-gray-500 mt-1 capitalize">{caseItem.product_name || 'Loan'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {caseItem.latest_payment_date
                                                            ? new Date(caseItem.latest_payment_date).toLocaleDateString()
                                                            : 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {caseItem.latest_payment_date
                                                            ? new Date(caseItem.latest_payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-green-600 flex items-center">
                                                        <IndianRupee className="w-3 h-3 mr-1" />
                                                        {caseItem.today_payment_amount || 0}
                                                    </span>
                                                    <span className="text-xs text-gray-500">Collected</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                    Payment Received
                                                </span>
                                            </td>
                                            {user.role !== 'Telecaller' && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-2">
                                                            {caseItem.telecaller?.name?.substring(0, 2).toUpperCase() || 'UN'}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{caseItem.telecaller?.name || 'Unassigned'}</div>
                                                            <div className="text-xs text-gray-500">{caseItem.telecaller?.emp_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {hasMore && (
                        <div className="p-4 flex justify-center border-t border-gray-100">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadMoreLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoadMoreLoading ? (
                                    <span>Loading...</span>
                                ) : (
                                    <>
                                        <ArrowDown className="w-4 h-4" />
                                        Load More Payments
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
