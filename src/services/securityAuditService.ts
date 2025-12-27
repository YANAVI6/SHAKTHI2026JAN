/**
 * Security Audit Service
 * 
 * Service for logging and retrieving security events
 */

import { supabase } from '../lib/supabase';

export type SecurityEventType =
    | 'login'
    | 'logout'
    | 'failed_login'
    | 'data_access'
    | 'data_modification'
    | 'data_deletion'
    | 'cross_tenant_attempt'
    | 'permission_denied'
    | 'context_set'
    | 'context_cleared';

export interface SecurityEvent {
    tenantId?: string;
    userId?: string;
    userRole?: string;
    eventType: SecurityEventType;
    tableName?: string;
    recordId?: string;
    action?: string;
    success?: boolean;
    errorMessage?: string;
    additionalData?: Record<string, unknown>;
}

export interface AuditLogEntry {
    id: string;
    tenant_id?: string;
    user_id?: string;
    user_role?: string;
    event_type: SecurityEventType;
    table_name?: string;
    record_id?: string;
    action?: string;
    success: boolean;
    error_message?: string;
    additional_data?: Record<string, unknown>;
    created_at: string;
}

export const securityAuditService = {
    /**
     * Logs a security event
     */
    async logEvent(event: SecurityEvent): Promise<void> {
        try {
            const { error } = await supabase.rpc('log_security_event', {
                p_tenant_id: event.tenantId || null,
                p_user_id: event.userId || null,
                p_user_role: event.userRole || null,
                p_event_type: event.eventType,
                p_table_name: event.tableName || null,
                p_record_id: event.recordId || null,
                p_action: event.action || null,
                p_success: event.success !== false, // Default to true
                p_error_message: event.errorMessage || null,
                p_additional_data: event.additionalData || {}
            });

            if (error) {
                console.error('Failed to log security event:', error);
                // Don't throw - logging failures shouldn't break the app
            }
        } catch (error) {
            console.error('Error logging security event:', error);
            // Silent fail for audit logging
        }
    },

    /**
     * Logs a successful login
     */
    async logLogin(userId: string, tenantId: string | undefined, userRole: string): Promise<void> {
        await this.logEvent({
            tenantId,
            userId,
            userRole,
            eventType: 'login',
            success: true
        });
    },

    /**
     * Logs a failed login attempt
     */
    async logFailedLogin(username: string, errorMessage: string): Promise<void> {
        await this.logEvent({
            eventType: 'failed_login',
            success: false,
            errorMessage,
            additionalData: { username }
        });
    },

    /**
     * Logs a logout
     */
    async logLogout(userId: string, tenantId: string | undefined, userRole: string): Promise<void> {
        await this.logEvent({
            tenantId,
            userId,
            userRole,
            eventType: 'logout',
            success: true
        });
    },

    /**
     * Logs a cross-tenant access attempt
     */
    async logCrossTenantAttempt(
        userId: string,
        userTenantId: string,
        attemptedTenantId: string,
        tableName: string
    ): Promise<void> {
        await this.logEvent({
            tenantId: userTenantId,
            userId,
            eventType: 'cross_tenant_attempt',
            tableName,
            success: false,
            errorMessage: 'Cross-tenant access denied',
            additionalData: {
                userTenantId,
                attemptedTenantId
            }
        });
    },

    /**
     * Logs a data access event
     */
    async logDataAccess(
        userId: string,
        tenantId: string,
        tableName: string,
        action: string = 'SELECT'
    ): Promise<void> {
        await this.logEvent({
            tenantId,
            userId,
            eventType: 'data_access',
            tableName,
            action,
            success: true
        });
    },

    /**
     * Gets recent security events for a tenant
     */
    async getRecentEvents(tenantId: string, limit: number = 100): Promise<AuditLogEntry[]> {
        try {
            const { data, error } = await supabase.rpc('get_recent_security_events', {
                p_tenant_id: tenantId,
                p_limit: limit
            });

            if (error) {
                console.error('Failed to get security events:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error getting security events:', error);
            return [];
        }
    },

    /**
     * Gets failed access attempts
     */
    async getFailedAttempts(
        tenantId?: string,
        hours: number = 24
    ): Promise<AuditLogEntry[]> {
        try {
            const { data, error } = await supabase.rpc('get_failed_access_attempts', {
                p_tenant_id: tenantId || null,
                p_hours: hours
            });

            if (error) {
                console.error('Failed to get failed attempts:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error getting failed attempts:', error);
            return [];
        }
    },

    /**
     * Gets security statistics for a tenant
     */
    async getSecurityStats(tenantId: string, hours: number = 24): Promise<{
        totalEvents: number;
        failedAttempts: number;
        successfulLogins: number;
        failedLogins: number;
    }> {
        try {
            const { data, error } = await supabase
                .from('security_audit_logs')
                .select('event_type, success')
                .eq('tenant_id', tenantId)
                .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

            if (error) {
                console.error('Failed to get security stats:', error);
                return {
                    totalEvents: 0,
                    failedAttempts: 0,
                    successfulLogins: 0,
                    failedLogins: 0
                };
            }

            const events = data || [];

            return {
                totalEvents: events.length,
                failedAttempts: events.filter(e => !e.success).length,
                successfulLogins: events.filter(e => e.event_type === 'login' && e.success).length,
                failedLogins: events.filter(e => e.event_type === 'failed_login').length
            };
        } catch (error) {
            console.error('Error getting security stats:', error);
            return {
                totalEvents: 0,
                failedAttempts: 0,
                successfulLogins: 0,
                failedLogins: 0
            };
        }
    }
};
