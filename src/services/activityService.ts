import { supabase } from '../lib/supabase';
import { EMPLOYEE_TABLE, USER_ACTIVITY_TABLE } from '../models';

export interface ActivityLog {
    id: string;
    employeeName: string;
    teamName: string;
    status: 'Online' | 'Break' | 'Offline' | 'Idle';
    loginTime: string;
    lastActive: string;
    totalBreakTime: string;
    productiveTime: string;
    idleTime: string;
    avatarColor: string;
    todayTotalBreakMinutes: number;
    currentBreakStart: string | null;
    rawLoginTime: string;
    rawLastActive: string;
    totalIdleMinutes: number;
    totalLoggedInMinutes: number;
    breakCount: number;
}

export interface UserActivity {
    id: string;
    employee_id: string;
    tenant_id: string;
    status: 'Online' | 'Break' | 'Offline' | 'Idle';
    login_time: string;
    logout_time: string | null;
    last_active_time: string;
    current_break_start: string | null;
    total_break_time: number;
    total_idle_time: number;
    logout_reason?: string;
    break_count?: number;
}

const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
];

function getRandomColor(seed: string): string {
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function parseUTCDate(dateString: string): Date {
    if (!dateString) return new Date();
    if (!dateString.includes('Z') && !dateString.includes('+')) {
        return new Date(dateString + 'Z');
    }
    return new Date(dateString);
}

function formatTime(dateString: string): string {
    const date = parseUTCDate(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } else {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}

function getLastActiveText(lastActiveTime: string): string {
    const now = new Date();
    const lastActive = parseUTCDate(lastActiveTime);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else {
        const hours = Math.floor(diffMins / 60);
        return `${hours}h ago`;
    }
}

export const activityService = {
    async getActivityLogs(tenantId: string, page: number = 0, pageSize: number = 100): Promise<{ logs: ActivityLog[], hasMore: boolean }> {
        try {
            // Fetch active employees with pagination
            const { data: employees, error: empError } = await supabase
                .from(EMPLOYEE_TABLE)
                .select('id, name, emp_id, role, status')
                .eq('tenant_id', tenantId)
                .eq('status', 'active')
                .order('name', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (empError) throw new Error(empError.message);

            if (!employees || employees.length === 0) {
                return { logs: [], hasMore: false };
            }

            const hasMore = employees.length === pageSize;

            // Fetch activity sessions for today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: activities, error: actError } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('*')
                .eq('tenant_id', tenantId)
                .gte('login_time', todayStart.toISOString())
                .order('login_time', { ascending: false });

            if (actError) console.error('Error fetching activities:', actError);

            // Group activities by employee
            const employeeActivities = new Map<string, UserActivity[]>();
            if (activities) {
                activities.forEach(act => {
                    const empActs = employeeActivities.get(act.employee_id) || [];
                    empActs.push(act);
                    employeeActivities.set(act.employee_id, empActs);
                });
            }

            const now = new Date();
            const activityLogs: ActivityLog[] = employees.map((emp) => {
                const empActs = employeeActivities.get(emp.id) || [];

                if (empActs.length === 0) {
                    return {
                        id: emp.id,
                        employeeName: emp.name,
                        teamName: emp.role === 'TeamIncharge' ? 'Team Incharge' : 'Telecaller Team',
                        status: 'Offline',
                        loginTime: 'N/A',
                        lastActive: 'N/A',
                        totalBreakTime: '0m',
                        productiveTime: '0h 0m',
                        idleTime: '0m',
                        avatarColor: getRandomColor(emp.id),
                        todayTotalBreakMinutes: 0,
                        currentBreakStart: null,
                        rawLoginTime: '',
                        rawLastActive: '',
                        totalIdleMinutes: 0,
                        totalLoggedInMinutes: 0,
                        breakCount: 0
                    };
                }

                // 1. Login Time: First session's login time
                const firstSession = empActs[0];

                // 2. Current Status & Active Session
                const activeSession = empActs.find(a => !a.logout_time);

                let currentStatus: 'Online' | 'Break' | 'Offline' | 'Idle' = 'Offline';
                let rawLastActive = '';
                let currentBreakStart = null;

                if (activeSession) {
                    currentStatus = activeSession.status;
                    rawLastActive = activeSession.last_active_time;
                    currentBreakStart = activeSession.current_break_start;

                    // Check for Real-time Idle (3 mins threshold)
                    const lastActiveTime = parseUTCDate(activeSession.last_active_time);
                    const minutesInactive = Math.floor((now.getTime() - lastActiveTime.getTime()) / 60000);

                    if (currentStatus === 'Online' && minutesInactive > 3) {
                        currentStatus = 'Idle';
                    }
                } else {
                    const lastSession = empActs[empActs.length - 1];
                    rawLastActive = lastSession.logout_time || '';
                }

                // 3. Total Logged-in & Idle Time
                let totalLoggedInMinutes = 0;
                let totalIdleMinutes = 0;

                empActs.forEach(act => {
                    const start = parseUTCDate(act.login_time);
                    const end = act.logout_time ? parseUTCDate(act.logout_time) : now;
                    const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
                    totalLoggedInMinutes += Math.max(0, duration);

                    // Accumulate stored idle time
                    totalIdleMinutes += (act.total_idle_time || 0);

                    // Add current live idle time if applicable
                    if (!act.logout_time && currentStatus === 'Idle') {
                        const lastActive = parseUTCDate(act.last_active_time);
                        const currentIdle = Math.floor((now.getTime() - lastActive.getTime()) / 60000);
                        totalIdleMinutes += currentIdle;
                    }
                });

                // 4. Total Break Calculation
                let totalBreakMinutes = 0;

                // Sum field `total_break_time` from DB which tracks manual breaks
                const manualBreakMinutes = empActs.reduce((acc, curr) => acc + (curr.total_break_time || 0), 0);
                totalBreakMinutes += manualBreakMinutes;

                // 4b. Break Count
                const totalBreaks = empActs.reduce((acc, curr) => acc + (curr.break_count || 0), 0);

                // If currently on "Break" status
                if (currentStatus === 'Break' && currentBreakStart) {
                    const breakStart = parseUTCDate(currentBreakStart);
                    totalBreakMinutes += Math.floor((now.getTime() - breakStart.getTime()) / 60000);
                }

                // 5. Productive Time
                const sessionBreakMinutes = manualBreakMinutes + (currentStatus === 'Break' && currentBreakStart ? Math.floor((now.getTime() - parseUTCDate(currentBreakStart).getTime()) / 60000) : 0);
                const productiveMinutes = Math.max(0, totalLoggedInMinutes - totalIdleMinutes - sessionBreakMinutes);

                // Format helpers
                const formatDuration = (mins: number): string => {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    if (h > 0) return `${h}h ${m}m`;
                    return `${m}m`;
                };

                return {
                    id: emp.id,
                    employeeName: emp.name,
                    teamName: emp.role === 'TeamIncharge' ? 'Team Incharge' : 'Telecaller Team',
                    status: currentStatus,
                    loginTime: formatTime(firstSession.login_time),
                    lastActive: rawLastActive ? getLastActiveText(rawLastActive) : 'N/A',
                    totalBreakTime: formatDuration(totalBreakMinutes),
                    productiveTime: formatDuration(productiveMinutes),
                    idleTime: formatDuration(totalIdleMinutes),
                    avatarColor: getRandomColor(emp.id),
                    todayTotalBreakMinutes: totalBreakMinutes,
                    currentBreakStart: currentBreakStart,
                    rawLoginTime: firstSession.login_time,
                    rawLastActive: rawLastActive || '',
                    totalIdleMinutes: totalIdleMinutes,
                    totalLoggedInMinutes: totalLoggedInMinutes,
                    breakCount: totalBreaks
                };
            });

            return { logs: activityLogs, hasMore };
        } catch (error) {
            console.error('Error in getActivityLogs:', error);
            throw error;
        }
    },

    async getActivityStats(tenantId: string): Promise<{
        total: number;
        online: number;
        onBreak: number;
        idle: number;
    }> {
        try {
            const { logs } = await this.getActivityLogs(tenantId, 0, 1000);

            return {
                total: logs.length,
                online: logs.filter(l => l.status === 'Online').length,
                onBreak: logs.filter(l => l.status === 'Break').length,
                idle: logs.filter(l => l.status === 'Idle').length,
            };
        } catch (error) {
            console.error('Error in getActivityStats:', error);
            throw error;
        }
    },

    async trackLogout(employeeId: string, reason?: string): Promise<void> {
        try {
            console.log('🔴 Tracking logout for employee:', employeeId, 'Reason:', reason);
            const updateData: { logout_time: string; status: string; logout_reason?: string } = {
                logout_time: new Date().toISOString(),
                status: 'Offline'
            };

            if (reason) {
                updateData.logout_reason = reason;
            }

            const { error, data } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .update(updateData)
                .eq('employee_id', employeeId)
                .is('logout_time', null)
                .select();

            if (error) {
                console.error('❌ Error tracking logout:', error);
                throw error;
            }

            // Sync with Chat Status
            const { data: userData } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('tenant_id')
                .eq('employee_id', employeeId)
                .maybeSingle();
            if (userData?.tenant_id) {
                await this.syncChatStatus(employeeId, userData.tenant_id, 'offline');
            }

            console.log('✅ Logout tracked successfully. Records updated:', data?.length);
        } catch (error) {
            console.error('❌ Error tracking logout:', error);
        }
    },

    trackLogoutBeacon(employeeId: string, reason?: string): boolean {
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.error('Supabase URL or key not available');
                return false;
            }

            const updateData = {
                logout_time: new Date().toISOString(),
                status: 'Offline',
                logout_reason: reason || 'Page unload'
            };

            const url = `${supabaseUrl}/rest/v1/${USER_ACTIVITY_TABLE}?employee_id=eq.${employeeId}&logout_time=is.null`;

            fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData),
                keepalive: true
            }).catch(err => {
                console.error('Error in beacon logout:', err);
            });

            // Sync chat status via beacon
            const chatUrl = `${supabaseUrl}/rest/v1/chat_user_status?user_id=eq.${employeeId}`;
            fetch(chatUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: 'offline',
                    last_seen: new Date().toISOString()
                }),
                keepalive: true
            }).catch(err => {
                console.error('Error in beacon chat status sync:', err);
            });

            return true;
        } catch (error) {
            console.error('Error in trackLogoutBeacon:', error);
            return false;
        }
    },

    async updateLastActive(employeeId: string, tenantId: string, force: boolean = false): Promise<void> {
        try {
            const lastUpdateKey = `last_activity_update_${employeeId}`;
            const lastUpdate = localStorage.getItem(lastUpdateKey);
            const now = Date.now();

            // Throttle: Only update every 60s unless forced
            if (!force && lastUpdate && now - parseInt(lastUpdate) < 60000) {
                return;
            }

            console.log('💓 Sending heartbeat via RPC for:', employeeId);

            const { error } = await supabase.rpc('update_user_heartbeat', {
                p_employee_id: employeeId,
                p_tenant_id: tenantId
            });

            if (error) {
                console.error('❌ Error in heartbeat RPC:', error);
                throw error;
            }

            localStorage.setItem(lastUpdateKey, now.toString());

            // Sync chat status (optimistic update or fetch from DB? Let's just keep 'online')
            // The RPC handles the status logic, but we might want to sync chat
            await this.syncChatStatus(employeeId, tenantId, 'online');

        } catch (error) {
            console.error('Error updating last active:', error);
        }
    },

    async setIdle(employeeId: string): Promise<void> {
        try {
            await supabase
                .from(USER_ACTIVITY_TABLE)
                .update({
                    status: 'Idle'
                })
                .eq('employee_id', employeeId)
                .is('logout_time', null)
                .neq('status', 'Break');

            const { data: userData } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('tenant_id')
                .eq('employee_id', employeeId)
                .maybeSingle();
            if (userData?.tenant_id) {
                await this.syncChatStatus(employeeId, userData.tenant_id, 'idle');
            }
        } catch (error) {
            console.error('Error setting idle:', error);
        }
    },

    async resumeSession(employeeId: string, tenantId: string): Promise<void> {
        try {
            console.log('🔄 Resuming activity session for employee (RPC):', employeeId);

            const { error } = await supabase.rpc('resume_user_session', {
                p_tenant_id: tenantId,
                p_employee_id: employeeId,
                p_status: 'Online'
            });

            if (error) {
                console.error('❌ Error in resumeSession RPC:', error);
                throw error;
            }

            console.log('✅ Session resumed successfully via RPC for:', employeeId);
        } catch (error) {
            console.error('❌ Error resuming session:', error);
        }
    },

    async syncChatStatus(userId: string, tenantId: string, status: string): Promise<void> {
        try {
            let chatStatus = status.toLowerCase();
            if (chatStatus !== 'online' && chatStatus !== 'break' && chatStatus !== 'idle' && chatStatus !== 'offline') {
                chatStatus = 'online';
            }

            const { error } = await supabase
                .from('chat_user_status')
                .upsert({
                    user_id: userId,
                    tenant_id: tenantId,
                    status: chatStatus,
                    last_seen: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('❌ Error syncing chat status:', error);
            }
        } catch (error) {
            console.error('❌ Exception syncing chat status:', error);
        }
    },

    async startBreak(employeeId: string): Promise<void> {
        try {
            console.log('🟠 Starting break for employee:', employeeId);

            const { data: session, error: fetchError } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('id, break_count')
                .eq('employee_id', employeeId)
                .is('logout_time', null)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (!session) {
                console.warn('⚠️ No active session found to start break');
                return;
            }

            const now = new Date().toISOString();

            const { error: updateError } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .update({
                    status: 'Break',
                    current_break_start: now,
                    last_active_time: now,
                    break_count: (session.break_count || 0) + 1
                })
                .eq('id', session.id);

            if (updateError) throw updateError;

            const { data: userData } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('tenant_id')
                .eq('employee_id', employeeId)
                .maybeSingle();

            if (userData?.tenant_id) {
                await this.syncChatStatus(employeeId, userData.tenant_id, 'break');
            }

            console.log('✅ Break started successfully');
        } catch (error) {
            console.error('❌ Error in startBreak:', error);
            throw error;
        }
    },

    async endBreak(employeeId: string): Promise<void> {
        try {
            console.log('🟢 Ending break for employee:', employeeId);

            const { data: session, error: fetchError } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('id, current_break_start, total_break_time')
                .eq('employee_id', employeeId)
                .is('logout_time', null)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (!session || !session.current_break_start) {
                console.log('⚠️ No active break session found');
                return;
            }

            const breakStart = parseUTCDate(session.current_break_start);
            const now = new Date();
            const breakDuration = Math.floor((now.getTime() - breakStart.getTime()) / 60000);

            console.log('📊 Break duration:', breakDuration, 'minutes');

            const { error: updateError } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .update({
                    status: 'Online',
                    current_break_start: null,
                    total_break_time: (session.total_break_time || 0) + breakDuration,
                    last_active_time: now.toISOString()
                })
                .eq('id', session.id);

            if (updateError) throw updateError;

            const { data: userData } = await supabase
                .from(USER_ACTIVITY_TABLE)
                .select('tenant_id')
                .eq('employee_id', employeeId)
                .maybeSingle();

            if (userData?.tenant_id) {
                await this.syncChatStatus(employeeId, userData.tenant_id, 'online');
            }

            console.log('✅ Break ended successfully');
        } catch (error) {
            console.error('❌ Error in endBreak:', error);
            throw error;
        }
    },

    async getOfficeHours(tenantId: string): Promise<{
        officeStartTime: string;
        officeEndTime: string;
        timezone: string;
        workingDays: number[];
    } | null> {
        try {
            const { data, error } = await supabase
                .from('office_settings')
                .select('office_start_time, office_end_time, timezone, working_days')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (error) {
                return null;
            }

            if (!data) return null;

            return {
                officeStartTime: data.office_start_time,
                officeEndTime: data.office_end_time,
                timezone: data.timezone,
                workingDays: data.working_days
            };
        } catch (error) {
            console.error('Error fetching office hours:', error);
            return null;
        }
    },

    async saveOfficeHours(
        tenantId: string,
        officeStartTime: string,
        officeEndTime: string,
        timezone: string = 'Asia/Kolkata',
        workingDays: number[] = [1, 2, 3, 4, 5, 6]
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('office_settings')
                .upsert({
                    tenant_id: tenantId,
                    office_start_time: officeStartTime,
                    office_end_time: officeEndTime,
                    timezone,
                    working_days: workingDays,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'tenant_id'
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error saving office hours:', error);
            throw error;
        }
    },

    async downloadDailyReport(tenantId: string): Promise<string> {
        const { logs } = await this.getActivityLogs(tenantId, 0, 10000);

        const headers = ['Employee', 'Team', 'Date', 'First Login', 'Last Logout', 'Total Break Time', 'Break Count', 'Productive Time', 'Status'];
        const csvRows = [headers.join(',')];

        const todayStr = new Date().toLocaleDateString();

        logs.forEach(log => {
            csvRows.push([
                `"${log.employeeName}"`,
                `"${log.teamName}"`,
                `"${todayStr}"`,
                `"${log.loginTime}"`,
                `"${log.status === 'Offline' && log.rawLastActive ? formatTime(log.rawLastActive) : 'Active'}"`,
                `"${log.totalBreakTime}"`,
                `"${log.breakCount}"`,
                `"${log.productiveTime}"`,
                `"${log.status}"`
            ].join(','));
        });

        return csvRows.join('\n');
    },

    async downloadMonthlyReport(tenantId: string): Promise<string> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: employees, error: empError } = await supabase
            .from(EMPLOYEE_TABLE)
            .select('id, name, role')
            .eq('tenant_id', tenantId);

        if (empError) throw empError || new Error('Failed to fetch employees');

        const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);

        const { data: activities, error } = await supabase
            .from(USER_ACTIVITY_TABLE)
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('login_time', startOfMonth.toISOString())
            .order('login_time', { ascending: false });

        if (error || !activities) throw error || new Error('No data');

        const headers = ['Date', 'Employee', 'Role', 'Status', 'First Login', 'Last Logout', 'Total Break Time', 'Break Count', 'Productive Time'];

        const dailyStats = new Map<string, any>();

        const getDateKey = (dateStr: string) => {
            return new Date(dateStr).toLocaleDateString();
        };

        activities.forEach(act => {
            const dateKey = getDateKey(act.login_time);
            const key = `${dateKey}_${act.employee_id}`;

            if (!dailyStats.has(key)) {
                const emp = employeeMap.get(act.employee_id);
                dailyStats.set(key, {
                    date: dateKey,
                    employeeName: emp?.name || 'Unknown',
                    role: emp?.role || 'Telecaller',
                    firstLogin: act.login_time,
                    lastLogout: act.logout_time,
                    totalBreakMins: act.total_break_time || 0,
                    breakCount: act.break_count || 0,
                    totalIdleMins: act.total_idle_time || 0,
                    sessions: [act]
                });
            } else {
                const stat = dailyStats.get(key);
                stat.sessions.push(act);
                stat.totalBreakMins += (act.total_break_time || 0);
                stat.breakCount += (act.break_count || 0);
                stat.totalIdleMins += (act.total_idle_time || 0);
                if (new Date(act.login_time) < new Date(stat.firstLogin)) stat.firstLogin = act.login_time;
                if (!stat.lastLogout || (act.logout_time && new Date(act.logout_time) > new Date(stat.lastLogout))) {
                    if (!act.logout_time) stat.lastLogout = null;
                    else stat.lastLogout = act.logout_time;
                }
            }
        });

        const csvRows = [headers.join(',')];

        dailyStats.forEach(stat => {
            let totalLoggedInMinutes = 0;
            stat.sessions.forEach((s: any) => {
                const start = parseUTCDate(s.login_time);
                const end = s.logout_time ? parseUTCDate(s.logout_time) : new Date();
                const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
                totalLoggedInMinutes += Math.max(0, duration);
            });

            const productiveMins = Math.max(0, totalLoggedInMinutes - stat.totalIdleMins - stat.totalBreakMins);

            const formatDur = (m: number) => {
                const h = Math.floor(m / 60);
                const min = m % 60;
                return `${h}h ${min}m`;
            };

            csvRows.push([
                `"${stat.date}"`,
                `"${stat.employeeName}"`,
                `"${stat.role}"`,
                `"${stat.lastLogout ? 'Offline' : 'Online'}"`,
                `"${formatTime(stat.firstLogin)}"`,
                `"${stat.lastLogout ? formatTime(stat.lastLogout) : 'Active'}"`,
                `"${formatDur(stat.totalBreakMins)}"`,
                `"${stat.breakCount}"`,
                `"${formatDur(productiveMins)}"`
            ].join(','));
        });

        return csvRows.join('\n');
    }
};
