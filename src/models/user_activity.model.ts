export interface UserActivity {
    id: string;
    tenant_id: string;
    employee_id: string;
    login_time: string;
    logout_time: string | null;
    last_active_time: string;
    status: 'Online' | 'Break' | 'Offline' | 'Idle';
    total_break_time: number; // in minutes
    current_break_start: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserActivityInsert {
    tenant_id: string;
    employee_id: string;
    login_time: string;
    last_active_time: string;
    status: 'Online' | 'Break' | 'Offline' | 'Idle';
    total_break_time?: number;
}

export interface UserActivityUpdate {
    logout_time?: string;
    last_active_time?: string;
    status?: 'Online' | 'Break' | 'Offline' | 'Idle';
    total_break_time?: number;
    current_break_start?: string | null;
}

export const USER_ACTIVITY_TABLE = 'user_activity' as const;
