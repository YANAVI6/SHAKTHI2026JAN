import { supabase } from '../lib/supabase';

export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  user_id: string;
  action_type: 'assign' | 'unassign' | 'reassign' | 'delete' | 'bulk_delete' | 'upload';
  entity_type: 'case' | 'employee' | 'team';
  entity_id?: string;
  from_value?: string;
  to_value?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export const auditLogService = {
  async logAction(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...entry,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging audit action:', error);
      }
    } catch (error) {
      console.error('Unexpected error in logAction:', error);
    }
  },

  async logCaseAssignment(
    tenantId: string,
    userId: string,
    caseId: string,
    telecallerId: string,
    reason?: string
  ): Promise<void> {
    await this.logAction({
      tenant_id: tenantId,
      user_id: userId,
      action_type: 'assign',
      entity_type: 'case',
      entity_id: caseId,
      to_value: telecallerId,
      reason,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  },

  async logCaseUnassignment(
    tenantId: string,
    userId: string,
    caseId: string,
    fromTelecallerId: string,
    reason: string
  ): Promise<void> {
    await this.logAction({
      tenant_id: tenantId,
      user_id: userId,
      action_type: 'unassign',
      entity_type: 'case',
      entity_id: caseId,
      from_value: fromTelecallerId,
      reason,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  },

  async logCaseReassignment(
    tenantId: string,
    userId: string,
    caseId: string,
    fromTelecallerId: string,
    toTelecallerId: string,
    reason: string
  ): Promise<void> {
    await this.logAction({
      tenant_id: tenantId,
      user_id: userId,
      action_type: 'reassign',
      entity_type: 'case',
      entity_id: caseId,
      from_value: fromTelecallerId,
      to_value: toTelecallerId,
      reason,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  },

  async logCaseDeletion(
    tenantId: string,
    userId: string,
    caseId: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logAction({
      tenant_id: tenantId,
      user_id: userId,
      action_type: 'delete',
      entity_type: 'case',
      entity_id: caseId,
      reason,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  },

  async logBulkCaseDeletion(
    tenantId: string,
    userId: string,
    caseIds: string[],
    reason: string
  ): Promise<void> {
    await this.logAction({
      tenant_id: tenantId,
      user_id: userId,
      action_type: 'bulk_delete',
      entity_type: 'case',
      reason,
      metadata: {
        case_count: caseIds.length,
        case_ids: caseIds,
        timestamp: new Date().toISOString()
      }
    });
  },

  async getAuditLogs(
    tenantId: string,
    filters?: {
      userId?: string;
      actionType?: string;
      entityType?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    page: number = 0,
    pageSize: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getAuditLogs:', error);
      return [];
    }
  },

  async getRecentActivity(
    tenantId: string,
    limit: number = 10
  ): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent activity:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error in getRecentActivity:', error);
      return [];
    }
  }
};
