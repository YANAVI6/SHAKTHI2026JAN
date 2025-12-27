export interface Notification {
    id: string;
    tenant_id: string;
    sender_id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    target_type: 'all' | 'team' | 'user';
    target_id?: string;
    created_at: string;
    sender_name?: string; // Joined field
}

export const NOTIFICATION_TABLE = 'notifications';
