import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Clock,
    Users,
    Coffee,
    AlertCircle,
    Search,
    Filter,
    Download,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import { activityService, ActivityLog } from '../../../services/activityService';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { USER_ACTIVITY_TABLE } from '../../../models';

export const ActivityTracker: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [activityData, setActivityData] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [officeHours, setOfficeHours] = useState<{ start: string; end: string } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Pagination state
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadMore, setIsLoadMore] = useState(false);

    // Refs for stable access in effects
    const observerTarget = useRef<HTMLTableRowElement>(null);
    const activityDataRef = useRef<ActivityLog[]>([]);

    // Update ref when state changes
    useEffect(() => {
        activityDataRef.current = activityData;
    }, [activityData]);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchActivityData = useCallback(async (reset = false) => {
        if (!user?.tenantId) return;

        try {
            if (reset) {
                setLoading(true);
                setError(null);
            } else {
                setIsLoadMore(true);
            }

            const currentPage = reset ? 0 : page;
            const { logs, hasMore: moreAvailable } = await activityService.getActivityLogs(user.tenantId, currentPage, 100);

            if (reset) {
                setActivityData(logs);
                setPage(1); // Next page
            } else {
                setActivityData(prev => [...prev, ...logs]);
                setPage(prev => prev + 1);
            }

            setHasMore(moreAvailable);

            // Fetch office hours only once initially
            if (reset) {
                const hours = await activityService.getOfficeHours(user.tenantId);
                if (hours) {
                    setOfficeHours({
                        start: hours.officeStartTime,
                        end: hours.officeEndTime
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching activity data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
        } finally {
            setLoading(false);
            setIsLoadMore(false);
        }
    }, [user?.tenantId, page]);

    const refreshData = useCallback(async () => {
        if (!user?.tenantId) return;
        try {
            const currentCount = activityDataRef.current.length;
            const pageSize = Math.max(100, currentCount);
            const { logs, hasMore: moreAvailable } = await activityService.getActivityLogs(user.tenantId, 0, pageSize);
            setActivityData(logs);
            setPage(Math.ceil(logs.length / 100));
            setHasMore(moreAvailable);
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }, [user?.tenantId]);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    useEffect(() => {
        if (user?.tenantId) {
            fetchActivityData(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.tenantId]);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !isLoadMore) {
                    fetchActivityData(false);
                }
            },
            { threshold: 0.5 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [fetchActivityData, hasMore, loading, isLoadMore]);

    // 3. Real-time activity listener
    useEffect(() => {
        if (!user?.tenantId) return;

        const channel = supabase
            .channel('activity_tracker_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: USER_ACTIVITY_TABLE
                },
                (payload) => {
                    const newData = payload.new as Record<string, unknown>;
                    const oldData = payload.old as Record<string, unknown>;
                    const tenantId = newData?.tenant_id || oldData?.tenant_id;

                    if (tenantId !== user.tenantId) return;

                    if (payload.eventType === 'INSERT') {
                        refreshData();
                    } else if (payload.eventType === 'UPDATE') {
                        setActivityData(prevData =>
                            prevData.map(log => {
                                if (log.id === newData.employee_id) {
                                    // Calculate deltas for aggregate fields
                                    const breakDelta = (Number(newData.total_break_time) || 0) - (Number(oldData?.total_break_time) || 0);
                                    const idleDelta = (Number(newData.total_idle_time) || 0) - (Number(oldData?.total_idle_time) || 0);

                                    return {
                                        ...log,
                                        status: newData.status as 'Online' | 'Break' | 'Offline' | 'Idle',
                                        rawLastActive: (newData.last_active_time as string) || log.rawLastActive,
                                        todayTotalBreakMinutes: (log.todayTotalBreakMinutes || 0) + breakDelta,
                                        currentBreakStart: (newData.current_break_start as string) || null,
                                        rawLoginTime: (newData.login_time as string) || log.rawLoginTime,
                                        totalIdleMinutes: (log.totalIdleMinutes || 0) + idleDelta
                                    };
                                }
                                return log;
                            })
                        );
                    } else if (payload.eventType === 'DELETE') {
                        refreshData();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.tenantId, refreshData]);

    // 4. Session Reaper Effect (Strict 5-minute enforcement)
    useEffect(() => {
        if (!user?.tenantId) return;

        const reaperInterval = setInterval(async () => {
            const now = new Date();
            const staleLogs = activityDataRef.current.filter(log => {
                if (log.status === 'Offline') return false;
                const lastActive = log.rawLastActive ? new Date(log.rawLastActive) : new Date();
                const diffMins = (now.getTime() - lastActive.getTime()) / 60000;
                // Strict 5-minute timeout (3m Idle + 2m Buffer)
                return diffMins >= 5;
            });

            if (staleLogs.length > 0) {
                console.log(`🧹 Session Reaper: Found ${staleLogs.length} stale sessions. Cleaning up...`);
                for (const stale of staleLogs) {
                    try {
                        console.log(`📡 Reaper logging out ${stale.employeeName} (Inactive for 5m+)`);
                        await activityService.trackLogout(stale.id, 'Inactivity timeout (System)');
                    } catch (err) {
                        console.error(`❌ Reaper failed for ${stale.employeeName}:`, err);
                    }
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(reaperInterval);
    }, [user?.tenantId]);

    // Filter logic
    const filteredData = activityData.filter(log => {
        const matchesSearch = log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.teamName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Calculate real-time metrics
    const realTimeData = filteredData.map(log => {
        if (!log.rawLoginTime) return log;

        const now = currentTime;

        const lastActive = log.rawLastActive ? new Date(log.rawLastActive) : new Date();

        // Calculate durations in minutes
        // For Productive Time: Since 'log' comes from service with pre-calculated values based on historical data,
        // we essentially just need to add "live" updates to it.
        // The service already returns:
        // - todayTotalBreakMinutes (historical + manual breaks)
        // - totalIdleMinutes (historical accumulated)
        // - productiveTime (string)

        // We recalculate locally for immediate UI responsiveness:

        // 1. Current Session Duration (if online)
        if (log.status !== 'Offline') {
            // Logic handled by service base values + adjustments below
        }

        const diffMs = now.getTime() - lastActive.getTime();
        const inactiveMinutes = Math.floor(diffMs / 60000);

        // Break Time
        let totalBreakMinutes = log.todayTotalBreakMinutes || 0;
        if (log.status === 'Break' && log.currentBreakStart) {
            const breakStart = new Date(log.currentBreakStart);
            const currentBreakDuration = Math.floor((now.getTime() - breakStart.getTime()) / 60000);

            // Avoid double counting if service already included it? 
            // The service includes it in 'totalBreakTime' string but probably not in 'todayTotalBreakMinutes' 
            // if we are strictly using that for closed sessions. 
            // Let's assume todayTotalBreakMinutes includes closed sessions and closed manual breaks.
            // So we add current open break.
            totalBreakMinutes += currentBreakDuration;
        }

        let status = log.status;
        let totalIdleMinutes = log.totalIdleMinutes || 0;

        // Strict "3+2" (5 min) logic
        if (status !== 'Offline' && inactiveMinutes >= 5) {
            status = 'Offline';
        } else if (status === 'Online' && inactiveMinutes >= 3) {
            status = 'Idle';
        }

        if (status === 'Idle') {
            const additionalIdle = Math.max(0, inactiveMinutes - 3);
            totalIdleMinutes = log.totalIdleMinutes + additionalIdle;
        } else if (status === 'Offline' && log.status !== 'Offline') {
            // If they just became offline in UI, add the 2 minutes of idle time that led to it
            totalIdleMinutes = log.totalIdleMinutes + 2;
        }

        // Productive Time Recalculation
        // Productive = Total Logged - Idle - Break
        const currentProductiveMinutes = Math.max(0, log.totalLoggedInMinutes - totalIdleMinutes - totalBreakMinutes);

        // Format helpers
        const formatDuration = (mins: number) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

        const formatLastActive = (diffMins: number) => {
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const h = Math.floor(diffMins / 60);
            return `${h}h ago`;
        };

        return {
            ...log,
            status,
            lastActive: formatLastActive(inactiveMinutes),
            totalBreakTime: formatDuration(totalBreakMinutes),
            productiveTime: formatDuration(currentProductiveMinutes),
            idleTime: formatDuration(totalIdleMinutes)
        };
    });

    const stats = {
        total: realTimeData.length,
        online: realTimeData.filter(d => d.status === 'Online').length,
        onBreak: realTimeData.filter(d => d.status === 'Break').length,
        idle: realTimeData.filter(d => d.status === 'Idle').length
    };

    if (loading && page === 0) { // Only show full loader on initial load
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading activity data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-medium">Error loading activity data</p>
                    <p className="text-gray-600 text-sm mt-2">{error}</p>
                    <button
                        onClick={() => fetchActivityData(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const handleDownloadReport = async (type: 'daily' | 'monthly') => {
        if (!user?.tenantId) return;
        try {
            const csvContent = type === 'daily'
                ? await activityService.downloadDailyReport(user.tenantId)
                : await activityService.downloadMonthlyReport(user.tenantId);

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${type}_activity_report_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error(`Error downloading ${type} report:`, error);
            alert(`Failed to download ${type} report`);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                        Activity Tracker
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Monitor real-time telecaller status and productivity</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 font-mono text-lg">
                        <Clock className="w-5 h-5 text-blue-400" />
                        {currentTime.toLocaleTimeString()}
                    </div>
                    {officeHours && (
                        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-blue-900 font-medium">
                                    Office Hours: {officeHours.start} - {officeHours.end}
                                </span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDownloadReport('daily')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Daily Report
                        </button>
                        <button
                            onClick={() => handleDownloadReport('monthly')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Monthly Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Total</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
                    <p className="text-sm text-gray-600">Total Employees Tracked</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Active Now</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.online}</h3>
                    <p className="text-sm text-gray-600">Currently Online</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Coffee className="w-6 h-6 text-orange-600" />
                        </div>
                        <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-full">On Break</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.onBreak}</h3>
                    <p className="text-sm text-gray-600">Currently on Break</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">Idle</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.idle}</h3>
                    <p className="text-sm text-gray-600">Idle &gt; 3 mins</p>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employees or teams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        >
                            <option value="All">All Status</option>
                            <option value="Online">Online</option>
                            <option value="Break">On Break</option>
                            <option value="Idle">Idle</option>
                            <option value="Offline">Offline</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Login Time</th>
                                <th className="px-6 py-4 font-semibold">Total Break</th>
                                <th className="px-6 py-4 font-semibold">Productive Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {realTimeData.length > 0 ? (
                                realTimeData.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${log.avatarColor}`}>
                                                    {log.employeeName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{log.employeeName}</p>
                                                    <p className="text-xs text-gray-500">{log.teamName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${log.status === 'Online' ? 'bg-green-100 text-green-800' :
                                                    log.status === 'Break' ? 'bg-orange-100 text-orange-800' :
                                                        log.status === 'Idle' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                          ${log.status === 'Online' ? 'bg-green-600' :
                                                        log.status === 'Break' ? 'bg-orange-600' :
                                                            log.status === 'Idle' ? 'bg-red-600' :
                                                                'bg-gray-600'}`}></span>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{log.loginTime}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {log.totalBreakTime} <span className="text-xs text-gray-400">({log.breakCount || 0})</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-green-600">{log.productiveTime}</span>
                                        </td>

                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="text-lg font-medium">No activity logs found</p>
                                            <p className="text-sm">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {/* Sentinel for infinite scroll */}
                            {hasMore && !loading && (
                                <tr ref={observerTarget}>
                                    <td colSpan={5} className="py-4 text-center">
                                        {isLoadMore ? (
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-sm text-gray-500">Loading more...</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Scroll to load more</span>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
