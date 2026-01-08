import { supabase } from '../lib/supabase';

// Update PtpData interface
export interface PtpData {
    id: string;
    created_at: string;
    ptp_datetime: string;
    call_notes: string;
    case_id: string;
    customer_cases: {
        id: string;
        customer_name: string;
        loan_id: string;
        outstanding_amount?: string;
        case_data?: Record<string, unknown>;
    };
}

export interface CallbackData {
    id: string;
    created_at: string;
    callback_datetime: string;
    call_notes: string;
    case_id: string;
    customer_cases: {
        id: string;
        customer_name: string;
        loan_id: string;
        outstanding_amount?: string;
        case_data?: Record<string, unknown>;
    };
}

export interface AlertCase {
    id: string;
    customer_name: string;
    type: 'PTP' | 'CALLBACK';
    due_date: Date;
    status: 'RED' | 'YELLOW' | 'GREEN';
    is_viewed: boolean;
    original_data: PtpData | CallbackData;
}

export const AlertService = {
    async getAlerts(userId: string, teamId?: string): Promise<{ status: 'RED' | 'YELLOW' | 'GREEN'; cases: AlertCase[] }> {
        // If no teamId provided, return empty (strict filtering for telecallers)
        if (!teamId) {
            console.warn('⚠️ getAlerts called without teamId - returning empty');
            return { status: 'GREEN', cases: [] };
        }

        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        try {
            // 1. Fetch PTPs for today
            let ptpsQuery = supabase
                .from('case_call_logs')
                .select(`
          id,
          created_at,
          ptp_datetime,
          call_notes,
          case_id,
          customer_cases!inner (
            id,
            customer_name,
            loan_id,
            outstanding_amount,
            case_data,
            team_id
          )
        `)
                .eq('employee_id', userId)
                .or('call_status.ilike.%ptp%,call_status.ilike.%promise%')
                .gte('ptp_datetime', startOfDay.toISOString())
                .lte('ptp_datetime', endOfDay.toISOString());

            if (teamId) {
                ptpsQuery = ptpsQuery.eq('customer_cases.team_id', teamId);
            }

            const { data: ptps } = await ptpsQuery;

            // 2. Fetch Callbacks for today
            let callbacksQuery = supabase
                .from('case_call_logs')
                .select(`
          id,
          created_at,
          callback_datetime,
          call_notes,
          case_id,
          customer_cases!inner (
            id,
            customer_name,
            loan_id,
            outstanding_amount,
            case_data,
            team_id
          )
        `)
                .eq('employee_id', userId)
                .eq('call_status', 'CALL_BACK')
                .eq('callback_completed', false)
                .gte('callback_datetime', startOfDay.toISOString())
                .lte('callback_datetime', endOfDay.toISOString());

            if (teamId) {
                callbacksQuery = callbacksQuery.eq('customer_cases.team_id', teamId);
            }

            const { data: callbacks } = await callbacksQuery;

            // 3. Fetch Viewed Logs for today
            const { data: viewedLogs } = await supabase
                .from('viewed_case_logs')
                .select('case_id, viewed_at')
                .eq('employee_id', userId)
                .gte('viewed_at', startOfDay.toISOString());

            const viewedCaseIds = new Set(viewedLogs?.map(log => log.case_id));

            const alerts: AlertCase[] = [];

            // Process PTPs
            if (ptps) {
                (ptps as unknown as PtpData[]).forEach((ptp) => {
                    if (!ptp.ptp_datetime) return;
                    const dueDate = new Date(ptp.ptp_datetime);
                    const isViewed = viewedCaseIds.has(ptp.customer_cases.id);

                    let status: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';

                    if (!isViewed) {
                        if (dueDate <= now) {
                            status = 'RED';
                        } else if (dueDate <= thirtyMinutesFromNow) {
                            status = 'YELLOW';
                        }
                    }

                    // Include ALL items, even if GREEN
                    alerts.push({
                        id: ptp.customer_cases.id, // Use case_id for navigation
                        customer_name: ptp.customer_cases.customer_name,
                        type: 'PTP',
                        due_date: dueDate,
                        status,
                        is_viewed: isViewed,
                        original_data: ptp
                    });
                });
            }

            // Process Callbacks
            if (callbacks) {
                (callbacks as unknown as CallbackData[]).forEach((cb) => {
                    if (!cb.callback_datetime) return;
                    const dueDate = new Date(cb.callback_datetime);
                    const isViewed = viewedCaseIds.has(cb.customer_cases.id);

                    let status: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';

                    if (!isViewed) {
                        if (dueDate <= now) {
                            status = 'RED';
                        } else if (dueDate <= thirtyMinutesFromNow) {
                            status = 'YELLOW';
                        }
                    }

                    // Include ALL items, even if GREEN
                    alerts.push({
                        id: cb.customer_cases.id,
                        customer_name: cb.customer_cases.customer_name,
                        type: 'CALLBACK',
                        due_date: dueDate,
                        status,
                        is_viewed: isViewed,
                        original_data: cb
                    });
                });
            }

            // Determine overall status
            let overallStatus: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';
            if (alerts.some(a => a.status === 'RED')) {
                overallStatus = 'RED';
            } else if (alerts.some(a => a.status === 'YELLOW')) {
                overallStatus = 'YELLOW';
            }

            // Sort alerts: RED first, then YELLOW, then by time
            alerts.sort((a, b) => {
                if (a.status === 'RED' && b.status !== 'RED') return -1;
                if (a.status !== 'RED' && b.status === 'RED') return 1;
                if (a.status === 'YELLOW' && b.status !== 'YELLOW') return -1;
                if (a.status !== 'YELLOW' && b.status === 'YELLOW') return 1;
                return a.due_date.getTime() - b.due_date.getTime();
            });

            return { status: overallStatus, cases: alerts };

        } catch (error) {
            console.error('Error fetching alerts:', error);
            return { status: 'GREEN', cases: [] };
        }
    },

    async markAsViewed(caseId: string, userId: string): Promise<void> {
        try {
            await supabase
                .from('viewed_case_logs')
                .upsert({
                    case_id: caseId,
                    employee_id: userId,
                    viewed_at: new Date().toISOString()
                }, { onConflict: 'case_id,employee_id' });
        } catch (error) {
            console.error('Error marking case as viewed:', error);
        }
    },

    async getAlertsByTenant(tenantId: string): Promise<AlertCase[]> {
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        try {
            // Fetch PTPs for all employees in tenant
            const { data: ptps } = await supabase
                .from('case_call_logs')
                .select(`
                    id,
                    created_at,
                    ptp_datetime,
                    call_notes,
                    case_id,
                    employee_id,
                    customer_cases!inner (
                        id,
                        customer_name,
                        loan_id,
                        tenant_id,
                        outstanding_amount,
                        case_data
                    )
                `)
                .eq('customer_cases.tenant_id', tenantId)
                .or('call_status.ilike.%ptp%,call_status.ilike.%promise%')
                .gte('ptp_datetime', startOfDay.toISOString())
                .lte('ptp_datetime', endOfDay.toISOString());

            // Fetch Callbacks for all employees in tenant
            const { data: callbacks } = await supabase
                .from('case_call_logs')
                .select(`
                    id,
                    created_at,
                    callback_datetime,
                    call_notes,
                    case_id,
                    employee_id,
                    customer_cases!inner (
                        id,
                        customer_name,
                        loan_id,
                        tenant_id,
                        outstanding_amount,
                        case_data
                    )
                `)
                .eq('customer_cases.tenant_id', tenantId)
                .eq('call_status', 'CALL_BACK')
                .eq('callback_completed', false)
                .gte('callback_datetime', startOfDay.toISOString())
                .lte('callback_datetime', endOfDay.toISOString());

            const alerts: AlertCase[] = [];

            // Process PTPs
            if (ptps) {
                (ptps as unknown as PtpData[]).forEach((ptp) => {
                    if (!ptp.ptp_datetime) return;
                    const dueDate = new Date(ptp.ptp_datetime);
                    let status: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';

                    if (dueDate <= now) {
                        status = 'RED';
                    } else if (dueDate <= thirtyMinutesFromNow) {
                        status = 'YELLOW';
                    }

                    alerts.push({
                        id: ptp.customer_cases.id,
                        customer_name: ptp.customer_cases.customer_name,
                        type: 'PTP',
                        due_date: dueDate,
                        status,
                        is_viewed: false,
                        original_data: ptp
                    });
                });
            }

            // Process Callbacks
            if (callbacks) {
                (callbacks as unknown as CallbackData[]).forEach((cb) => {
                    if (!cb.callback_datetime) return;
                    const dueDate = new Date(cb.callback_datetime);
                    let status: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';

                    if (dueDate <= now) {
                        status = 'RED';
                    } else if (dueDate <= thirtyMinutesFromNow) {
                        status = 'YELLOW';
                    }

                    alerts.push({
                        id: cb.customer_cases.id,
                        customer_name: cb.customer_cases.customer_name,
                        type: 'CALLBACK',
                        due_date: dueDate,
                        status,
                        is_viewed: false,
                        original_data: cb
                    });
                });
            }

            // Sort alerts: RED first, then YELLOW, then by time
            alerts.sort((a, b) => {
                if (a.status === 'RED' && b.status !== 'RED') return -1;
                if (a.status !== 'RED' && b.status === 'RED') return 1;
                if (a.status === 'YELLOW' && b.status !== 'YELLOW') return -1;
                if (a.status !== 'YELLOW' && b.status === 'YELLOW') return 1;
                return a.due_date.getTime() - b.due_date.getTime();
            });

            return alerts;
        } catch (error) {
            console.error('Error fetching tenant alerts:', error);
            return [];
        }
    },

    async getAlertsByTeam(teamId: string): Promise<AlertCase[]> {
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        try {
            // Get employees in the team
            const { data: teamMembers } = await supabase
                .from('employees')
                .select('id')
                .eq('team_id', teamId)
                .eq('status', 'active');

            if (!teamMembers || teamMembers.length === 0) {
                return [];
            }

            const employeeIds = teamMembers.map(e => e.id);

            // Fetch PTPs for team members
            const { data: ptps } = await supabase
                .from('case_call_logs')
                .select(`
                    id,
                    created_at,
                    ptp_datetime,
                    call_notes,
                    case_id,
                    employee_id,
                    customer_cases!inner (
                        id,
                        customer_name,
                        loan_id,
                        outstanding_amount,
                        case_data
                    )
                `)
                .in('employee_id', employeeIds)
                .or('call_status.ilike.%ptp%,call_status.ilike.%promise%')
                .gte('ptp_datetime', startOfDay.toISOString())
                .lte('ptp_datetime', endOfDay.toISOString());

            // Fetch Callbacks for team members
            const { data: callbacks } = await supabase
                .from('case_call_logs')
                .select(`
                    id,
                    created_at,
                    callback_datetime,
                    call_notes,
                    case_id,
                    employee_id,
                    customer_cases!inner (
                        id,
                        customer_name,
                        loan_id,
                        outstanding_amount,
                        case_data
                    )
                `)
                .in('employee_id', employeeIds)
                .eq('call_status', 'CALL_BACK')
                .eq('callback_completed', false)
                .gte('callback_datetime', startOfDay.toISOString())
                .lte('callback_datetime', endOfDay.toISOString());

            const alerts: AlertCase[] = [];

            // Process PTPs
            if (ptps) {
                (ptps as unknown as PtpData[]).forEach((ptp) => {
                    if (!ptp.ptp_datetime) return;
                    const dueDate = new Date(ptp.ptp_datetime);
                    let status: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';

                    if (dueDate <= now) {
                        status = 'RED';
                    } else if (dueDate <= thirtyMinutesFromNow) {
                        status = 'YELLOW';
                    }

                    alerts.push({
                        id: ptp.customer_cases.id,
                        customer_name: ptp.customer_cases.customer_name,
                        type: 'PTP',
                        due_date: dueDate,
                        status,
                        is_viewed: false,
                        original_data: ptp
                    });
                });
            }

            // Process Callbacks
            if (callbacks) {
                (callbacks as unknown as CallbackData[]).forEach((cb) => {
                    if (!cb.callback_datetime) return;
                    const dueDate = new Date(cb.callback_datetime);
                    let status: 'RED' | 'YELLOW' | 'GREEN' = 'GREEN';

                    if (dueDate <= now) {
                        status = 'RED';
                    } else if (dueDate <= thirtyMinutesFromNow) {
                        status = 'YELLOW';
                    }

                    alerts.push({
                        id: cb.customer_cases.id,
                        customer_name: cb.customer_cases.customer_name,
                        type: 'CALLBACK',
                        due_date: dueDate,
                        status,
                        is_viewed: false,
                        original_data: cb
                    });
                });
            }

            // Sort alerts
            alerts.sort((a, b) => {
                if (a.status === 'RED' && b.status !== 'RED') return -1;
                if (a.status !== 'RED' && b.status === 'RED') return 1;
                if (a.status === 'YELLOW' && b.status !== 'YELLOW') return -1;
                if (a.status !== 'YELLOW' && b.status === 'YELLOW') return 1;
                return a.due_date.getTime() - b.due_date.getTime();
            });

            return alerts;
        } catch (error) {
            console.error('Error fetching team alerts:', error);
            return [];
        }
    }
};
