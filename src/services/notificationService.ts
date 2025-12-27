import { supabase } from '../lib/supabase';
import { Notification, NOTIFICATION_TABLE } from '../models';

export interface DashboardNotification {
    id: string;
    title: string;
    description: string;
    time: string;
    timestamp: Date;
    isRead: boolean;
    category: 'Cases' | 'Follow-ups' | 'PTP' | 'Payments' | 'Attendance' | 'System';
    color?: string;
}

interface PaymentData {
    id: string;
    created_at: string;
    amount_collected: number;
    customer_cases: {
        customer_name: string;
    };
}

interface FollowupData {
    id: string;
    customer_name: string;
    next_action_date: string;
}

interface PtpNotificationData {
    id: string;
    created_at: string;
    call_notes: string;
    call_status: string;
    customer_cases: {
        customer_name: string;
    };
}

interface CallbackNotificationData {
    id: string;
    callback_datetime: string;
    call_notes: string;
    customer_cases: {
        customer_name: string;
    };
}

export const NotificationService = {
    getDismissedIds(): Set<string> {
        try {
            const stored = localStorage.getItem('dismissed_notifications');
            return new Set(stored ? JSON.parse(stored) : []);
        } catch {
            return new Set();
        }
    },

    dismissNotification(id: string) {
        const dismissed = this.getDismissedIds();
        dismissed.add(id);
        localStorage.setItem('dismissed_notifications', JSON.stringify(Array.from(dismissed)));
    },

    async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
        try {
            const { error } = await supabase
                .from(NOTIFICATION_TABLE)
                .insert(notification);

            if (error) throw error;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    async deleteNotification(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from(NOTIFICATION_TABLE)
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    },

    async getNotificationHistory(tenantId: string): Promise<Notification[]> {
        try {
            const { data, error } = await supabase
                .from(NOTIFICATION_TABLE)
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data) return [];

            // Fetch sender names from both company_admins and employees tables
            const senderIds = [...new Set(data.map(n => n.sender_id))];

            // Fetch from employees
            const { data: employees } = await supabase
                .from('employees')
                .select('id, name')
                .in('id', senderIds);

            // Fetch from company_admins
            const { data: admins } = await supabase
                .from('company_admins')
                .select('id, name')
                .in('id', senderIds);

            // Create a map of sender_id -> name
            const senderMap = new Map<string, string>();
            employees?.forEach(emp => senderMap.set(emp.id, emp.name));
            admins?.forEach(admin => senderMap.set(admin.id, admin.name));

            // Add sender_name to each notification
            return data.map(n => ({
                ...n,
                sender_name: senderMap.get(n.sender_id) || 'Unknown'
            }));
        } catch (error) {
            console.error('Error fetching notification history:', error);
            return [];
        }
    },

    async getNotifications(userId: string, tenantId?: string, teamId?: string): Promise<DashboardNotification[]> {
        const notifications: DashboardNotification[] = [];
        const now = new Date();
        const dismissedIds = this.getDismissedIds();

        try {
            // 0. Fetch Custom Notifications (New!)
            if (tenantId) {
                const query = supabase
                    .from(NOTIFICATION_TABLE)
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                const { data: customNotes } = await query;

                if (customNotes) {
                    customNotes.forEach((n: Notification) => {
                        // Filter logic (Client-side for simplicity, or could be server-side)
                        // 1. Target All
                        // 2. Target Team (matches teamId)
                        // 3. Target User (matches userId)
                        const isRelevant =
                            n.target_type === 'all' ||
                            (n.target_type === 'team' && n.target_id === teamId) ||
                            (n.target_type === 'user' && n.target_id === userId);

                        if (!isRelevant) return;

                        const id = `custom-${n.id}`;
                        if (dismissedIds.has(id)) return;

                        notifications.push({
                            id,
                            title: n.title,
                            description: n.message,
                            time: getTimeAgo(new Date(n.created_at)),
                            timestamp: new Date(n.created_at),
                            isRead: false,
                            category: 'System',
                            color: n.type === 'error' ? 'red' : n.type === 'warning' ? 'orange' : n.type === 'success' ? 'green' : 'blue'
                        });
                    });
                }
            }

            // 1. Fetch Recent Payments (Last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);

            const { data: payments } = await supabase
                .from('case_call_logs')
                .select(`
          id,
          created_at, 
          amount_collected, 
          customer_cases (customer_name)
        `)
                .eq('employee_id', userId)
                .gt('amount_collected', 0)
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false })
                .limit(10);

            if (payments) {
                (payments as unknown as PaymentData[]).forEach((p) => {
                    const id = `pay-${p.id}`;
                    if (dismissedIds.has(id)) return;

                    notifications.push({
                        id,
                        title: 'Payment Received',
                        description: `₹${p.amount_collected} received from ${p.customer_cases?.customer_name || 'Customer'}`,
                        time: getTimeAgo(new Date(p.created_at)),
                        timestamp: new Date(p.created_at),
                        isRead: true,
                        category: 'Payments',
                        color: 'green'
                    });
                });
            }

            // 2. Fetch Pending Follow-ups (Today & Upcoming)
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data: followups } = await supabase
                .from('customer_cases')
                .select('id, customer_name, next_action_date')
                .eq('assigned_employee_id', userId)
                .gte('next_action_date', startOfDay.toISOString())
                .order('next_action_date', { ascending: true })
                .limit(10);

            if (followups) {
                (followups as unknown as FollowupData[]).forEach((f) => {
                    const id = `fu-${f.id}`;
                    if (dismissedIds.has(id)) return;

                    const date = new Date(f.next_action_date);
                    notifications.push({
                        id,
                        title: 'Follow-up Reminder',
                        description: `Follow-up scheduled for ${f.customer_name}`,
                        time: getTimeAgo(date),
                        timestamp: date,
                        isRead: false,
                        category: 'Follow-ups',
                        color: 'orange'
                    });
                });
            }

            // 3. Fetch Recent PTPs (Promise to Pay)
            const { data: ptps } = await supabase
                .from('case_call_logs')
                .select(`
          id,
          created_at, 
          call_notes,
          call_status,
          customer_cases (customer_name)
        `)
                .eq('employee_id', userId)
                .or('call_status.ilike.%ptp%,call_status.ilike.%promise%')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false })
                .limit(5);

            if (ptps) {
                (ptps as unknown as PtpNotificationData[]).forEach((p) => {
                    const id = `ptp-${p.id}`;
                    if (dismissedIds.has(id)) return;

                    notifications.push({
                        id,
                        title: 'PTP Confirmed',
                        description: `${p.call_notes || p.call_status} - ${p.customer_cases?.customer_name || 'Customer'}`,
                        time: getTimeAgo(new Date(p.created_at)),
                        timestamp: new Date(p.created_at),
                        isRead: true,
                        category: 'PTP',
                        color: 'green'
                    });
                });
            }

            // 4. Fetch Pending Callbacks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { data: callbacks } = await supabase
                .from('case_call_logs')
                .select(`
          id,
          callback_datetime,
          call_notes,
          customer_cases (customer_name)
        `)
                .eq('employee_id', userId)
                .eq('call_status', 'CALL_BACK')
                .eq('callback_completed', false)
                .not('callback_datetime', 'is', null)
                .order('callback_datetime', { ascending: true })
                .limit(10);

            if (callbacks) {
                (callbacks as unknown as CallbackNotificationData[]).forEach((c) => {
                    const id = `callback-${c.id}`;
                    if (dismissedIds.has(id)) return;

                    const callbackDateTime = new Date(c.callback_datetime);
                    const isOverdue = callbackDateTime < now;
                    const isToday = callbackDateTime.toISOString().split('T')[0] === today.toISOString().split('T')[0];

                    const timeStr = callbackDateTime.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });

                    notifications.push({
                        id,
                        title: isOverdue ? '🚨 Overdue Callback' : isToday ? 'Callback Today' : 'Upcoming Callback',
                        description: `Call back ${c.customer_cases?.customer_name || 'Customer'} ${isOverdue ? 'ASAP' : `at ${timeStr}`}`,
                        time: isOverdue ? 'Overdue!' : getTimeAgo(callbackDateTime),
                        timestamp: callbackDateTime,
                        isRead: false,
                        category: 'Follow-ups',
                        color: isOverdue ? 'red' : 'orange'
                    });
                });
            }

        } catch (error) {
            console.error('Error fetching notifications:', error);
        }

        return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
};

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) {
        // Future date
        const diffInHours = Math.abs(Math.floor(diffInSeconds / 3600));
        if (diffInHours < 24) return `In ${diffInHours} hours`;
        return `In ${Math.floor(diffInHours / 24)} days`;
    }

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
}
