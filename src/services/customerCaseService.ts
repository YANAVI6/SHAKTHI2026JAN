import { supabase } from '../lib/supabase';
import {
  CUSTOMER_CASE_TABLE,
  EMPLOYEE_TABLE,
  CASE_CALL_LOG_TABLE,
  CALL_STATUSES,
  type CallStatus
} from '../models';
import type {
  TeamInchargeCase,
  CaseUploadResult,
  CaseFilters,
  CaseAssignment
} from '../types/caseManagement';

export interface CustomerCase {
  id?: string;
  tenant_id: string;
  assigned_employee_id?: string | null;
  team_id?: string | null;
  telecaller_id?: string | null;
  loan_id?: string;
  customer_name?: string;
  mobile_no?: string;
  alternate_number?: string;
  email?: string;
  loan_amount?: string;
  loan_type?: string;
  outstanding_amount?: string;
  pos_amount?: string;
  emi_amount?: string;
  pending_dues?: string;
  dpd?: number;
  branch_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  sanction_date?: string;
  last_paid_date?: string;
  last_paid_amount?: string;
  payment_link?: string;
  remarks?: string;
  custom_fields?: Record<string, unknown>;
  case_data?: Record<string, unknown>; // For backward compatibility
  product_name?: string;
  case_status?: string;
  status?: 'new' | 'assigned' | 'in_progress' | 'closed';
  priority?: string;
  uploaded_by?: string;
  total_collected_amount?: number;
  created_at?: string;
  updated_at?: string;
  latest_call_status?: string;
  latest_ptp_date?: string;
  buckets?: string;
  is_retained?: boolean;
  status_update_count?: number;
}

export interface CallLog {
  id?: string;
  tenant_id?: string;
  case_id: string;
  employee_id: string;
  call_status: string;
  ptp_datetime?: string;
  call_notes?: string;
  call_duration?: number;
  call_result?: string;
  amount_collected?: string;
  callback_datetime?: string;
  callback_completed?: boolean;
  created_at?: string;
}

export type CustomerCaseWithLogs = CustomerCase & {
  case_call_logs?: CallLog[];
  team?: { name: string };
  telecaller?: { name: string };
};

export interface EnrichedCustomerCase extends CustomerCase {
  latest_call_status: string;
  latest_call_notes: string;
  latest_call_date: string;
  latest_ptp_date: string;
  payment_count: number;
  last_payment_amount: number;
  last_payment_date: string;
  calculated_total_collected: number;
}

export const customerCaseService = {
  async getCasesByEmployee(tenantId: string, employeeId: string): Promise<CustomerCase[]> {
    const { data, error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('assigned_employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer cases:', error);
      throw new Error('Failed to fetch customer cases');
    }

    return data || [];
  },

  async getCaseById(caseId: string): Promise<CustomerCase> {
    const { data, error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .select('*')
      .eq('id', caseId)
      .single();

    if (error) {
      console.error('Error fetching case by id:', error);
      throw new Error('Failed to fetch case');
    }

    return data;
  },

  async getCasesWithFilters(tenantId: string, filters: Record<string, string>): Promise<CustomerCase[]> {
    try {
      // First, find the employee by EMPID
      const { data: employee, error: employeeError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id, emp_id, name')
        .eq('tenant_id', tenantId)
        .eq('emp_id', filters.empId)
        .eq('role', 'Telecaller')
        .eq('status', 'active')
        .maybeSingle();

      if (employeeError) {
        console.error('❌ Error finding telecaller employee:', employeeError);
        return [];
      }

      if (!employee) {
        console.warn('⚠️ No active telecaller found');
        console.warn('   EMPID:', filters.empId);
        console.warn('   Tenant:', tenantId);
        return [];
      }

      let query = supabase
        .from(CUSTOMER_CASE_TABLE)
        .select(`
          *,
          case_call_logs (
            call_status,
            created_at,
            ptp_datetime
          )
        `)
        .eq('tenant_id', tenantId);

      if (filters.telecallerId) {
        query = query.eq('telecaller_id', filters.telecallerId);
      }
      if (filters.assignedEmployeeId) {
        query = query.eq('assigned_employee_id', filters.assignedEmployeeId);
      }
      if (filters.caseStatus) {
        query = query.eq('case_status', filters.caseStatus);
      }
      if (filters.loanType) {
        query = query.eq('loan_type', filters.loanType);
      }
      if (filters.dpdMin) {
        query = query.gte('dpd', parseInt(filters.dpdMin));
      }
      if (filters.dpdMax) {
        query = query.lte('dpd', parseInt(filters.dpdMax));
      }
      if (filters.search) {
        query = query.or(`customer_name.ilike.%${filters.search}%,mobile_no.ilike.%${filters.search}%`);
      }

      const { data: cases, error: casesError } = await query.order('created_at', { ascending: false });

      if (casesError) {
        console.error('❌ Error fetching cases with filters:', casesError);
        return [];
      }

      // Process cases to extract latest_call_status from logs
      const enrichedCases = cases.map((caseItem: CustomerCase & { case_call_logs?: CallLog[] }) => {
        const logs = caseItem.case_call_logs || [];
        logs.sort((a: CallLog, b: CallLog) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });

        const latestCallStatus = logs.length > 0 ? logs[0].call_status : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { case_call_logs: _, ...rest } = caseItem;

        return {
          ...rest,
          latest_call_status: latestCallStatus,
          latest_call_date: logs.length > 0 ? logs[0].created_at : undefined,
          latest_ptp_date: logs.length > 0 ? logs.find((l: CallLog) => l.ptp_datetime)?.ptp_datetime : undefined
        };
      });

      return enrichedCases;
    } catch (error) {
      console.error('Unexpected error in getCasesWithFilters:', error);
      return [];
    }
  },

  async getCasesByTelecaller(tenantId: string, empId: string, teamId?: string): Promise<CustomerCase[]> {
    try {
      // First, find the employee by EMPID
      const { data: employee, error: employeeError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id, emp_id, name')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .eq('role', 'Telecaller')
        .eq('status', 'active')
        .maybeSingle();

      if (employeeError) {
        console.error('❌ Error finding telecaller employee:', employeeError);
        return [];
      }

      if (!employee) {
        console.warn('⚠️ No active telecaller found');
        console.warn('   EMPID:', empId);
        console.warn('   Tenant:', tenantId);
        return [];
      }

      // Build query for cases by telecaller_id
      let query = supabase
        .from(CUSTOMER_CASE_TABLE)
        .select(`
          *,
          case_call_logs (
            call_status,
            created_at,
            ptp_datetime
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employee.id);

      // Add team filter - this is now REQUIRED for showing cases
      if (!teamId) {
        console.warn('⚠️ No team specified for telecaller cases');
        return [];
      }
      query = query.eq('team_id', teamId);

      const { data: casesByTelecallerId, error: telecallerError } = await query.order('created_at', { ascending: false });

      if (telecallerError) {
        console.error('❌ Error fetching cases by telecaller_id:', telecallerError);
        return [];
      }

      // If no cases found by telecaller_id, only fallback to assigned_employee_id IF it still matches team_id
      if (!casesByTelecallerId || casesByTelecallerId.length === 0) {
        const { data: casesByEmpId, error: empIdError } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select(`
            *,
            case_call_logs (
              call_status,
              created_at,
              ptp_datetime
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('assigned_employee_id', employee.id)
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        if (empIdError) {
          console.error('❌ Error fetching cases by assigned_employee_id:', empIdError);
          return [];
        }

        return casesByEmpId || [];
      }

      // Process cases to extract latest_call_status from logs
      const enrichedCases = casesByTelecallerId.map((caseItem: CustomerCase & { case_call_logs?: CallLog[] }) => {
        const logs = caseItem.case_call_logs || [];
        // Sort logs by created_at desc if not already
        logs.sort((a: CallLog, b: CallLog) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });

        const latestCallStatus = logs.length > 0 ? logs[0].call_status : undefined;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { case_call_logs, ...rest } = caseItem;

        return {
          ...rest,
          latest_call_status: latestCallStatus,
          latest_call_date: logs.length > 0 ? logs[0].created_at : undefined,
          latest_ptp_date: logs.length > 0 ? logs.find((l: CallLog) => l.ptp_datetime)?.ptp_datetime : undefined
        };
      });

      return enrichedCases;
    } catch (error) {
      console.error('Unexpected error in getCasesByTelecaller:', error);
      return [];
    }
  },

  async getAllCases(tenantId: string): Promise<CustomerCase[]> {
    let allCases: CustomerCaseWithLogs[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select(`
            *,
            team:teams(name),
            telecaller:employees!telecaller_id(name),
            case_call_logs(call_status, ptp_datetime, created_at)
          `)
        .eq('tenant_id', tenantId)
        .not('team_id', 'is', null) // Exclude orphaned cases from deleted teams
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching all cases:', error);
        throw new Error('Failed to fetch all cases');
      }

      if (data && data.length > 0) {
        allCases = [...allCases, ...data] as CustomerCaseWithLogs[];
        if (data.length < pageSize) {
          hasMore = false;
        }
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allCases.length === 0) return [];

    // Process cases to extract latest_call_status from logs
    return allCases.map((caseItem: CustomerCaseWithLogs) => {
      const logs = caseItem.case_call_logs || [];
      // Sort logs by created_at desc
      logs.sort((a: CallLog, b: CallLog) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      const latestCallStatus = logs.length > 0 ? logs[0].call_status : undefined;
      const latestCallDate = logs.length > 0 ? logs[0].created_at : undefined;
      const latestPtpDate = logs.length > 0 ? logs.find((l: CallLog) => l.ptp_datetime)?.ptp_datetime : undefined;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { case_call_logs, ...rest } = caseItem;

      return {
        ...rest,
        latest_call_status: latestCallStatus,
        latest_call_date: latestCallDate,
        latest_ptp_date: latestPtpDate
      };
    });
  },

  async createCase(caseData: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>): Promise<CustomerCase> {
    const { data, error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .insert([caseData])
      .select()
      .single();

    if (error) {
      console.error('Error creating case:', error);
      throw new Error('Failed to create case');
    }

    return data;
  },

  async bulkCreateCases(cases: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    const { error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .insert(cases);

    if (error) {
      console.error('Error bulk creating cases:', error);
      throw new Error('Failed to bulk create cases');
    }
  },

  async updateCase(caseId: string, updates: Partial<CustomerCase>): Promise<CustomerCase> {
    const { data, error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .update(updates)
      .eq('id', caseId)
      .select()
      .single();

    if (error) {
      console.error('Error updating case:', error);
      throw new Error('Failed to update case');
    }
    return data;
  },

  async deleteCase(caseId: string): Promise<void> {
    // Soft delete - mark case as deleted instead of removing it
    const { error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .update({
        case_status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);

    if (error) {
      console.error('Error soft deleting case:', error);
      throw new Error(`Failed to delete case: ${error.message}`);
    }
  },

  async restoreCase(caseId: string): Promise<void> {
    // Restore a soft-deleted case back to 'pending' status
    const { error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .update({
        case_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId)
      .eq('case_status', 'deleted');

    if (error) {
      console.error('Error restoring case:', error);
      throw new Error(`Failed to restore case: ${error.message}`);
    }
  },

  async permanentlyDeleteCase(caseId: string): Promise<void> {
    // Hard delete - permanently remove case and related logs
    const { error: logsError } = await supabase
      .from(CASE_CALL_LOG_TABLE)
      .delete()
      .eq('case_id', caseId);

    if (logsError) {
      console.error('Error deleting related case logs:', logsError);
      throw new Error(`Failed to delete case logs: ${logsError.message}`);
    }

    const { error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .delete()
      .eq('id', caseId);

    if (error) {
      console.error('Error permanently deleting case:', error);
      throw new Error(`Failed to permanently delete case: ${error.message}`);
    }
  },

  async addCallLog(callLog: Omit<CallLog, 'id' | 'created_at'>): Promise<CallLog> {
    const { data, error } = await supabase
      .from(CASE_CALL_LOG_TABLE)
      .insert([callLog])
      .select()
      .single();

    if (error) {
      console.error('Error adding call log:', error);
      throw new Error('Failed to add call log');
    }

    // Sync latest call status and metadata to customer_cases table using case_data jsonb
    // This avoids schema errors if dedicated columns are missing
    const { data: currentCase } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .select('case_data')
      .eq('id', callLog.case_id)
      .single();

    const newCaseData = {
      ...(currentCase?.case_data || {}),
      latest_call_status: callLog.call_status,
      latest_call_date: new Date().toISOString(),
      ...(callLog.ptp_datetime && { latest_ptp_date: callLog.ptp_datetime }),
      ...(callLog.call_notes && { latest_call_notes: callLog.call_notes })
    };

    const updateData: Partial<CustomerCase> = {
      case_data: newCaseData,
      updated_at: new Date().toISOString(),
      case_status: 'in_progress'
    };

    const { error: syncError } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .update(updateData)
      .eq('id', callLog.case_id);

    if (syncError) {
      console.warn('⚠️ Non-critical: Failed to sync latest status to case:', syncError);
    }

    return data;
  },



  async getCallLogsByCase(caseId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from(CASE_CALL_LOG_TABLE)
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching call logs:', error);
      throw new Error('Failed to fetch call logs');
    }

    return data || [];
  },

  async getCallLogsWithEmployeeDetails(caseId: string): Promise<(CallLog & { employee_name?: string })[]> {
    // First, get the call logs
    const { data: logs, error: logsError } = await supabase
      .from(CASE_CALL_LOG_TABLE)
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching call logs:', logsError);
      throw new Error('Failed to fetch call logs');
    }

    if (!logs || logs.length === 0) {
      return [];
    }

    // Get unique employee IDs
    const employeeIds = [...new Set(logs.map(log => log.employee_id))];

    // Use chunking for large employee ID lists to avoid URI size limits
    const chunkSize = 50;
    const allEmployees: { id: string, name: string }[] = [];

    for (let i = 0; i < employeeIds.length; i += chunkSize) {
      const chunk = employeeIds.slice(i, i + chunkSize);
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name')
        .in('id', chunk);

      if (employeesError) {
        console.error('Error fetching employees chunk:', employeesError);
        continue;
      }

      if (employees) {
        allEmployees.push(...employees);
      }
    }

    if (allEmployees.length === 0 && employeeIds.length > 0) {
      // Return logs without employee names if fetch fails completely
      return logs.map(log => ({
        ...log,
        employee_name: 'Unknown'
      }));
    }

    // Create a map of employee IDs to names
    const employeeMap = new Map(
      allEmployees.map(emp => [emp.id, emp.name])
    );

    // Merge employee names with call logs
    return logs.map(log => ({
      ...log,
      employee_name: employeeMap.get(log.employee_id) || 'Unknown'
    }));
  },

  async getCaseStatsByEmployee(tenantId: string, employeeId: string): Promise<{
    totalCases: number;
    pendingCases: number;
    inProgressCases: number;
    resolvedCases: number;
    highPriorityCases: number;
  }> {
    const cases = await this.getCasesByEmployee(tenantId, employeeId);

    return {
      totalCases: cases.length,
      pendingCases: cases.filter(c => c.case_status === 'pending').length,
      inProgressCases: cases.filter(c => c.case_status === 'in_progress').length,
      resolvedCases: cases.filter(c => c.case_status === 'resolved').length,
      highPriorityCases: cases.filter(c => c.priority === 'high' || c.priority === 'urgent').length
    };
  },

  // Team Incharge specific methods
  async getTeamCases(tenantId: string, teamId: string): Promise<TeamInchargeCase[]> {
    try {
      // First get all cases for the team
      // First get all cases for the team with pagination
      let allCases: (CustomerCase & { case_call_logs: CallLog[] })[] = [];
      let page = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const { data: cases, error: casesError } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select(`
            *,
            case_call_logs (
              call_status,
              ptp_datetime,
              created_at
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('team_id', teamId)
          .neq('case_status', 'deleted') // Exclude soft-deleted cases
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (casesError) {
          console.error('Error fetching team cases:', casesError);
          throw new Error('Failed to fetch team cases');
        }

        if (cases) {
          allCases = [...allCases, ...cases];
          if (cases.length < pageSize) {
            hasMore = false;
          }
          page++;
        } else {
          hasMore = false;
        }
      }

      const cases = allCases;

      if (!cases || cases.length === 0) {
        return [];
      }

      // Get unique telecaller IDs
      const telecallerIds = [...new Set(cases.filter(c => c.telecaller_id).map(c => c.telecaller_id))];

      let telecallerMap = new Map();
      if (telecallerIds.length > 0) {
        // Fetch telecaller details
        const { data: telecallers, error: telecallersError } = await supabase
          .from('employees')
          .select('id, name, emp_id')
          .eq('tenant_id', tenantId)
          .in('id', telecallerIds);

        if (!telecallersError && telecallers) {
          telecallerMap = new Map(telecallers.map(t => [t.id, t]));
        }
      }

      const processedCases = allCases.map(caseItem => {
        let latestCallStatus: string | undefined = undefined;
        if (caseItem.case_call_logs && Array.isArray(caseItem.case_call_logs) && caseItem.case_call_logs.length > 0) {
          const sortedLogs = [...caseItem.case_call_logs].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          latestCallStatus = sortedLogs[0].call_status;
        }

        // Clean up the case object to remove the raw logs array if we don't want it heavily in memory
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { case_call_logs, ...rest } = caseItem;

        // Find latest PTP Date
        let latestPtpDate = undefined;
        if (caseItem.case_call_logs && Array.isArray(caseItem.case_call_logs)) {
          // Find logs with PTP date
          const ptpLogs = caseItem.case_call_logs
            .filter((log: CallLog) => log.ptp_datetime)
            .sort((a: CallLog, b: CallLog) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

          if (ptpLogs.length > 0) {
            latestPtpDate = ptpLogs[0].ptp_datetime;
          }
        }

        return {
          ...rest,
          latest_call_status: latestCallStatus,
          latest_ptp_date: latestPtpDate,
          telecaller: caseItem.telecaller_id ? telecallerMap.get(caseItem.telecaller_id) : null
        };
      });

      return processedCases as TeamInchargeCase[];
    } catch (error) {
      console.error('Error in getTeamCases:', error);
      throw error;
    }
  },

  async getDeletedTeamCases(tenantId: string, teamId: string): Promise<TeamInchargeCase[]> {
    try {
      // Fetch only deleted cases for the team
      let allCases: (CustomerCase & { case_call_logs?: CallLog[] })[] = [];
      let page = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const { data: cases, error: casesError } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select(`
            *,
            case_call_logs (
              call_status,
              ptp_datetime,
              created_at
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('team_id', teamId)
          .eq('case_status', 'deleted') // Only fetch deleted cases
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (casesError) {
          console.error('Error fetching deleted team cases:', casesError);
          throw new Error('Failed to fetch deleted team cases');
        }

        if (cases) {
          allCases = [...allCases, ...cases];
          if (cases.length < pageSize) {
            hasMore = false;
          }
          page++;
        } else {
          hasMore = false;
        }
      }

      const cases = allCases;

      if (!cases || cases.length === 0) {
        return [];
      }

      // Get unique telecaller IDs
      const telecallerIds = [...new Set(cases.filter((c: CustomerCase) => c.telecaller_id).map((c: CustomerCase) => c.telecaller_id))];

      let telecallerMap = new Map();
      if (telecallerIds.length > 0) {
        const { data: telecallers, error: telecallersError } = await supabase
          .from('employees')
          .select('id, name, emp_id')
          .eq('tenant_id', tenantId)
          .in('id', telecallerIds);

        if (!telecallersError && telecallers) {
          telecallerMap = new Map(telecallers.map((t: { id: string, name: string }) => [t.id, t]));
        }
      }

      // Process cases
      const processedCases = cases.map((caseItem: CustomerCaseWithLogs) => {
        let latestCallStatus = undefined;
        let latestPtpDate = undefined;

        if (caseItem.case_call_logs && Array.isArray(caseItem.case_call_logs)) {
          const logs = caseItem.case_call_logs as CallLog[];
          if (logs.length > 0) {
            const sortedLogs = [...logs].sort((a: CallLog, b: CallLog) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            });
            latestCallStatus = sortedLogs[0].call_status;

            const ptpLog = sortedLogs.find(l => l.ptp_datetime);
            if (ptpLog) {
              latestPtpDate = ptpLog.ptp_datetime;
            }
          }
        }

        const { ...rest } = caseItem;

        return {
          ...rest,
          latest_call_status: latestCallStatus,
          latest_ptp_date: latestPtpDate,
          telecaller: caseItem.telecaller_id ? telecallerMap.get(caseItem.telecaller_id) : null
        };
      });

      return processedCases as TeamInchargeCase[];
    } catch (error) {
      console.error('Error in getDeletedTeamCases:', error);
      throw error;
    }
  },

  async getUnassignedTeamCases(tenantId: string, teamId: string): Promise<TeamInchargeCase[]> {
    let allCases: TeamInchargeCase[] = [];
    let page = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('team_id', teamId)
        .is('telecaller_id', null)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching unassigned cases:', error);
        throw new Error('Failed to fetch unassigned cases');
      }

      if (data) {
        allCases = [...allCases, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        }
        page++;
      } else {
        hasMore = false;
      }
    }

    return allCases;
  },

  async getTeamInchargeStats(tenantId: string, teamIds: string[]): Promise<{
    totalCases: number;
    unassignedCases: number;
    assignedCases: number;
    inProgressCases: number;
    closedCases: number;
  }> {
    if (teamIds.length === 0) {
      return {
        totalCases: 0,
        unassignedCases: 0,
        assignedCases: 0,
        inProgressCases: 0,
        closedCases: 0
      };
    }

    try {
      // We can use the count option with head:true to get counts without data
      // But we need multiple counts. 
      // Efficient way: Get all cases with just the minimal columns needed for counting (status, telecaller_id, team_id)
      // Or use .in() filter

      // Let's fetch minimal data for all teams and aggregate in memory. 
      // Ideally we would use RPC, but this is much better than fetching full objects with joins.

      let allStats: { case_status: string; telecaller_id: string | null }[] = [];
      let page = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select('case_status, telecaller_id')
          .eq('tenant_id', tenantId)
          .in('team_id', teamIds)
          .neq('case_status', 'deleted')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data) {
          allStats = [...allStats, ...data];
          if (data.length < pageSize) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
      }

      const stats = {
        totalCases: allStats.length,
        unassignedCases: allStats.filter(c => !c.telecaller_id).length,
        assignedCases: allStats.filter(c => c.telecaller_id && c.case_status !== 'closed' && c.case_status !== 'resolved').length,
        inProgressCases: allStats.filter(c => c.case_status === 'in_progress').length,
        closedCases: allStats.filter(c => c.case_status === 'closed' || c.case_status === 'resolved').length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return {
        totalCases: 0,
        unassignedCases: 0,
        assignedCases: 0,
        inProgressCases: 0,
        closedCases: 0
      };
    }
  },

  async getExplorerCases(
    tenantId: string,
    teamId: string,
    filters: {
      telecallerId?: string;
      status?: string;
      search?: string;
    },
    page: number = 0,
    pageSize: number = 50
  ): Promise<{ cases: TeamInchargeCase[]; count: number }> {
    try {
      let query = supabase
        .from(CUSTOMER_CASE_TABLE)
        .select(`
          *,
          case_call_logs${filters.status && !['pending', 'in_progress', 'resolved', 'closed', 'all'].includes(filters.status.toLowerCase()) ? '!inner' : ''} (
            call_status,
            ptp_datetime,
            created_at
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('team_id', teamId)
        .neq('case_status', 'deleted');

      // Apply Filters
      if (filters.telecallerId) {
        query = query.eq('telecaller_id', filters.telecallerId);
      }

      if (filters.status && filters.status !== 'all') {
        const s = filters.status;
        const sLower = s.toLowerCase();
        // Check if it's a workflow status or call status
        if (['pending', 'in_progress', 'resolved', 'closed'].includes(sLower)) {
          query = query.eq('case_status', sLower);
        } else {
          // Use the !inner join to filter parents that have at least one log with this status
          query = query.eq('case_call_logs.call_status', s);
        }
      }

      if (filters.search) {
        const search = filters.search;
        // Search loan_id, customer_name, mobile_no
        query = query.or(`loan_id.ilike.%${search}%,customer_name.ilike.%${search}%,mobile_no.ilike.%${search}%`);
      }

      // Pagination
      query = query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      if (!data) return { cases: [], count: 0 };

      // Process cases - reused logic
      // Get unique telecaller IDs
      const telecallerIds = [...new Set(data.filter(c => c.telecaller_id).map(c => c.telecaller_id))];
      let telecallerMap = new Map();
      if (telecallerIds.length > 0) {
        const { data: telecallers } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', telecallerIds);
        if (telecallers) {
          telecallerMap = new Map(telecallers.map(t => [t.id, t]));
        }
      }

      const processedCases = data.map(caseItem => {
        // Sort logs
        const logs = (caseItem.case_call_logs as CallLog[]) || [];
        logs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        const latestCallStatus = logs.length > 0 ? logs[0].call_status : undefined;
        const latestPtpDate = logs.find(l => l.ptp_datetime)?.ptp_datetime;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { case_call_logs, ...rest } = caseItem;

        return {
          ...rest,
          latest_call_status: latestCallStatus,
          latest_ptp_date: latestPtpDate,
          telecaller: caseItem.telecaller_id ? telecallerMap.get(caseItem.telecaller_id) : null
        };
      });

      return { cases: processedCases as TeamInchargeCase[], count: count || 0 };
    } catch (error) {
      console.error('Error in getExplorerCases:', error);
      throw error;
    }
  },



  async getTelecallerDashboardStats(tenantId: string, empId: string, teamId: string) {
    try {
      // 1. Get Employee ID (Internal ID)
      const { data: employee } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .single();

      if (!employee) return { assignedCases: 0, callsToday: 0, recoveryToday: 0 };

      // 2. Get Total Assigned Cases (Count Only)
      // Using team_id filter + telecaller_id to match specific assignment within team
      const { count: assignedCount } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('team_id', teamId)
        .eq('telecaller_id', employee.id)
        .neq('case_status', 'deleted');

      // 3. Get Today's Activity (Calls & Recovery)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from('case_call_logs')
        .select('amount_collected')
        .eq('employee_id', employee.id)
        .gte('created_at', today.toISOString());

      const callsToday = logs?.length || 0;
      const recoveryToday = logs?.reduce((sum, log) => sum + (parseFloat(log.amount_collected || '0')), 0) || 0;

      return {
        assignedCases: assignedCount || 0,
        callsToday,
        recoveryToday
      };

    } catch (error) {
      console.error('Error in getTelecallerDashboardStats:', error);
      return { assignedCases: 0, callsToday: 0, recoveryToday: 0 };
    }
  },

  async getTelecallerCasesPaginated(
    tenantId: string,
    empId: string,
    teamId: string,
    page: number = 1,
    pageSize: number = 10,
    filters: {
      search?: string;
      dpd?: string;
      callStatus?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      pendingFollowups?: boolean;
      allowedIds?: string[];
    } = {}
  ): Promise<{ cases: (CustomerCase & { latest_call_status?: string; latest_call_date?: string; latest_ptp_date?: string })[], total: number }> {
    try {
      const { data: employee } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .single();

      if (!employee) return { cases: [], total: 0 };

      let query = supabase
        .from(CUSTOMER_CASE_TABLE)
        .select(`
                *,
                case_call_logs(call_status, created_at, ptp_datetime)
             `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('team_id', teamId)
        .eq('telecaller_id', employee.id)
        .neq('case_status', 'deleted');

      // Apply Allowed IDs Filter (e.g. for pending followups)
      if (filters.allowedIds && filters.allowedIds.length > 0) {
        query = query.in('id', filters.allowedIds);
      } else if (filters.allowedIds && filters.allowedIds.length === 0) {
        // Explicitly provided empty list means matches nothing
        return { cases: [], total: 0 };
      }

      // Apply Search
      if (filters.search) {
        const term = filters.search.trim();
        query = query.or(`customer_name.ilike.%${term}%,loan_id.ilike.%${term}%,mobile_no.ilike.%${term}%`);
      }

      // Apply DPD Filter
      if (filters.dpd && filters.dpd !== 'all') {
        const range = filters.dpd.split('-');
        if (range.length === 2) {
          query = query.gte('dpd', parseInt(range[0])).lte('dpd', parseInt(range[1]));
        } else if (filters.dpd === '2500+') {
          query = query.gt('dpd', 2500);
        }
      }

      // Apply Call Status Filter
      if (filters.callStatus && filters.callStatus !== 'all') {
        // Use jsonb operator for better compatibility since column may be missing
        query = query.filter('case_data->>latest_call_status', 'eq', filters.callStatus);
      }

      // Sorting
      const sortCol = filters.sortBy || 'dpd';
      const sortOrder = filters.sortOrder === 'asc';

      if (sortCol === 'outstandingAmount') query = query.order('outstanding_amount', { ascending: sortOrder });
      else if (sortCol === 'emiAmount') query = query.order('emi_amount', { ascending: sortOrder });
      else if (sortCol === 'customerName') query = query.order('customer_name', { ascending: sortOrder });
      else if (sortCol === 'lastPaidDate') query = query.order('last_paid_date', { ascending: sortOrder });
      else if (sortCol === 'latestCallStatus') query = query.order('case_data->>latest_call_status', { ascending: sortOrder });
      else query = query.order('dpd', { ascending: sortOrder });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query.range(from, to);

      if (error) {
        // Handle 416 Range Not Satisfiable error (offset exceeds available rows)
        if (error.code === 'PGRST103' && from > 0) {
          console.warn('Pagination offset exceeded, resetting to page 1');
          const { data: retryData, count: retryCount } = await query.range(0, pageSize - 1);
          if (retryData) {
            const enriched = (retryData || []).map((c: CustomerCase & { case_call_logs?: CallLog[]; latest_call_status?: string; latest_call_date?: string; latest_ptp_date?: string }) => {
              const logs = c.case_call_logs || [];
              logs.sort((a: CallLog, b: CallLog) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              const cData = c.case_data || {};
              return {
                ...c,
                case_call_logs: logs,
                latest_call_status: c.latest_call_status || (cData.latest_call_status as string) || logs[0]?.call_status,
                latest_call_date: c.latest_call_date || (cData.latest_call_date as string) || logs[0]?.created_at,
                latest_ptp_date: c.latest_ptp_date || (cData.latest_ptp_date as string) || logs[0]?.ptp_datetime
              };
            });
            return { cases: enriched, total: retryCount || 0 };
          }
        }
        console.error('Error fetching paginated cases:', error);
        return { cases: [], total: 0 };
      }

      const enriched = (data || []).map((c: CustomerCase & { case_call_logs?: CallLog[]; latest_call_status?: string; latest_call_date?: string; latest_ptp_date?: string }) => {
        const logs = c.case_call_logs || [];
        logs.sort((a: CallLog, b: CallLog) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const cData = c.case_data || {};

        return {
          ...c,
          case_call_logs: logs,
          // Only set from logs if not already present from DB (fallback)
          latest_call_status: c.latest_call_status || (cData.latest_call_status as string) || logs[0]?.call_status,
          latest_call_date: c.latest_call_date || (cData.latest_call_date as string) || logs[0]?.created_at,
          latest_ptp_date: c.latest_ptp_date || (cData.latest_ptp_date as string) || logs[0]?.ptp_datetime,
          status_update_count: logs.length
        };
      });

      return { cases: enriched, total: count || 0 };

    } catch (error) {
      console.error('Error in getTelecallerCasesPaginated:', error);
      return { cases: [], total: 0 };
    }
  },

  async getCasesByFilters(tenantId: string, teamId: string, filters: CaseFilters): Promise<TeamInchargeCase[]> {
    let query = supabase
      .from(CUSTOMER_CASE_TABLE)
      .select(`
        *,
        telecaller:employees!telecaller_id(
          id,
          name,
          emp_id
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId);

    if (filters.product && filters.product.trim() !== '') {
      query = query.eq('product_name', filters.product);
    }

    if (filters.telecaller && filters.telecaller.trim() !== '') {
      query = query.eq('telecaller_id', filters.telecaller);
    }

    // Status filter removed - status column no longer exists
    // if (filters.status && filters.status.trim() !== '') {
    //   query = query.eq('status', filters.status);
    // }

    if (filters.dateFrom && filters.dateFrom.trim() !== '') {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo && filters.dateTo.trim() !== '') {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
    }

    const { data: allData, error: fetchError } = await query
      .order('created_at', { ascending: false })
      .range(0, 4999); // Increase limit to 5000 to cover most filtered views

    if (fetchError) {
      console.error('Error fetching filtered cases:', fetchError);
      throw new Error('Failed to fetch filtered cases');
    }


    return allData || [];
  },

  async createBulkCases(cases: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>[], onProgress?: (progress: number, uploaded?: number) => void): Promise<CaseUploadResult> {
    let totalUploaded = 0;
    let autoAssigned = 0;
    let unassigned = 0;
    const errors: Array<{ row: number; error: string; data: unknown }> = [];

    // Get all telecallers for auto-assignment lookup
    const telecallerMap = new Map<string, string>();
    const { data: telecallers } = await supabase
      .from(EMPLOYEE_TABLE)
      .select('id, emp_id')
      .eq('tenant_id', cases[0]?.tenant_id)
      .eq('role', 'Telecaller')
      .eq('status', 'active');

    telecallers?.forEach(tel => {
      telecallerMap.set(tel.emp_id, tel.id);
    });

    // PHASE 1: Pre-validate and prepare all rows
    const validCases: Array<{ rowNumber: number; payload: Record<string, unknown> }> = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const rowNumber = i + 1;

      // Validate required fields
      if (!caseData.tenant_id) {
        errors.push({
          row: rowNumber,
          error: 'tenant_id is required',
          data: caseData
        });
        continue;
      }

      if (!caseData.loan_id) {
        errors.push({
          row: rowNumber,
          error: 'loan_id is required',
          data: caseData
        });
        continue;
      }

      if (!caseData.customer_name) {
        errors.push({
          row: rowNumber,
          error: 'customer_name is required',
          data: caseData
        });
        continue;
      }

      // Auto-assign based on EMPID if available
      if (caseData.case_data?.EMPID && telecallerMap.has(String(caseData.case_data.EMPID))) {
        const telecallerUuid = telecallerMap.get(String(caseData.case_data.EMPID));
        caseData.telecaller_id = telecallerUuid;
        caseData.assigned_employee_id = String(caseData.case_data.EMPID);
        caseData.case_status = 'assigned';
        autoAssigned++;
      } else {
        // Ensure telecaller_id is not sent for unassigned cases
        delete (caseData as { telecaller_id?: string }).telecaller_id;
        caseData.assigned_employee_id = 'UNASSIGNED';
        caseData.case_status = 'pending';
        unassigned++;
      }

      // Create a clean payload
      const payload: Record<string, unknown> = {
        tenant_id: caseData.tenant_id,
        team_id: caseData.team_id,
        product_name: caseData.product_name,
        loan_id: caseData.loan_id,
        customer_name: caseData.customer_name,
        mobile_no: caseData.mobile_no,
        alternate_number: caseData.alternate_number,
        email: caseData.email,
        loan_amount: caseData.loan_amount,
        loan_type: caseData.loan_type,
        outstanding_amount: caseData.outstanding_amount,
        pos_amount: caseData.pos_amount,
        emi_amount: caseData.emi_amount,
        pending_dues: caseData.pending_dues,
        dpd: caseData.dpd,
        branch_name: caseData.branch_name,
        address: caseData.address,
        city: caseData.city,
        state: caseData.state,
        pincode: caseData.pincode,
        sanction_date: caseData.sanction_date,
        last_paid_date: caseData.last_paid_date,
        last_paid_amount: caseData.last_paid_amount,
        payment_link: caseData.payment_link,
        remarks: caseData.remarks,
        case_data: caseData.case_data,
        uploaded_by: caseData.uploaded_by,
        assigned_employee_id: caseData.assigned_employee_id,
        case_status: caseData.case_status
      };

      // Only include telecaller_id if it's a valid UUID
      if (caseData.telecaller_id && typeof caseData.telecaller_id === 'string' && caseData.telecaller_id.length === 36) {
        payload.telecaller_id = caseData.telecaller_id;
      }

      validCases.push({ rowNumber, payload });
    }

    // PHASE 2: Batch upsert with fallback
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(validCases.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, validCases.length);
      const batch = validCases.slice(batchStart, batchEnd);

      // Extract just the payloads for upsert
      const batchPayloads = batch.map(item => item.payload);

      // Try batch upsert first
      const { error: batchError } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .upsert(batchPayloads, {
          onConflict: 'tenant_id,team_id,loan_id',
          ignoreDuplicates: false
        });

      if (!batchError) {
        // Batch succeeded - count all as uploaded
        totalUploaded += batch.length;

        // Report progress
        if (onProgress) {
          const processedSoFar = Math.min(batchEnd, validCases.length);
          const progress = Math.round((processedSoFar / validCases.length) * 100);
          onProgress(progress, totalUploaded);
        }
      } else {
        // Batch failed - fallback to row-by-row for this batch only
        console.warn(`Batch ${batchIndex + 1}/${totalBatches} failed, falling back to row-by-row:`, batchError.message);

        for (const { rowNumber, payload } of batch) {
          try {
            // Try insert first
            let { error } = await supabase
              .from(CUSTOMER_CASE_TABLE)
              .insert([payload]);

            // If duplicate, try update
            if (error && error.code === '23505') {
              const updateData = { ...payload };
              delete updateData.tenant_id;
              delete updateData.loan_id;
              updateData.updated_at = new Date().toISOString();

              const { error: updateError } = await supabase
                .from(CUSTOMER_CASE_TABLE)
                .update(updateData)
                .eq('tenant_id', payload.tenant_id as string)
                .eq('loan_id', payload.loan_id as string);

              error = updateError || null;
            }

            if (error) {
              errors.push({
                row: rowNumber,
                error: error.message || 'Unknown database error',
                data: payload
              });
            } else {
              totalUploaded++;
            }
          } catch (err) {
            errors.push({
              row: rowNumber,
              error: (err as Error).message,
              data: payload
            });
          }
        }

        // Report progress after fallback processing
        if (onProgress) {
          const processedSoFar = Math.min(batchEnd, validCases.length);
          const progress = Math.round((processedSoFar / validCases.length) * 100);
          onProgress(progress, totalUploaded);
        }
      }
    }

    return {
      totalUploaded,
      autoAssigned,
      unassigned,
      errors
    };
  },

  async assignCase(caseId: string, assignment: CaseAssignment): Promise<void> {
    const updateData: Partial<CustomerCase> = {
      telecaller_id: assignment.telecallerId || null,
      updated_at: new Date().toISOString()
    };

    // Set status based on assignment type
    if (assignment.telecallerId) {
      // Assigning - get telecaller's emp_id and set status to 'assigned'
      const { data: telecaller, error: telecallerError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('emp_id')
        .eq('id', assignment.telecallerId)
        .single();

      if (telecallerError || !telecaller) {
        console.error('Error finding telecaller:', telecallerError);
        throw new Error('Failed to find telecaller details');
      }

      updateData.assigned_employee_id = telecaller.emp_id || 'UNASSIGNED';
      // IMPORTANT: Update case_status to 'assigned' when assigned to a telecaller
      updateData.case_status = 'assigned';
    } else {
      // Unassigning - clear assigned_employee_id and telecaller_id
      updateData.assigned_employee_id = 'UNASSIGNED';
      updateData.telecaller_id = null;
      updateData.case_status = 'pending'; // Move back to pending/new pool
    }



    const { error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .update(updateData)
      .eq('id', caseId);

    if (error) {
      console.error('Error assigning/unassigning case:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to update case assignment: ${error.message}`);
    }
  },

  async getTelecallerCaseStats(tenantId: string, telecallerId: string): Promise<{
    total: number;
    new: number;
    assigned: number;
    inProgress: number;
    closed: number;
  }> {
    const { data, error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .select('case_status, telecaller_id')
      .eq('tenant_id', tenantId)
      .eq('telecaller_id', telecallerId);

    if (error) {
      console.error('Error fetching telecaller case stats:', error);
      throw new Error('Failed to fetch telecaller case stats');
    }

    const cases = data || [];
    // For telecaller view, make them mutually exclusive
    return {
      total: cases.length,
      new: cases.filter(c => c.case_status === 'pending' || c.case_status === 'new').length,
      assigned: cases.filter(c => c.case_status === 'assigned').length,
      inProgress: cases.filter(c => c.case_status === 'in_progress').length,
      closed: cases.filter(c => c.case_status === 'closed' || c.case_status === 'resolved').length
    };
  },

  async recordPayment(caseId: string, employeeId: string, amount: number, notes: string): Promise<CustomerCase> {


    // Validate inputs
    if (!caseId || !employeeId) {
      throw new Error('Missing required parameters: caseId or employeeId');
    }

    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    const { data: currentCase, error: fetchError } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .select('*')
      .eq('id', caseId)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching case for payment:', fetchError);
      throw new Error('Failed to fetch case details: ' + fetchError.message);
    }

    if (!currentCase) {
      console.error('❌ No case found with ID:', caseId);
      throw new Error('Case not found');
    }



    // Safely parse total_collected_amount
    const currentCollected = parseFloat(String(currentCase.total_collected_amount || 0));
    if (isNaN(currentCollected)) {
      console.error('❌ Invalid total_collected_amount:', currentCase.total_collected_amount);
      throw new Error('Invalid collected amount in database');
    }

    const newTotalCollected = currentCollected + amount;

    // Safely parse outstanding_amount
    const outstandingAmountStr = String(currentCase.outstanding_amount || '0').replace(/[^0-9.-]/g, '');
    const outstandingAmount = parseFloat(outstandingAmountStr);
    if (isNaN(outstandingAmount)) {
      console.warn('⚠️ Invalid outstanding_amount, defaulting to 0:', currentCase.outstanding_amount);
    }

    const remainingAmount = outstandingAmount - newTotalCollected;
    const shouldCloseCase = remainingAmount <= 0;

    // 1. Log the payment as a call log
    const { error: logError } = await supabase
      .from(CASE_CALL_LOG_TABLE)
      .insert({
        tenant_id: currentCase.tenant_id,
        case_id: caseId,
        employee_id: employeeId,
        call_status: 'PAYMENT_RECEIVED',
        call_notes: notes,
        amount_collected: String(amount)
      });

    if (logError) {
      console.error('❌ Error logging payment:', logError);
      throw new Error('Failed to record payment log: ' + logError.message);
    }

    // 2. Prepare case data update (jsonb)
    const newCaseData = {
      ...(currentCase?.case_data || {}),
      latest_call_status: 'PAYMENT_RECEIVED',
      latest_call_date: new Date().toISOString(),
      latest_call_notes: notes
    };

    const updateData: Partial<CustomerCase> = {
      total_collected_amount: newTotalCollected,
      case_data: newCaseData,
      updated_at: new Date().toISOString()
    };

    if (shouldCloseCase) {
      updateData.case_status = 'closed';
    }


    const { data: updatedCase, error: updateError } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .update(updateData)
      .eq('id', caseId)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.error('❌ Error updating case with payment:', updateError);
      throw new Error('Failed to update case: ' + updateError.message);
    }

    if (!updatedCase) {
      console.error('❌ No case returned after update');
      throw new Error('Failed to retrieve updated case');
    }

    console.log('✅ Payment recorded successfully! New total:', newTotalCollected);
    return updatedCase;
  },

  async getCompleteCaseDataForExport(tenantId: string, empId: string): Promise<EnrichedCustomerCase[]> {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id, emp_id, name')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .eq('role', 'Telecaller')
        .eq('status', 'active')
        .maybeSingle();

      if (employeeError || !employee) {
        console.error('Error finding telecaller employee:', employeeError);
        return [];
      }

      const { data: cases, error: casesError } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employee.id)
        .order('created_at', { ascending: false });

      if (casesError) {
        console.error('Error fetching cases for export:', casesError);
        return [];
      }

      if (!cases || cases.length === 0) {
        return [];
      }

      const caseIds = cases.map((c: CustomerCase) => c.id);

      // Chunk the case IDs to avoid 414 Request-URI Too Large errors
      const chunkSize = 50;
      const allCallLogs: any[] = [];

      for (let i = 0; i < caseIds.length; i += chunkSize) {
        const chunk = caseIds.slice(i, i + chunkSize);
        const { data: batchLogs, error: logsError } = await supabase
          .from(CASE_CALL_LOG_TABLE)
          .select('*')
          .in('case_id', chunk)
          .order('created_at', { ascending: false });

        if (logsError) {
          console.error(`Error fetching call logs chunk for export:`, logsError);
          continue;
        }

        if (batchLogs) {
          allCallLogs.push(...batchLogs);
        }
      }



      const latestCallLogMap = new Map();
      const paymentLogsMap = new Map();

      if (allCallLogs && allCallLogs.length > 0) {
        allCallLogs.forEach(log => {
          if (!latestCallLogMap.has(log.case_id)) {
            latestCallLogMap.set(log.case_id, log);
          }

          if (log.call_status === 'PAYMENT_RECEIVED' && log.amount_collected) {
            if (!paymentLogsMap.has(log.case_id)) {
              paymentLogsMap.set(log.case_id, []);
            }
            paymentLogsMap.get(log.case_id).push({
              amount: parseFloat(log.amount_collected),
              date: log.created_at,
              notes: log.call_notes
            });
          }
        });
      }

      const enrichedCases = cases.map(caseItem => {
        const latestCallLog = latestCallLogMap.get(caseItem.id);
        const payments = paymentLogsMap.get(caseItem.id) || [];

        const totalPayments = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
        const paymentCount = payments.length;
        const lastPayment = payments.length > 0 ? payments[0] : null;

        return {
          ...caseItem,
          latest_call_status: latestCallLog?.call_status || 'No calls yet',
          latest_call_notes: latestCallLog?.call_notes || '',
          latest_call_date: latestCallLog?.created_at || '',
          latest_ptp_date: latestCallLog?.ptp_datetime || '',
          payment_count: paymentCount,
          last_payment_amount: lastPayment?.amount || 0,
          last_payment_date: lastPayment?.date || '',
          calculated_total_collected: totalPayments
        };
      });

      return enrichedCases;
    } catch (error) {
      console.error('Error in getCompleteCaseDataForExport:', error);
      return [];
    }
  },
  async getDashboardMetrics(tenantId: string, empId: string, teamId?: string): Promise<{
    collections: {
      collected: number;
      target: number;
      progress: number;
    };
    followUps: {
      todaysFollowUps: number;
      upcomingFollowUps: number;
      todaysPTP: number;
    };
    caseStatus: {
      total: number;
      new: number;
      assigned: number;
      inProgress: number;
      closed: number;
    };
  }> {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id, emp_id, name')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .eq('role', 'Telecaller')
        .eq('status', 'active')
        .maybeSingle();

      if (employeeError || !employee) {
        console.error('Error finding telecaller employee:', employeeError);
        return {
          collections: { collected: 0, target: 100000, progress: 0 },
          followUps: { todaysFollowUps: 0, upcomingFollowUps: 0, todaysPTP: 0 },
          caseStatus: { total: 0, new: 0, assigned: 0, inProgress: 0, closed: 0 }
        };
      }

      if (!teamId) {
        console.warn('⚠️ No team specified for dashboard metrics');
        return {
          collections: { collected: 0, target: 100000, progress: 0 },
          followUps: { todaysFollowUps: 0, upcomingFollowUps: 0, todaysPTP: 0 },
          caseStatus: { total: 0, new: 0, assigned: 0, inProgress: 0, closed: 0 }
        };
      }

      // 1. Get accurate counts using parallel count-only queries
      const [
        { count: totalCount },
        { count: newCount },
        { count: assignedCount },
        { count: inProgressCount },
        { count: closedCount }
      ] = await Promise.all([
        supabase.from(CUSTOMER_CASE_TABLE).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('telecaller_id', employee.id).eq('team_id', teamId).neq('case_status', 'deleted'),
        supabase.from(CUSTOMER_CASE_TABLE).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('telecaller_id', employee.id).eq('team_id', teamId).eq('case_status', 'new'),
        supabase.from(CUSTOMER_CASE_TABLE).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('telecaller_id', employee.id).eq('team_id', teamId).in('case_status', ['assigned', 'pending']),
        supabase.from(CUSTOMER_CASE_TABLE).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('telecaller_id', employee.id).eq('team_id', teamId).eq('case_status', 'in_progress'),
        supabase.from(CUSTOMER_CASE_TABLE).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('telecaller_id', employee.id).eq('team_id', teamId).in('case_status', ['closed', 'resolved', 'fully_paid'])
      ]);

      // 2. Sum total collections for this telecaller (Paginating if necessary)
      let totalCollected = 0;
      let hasMore = true;
      let page = 0;
      while (hasMore) {
        const { data, error } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select('total_collected_amount')
          .eq('tenant_id', tenantId)
          .eq('telecaller_id', employee.id)
          .eq('team_id', teamId)
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          totalCollected += data.reduce((sum, c) => sum + (parseFloat(String(c.total_collected_amount || 0))), 0);
          if (data.length < 1000) hasMore = false;
          page++;
        }
      }

      // 3. For follow-ups and PTPs, we still need logs but we'll fetch only what's needed for counts
      // To truly fix this for >1000 logs, we'd need count queries for specific date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const { count: todaysPTP } = await supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee.id)
        .gte('created_at', todayStr)
        .in('call_status', ['PTP', 'FUTURE_PTP']);

      // For actual follow-up dates, we still need to fetch some logs to see the dates
      // For now, let's just get the count of cases that HAVE a ptp_datetime >= today
      const { count: todaysFollowUps } = await supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee.id)
        .gte('ptp_datetime', todayStr)
        .lt('ptp_datetime', new Date(today.getTime() + 86400000).toISOString());

      const { count: upcomingFollowUps } = await supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee.id)
        .gt('ptp_datetime', new Date(today.getTime() + 86400000).toISOString());

      return {
        collections: {
          collected: totalCollected,
          target: 100000,
          progress: Math.min(Math.round((totalCollected / 100000) * 100), 100)
        },
        followUps: {
          todaysFollowUps: todaysFollowUps || 0,
          upcomingFollowUps: upcomingFollowUps || 0,
          todaysPTP: todaysPTP || 0
        },
        caseStatus: {
          total: totalCount || 0,
          new: newCount || 0,
          assigned: assignedCount || 0,
          inProgress: inProgressCount || 0,
          closed: closedCount || 0
        }
      };
    } catch (error) {
      console.error('Error in getDashboardMetrics:', error);
      return {
        collections: { collected: 0, target: 100000, progress: 0 },
        followUps: { todaysFollowUps: 0, upcomingFollowUps: 0, todaysPTP: 0 },
        caseStatus: { total: 0, new: 0, assigned: 0, inProgress: 0, closed: 0 }
      };
    }
  },

  async getCasesWithPendingFollowups(tenantId: string, empId: string, teamId?: string): Promise<string[]> {
    try {
      const { data: employee, error: employeeError } = await supabase
        .from(EMPLOYEE_TABLE)
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('emp_id', empId)
        .eq('role', 'Telecaller')
        .eq('status', 'active')
        .maybeSingle();

      if (employeeError || !employee) {
        console.error('Error finding telecaller employee:', employeeError);
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Fetch all case_ids that have a pending PTP
      // We paginate to ensure we get ALL logs if there are >1000
      const pendingCaseIds = new Set<string>();
      let hasMore = true;
      let page = 0;
      while (hasMore) {
        const query = supabase
          .from(CASE_CALL_LOG_TABLE)
          .select('case_id')
          .eq('tenant_id', tenantId)
          .eq('employee_id', employee.id)
          .gte('ptp_datetime', todayStr)
          .range(page * 1000, (page + 1) * 1000 - 1);

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          data.forEach(log => pendingCaseIds.add(log.case_id));
          if (data.length < 1000) hasMore = false;
          page++;
        }
      }

      // Optional: Filter those case IDs to ensure they belong to the current team and aren't deleted
      // This is important if a telecaller works on multiple teams or cases can be deleted
      const finalCaseIds: string[] = [];
      const idArray = Array.from(pendingCaseIds);

      // Since we might have many IDs, we check them in batches of 500
      for (let i = 0; i < idArray.length; i += 500) {
        const batch = idArray.slice(i, i + 500);
        let checkQuery = supabase
          .from(CUSTOMER_CASE_TABLE)
          .select('id')
          .in('id', batch)
          .neq('case_status', 'deleted');

        if (teamId) {
          checkQuery = checkQuery.eq('team_id', teamId);
        }

        const { data: validCases } = await checkQuery;
        if (validCases) {
          validCases.forEach(c => finalCaseIds.push(c.id));
        }
      }

      return finalCaseIds;
    } catch (error) {
      console.error('Error in getCasesWithPendingFollowups:', error);
      return [];
    }
  },

  // View tracking methods
  async markCaseAsViewed(caseId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('case_views')
        .upsert(
          { case_id: caseId, user_id: userId, viewed_at: new Date().toISOString() },
          { onConflict: 'case_id,user_id' }
        );

      if (error) {
        // If table doesn't exist yet, just ignore (migration might not be applied)
        if (error.code === '42P01') return;
        console.error('Error marking case as viewed:', error);
      }
    } catch (error) {
      console.error('Error in markCaseAsViewed:', error);
    }
  },

  async getViewedCaseIds(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from('case_views')
        .select('case_id')
        .eq('user_id', userId);

      if (error) {
        // If table doesn't exist yet, just return empty set
        if (error.code === '42P01') return new Set();
        console.error('Error fetching viewed cases:', error);
        return new Set();
      }

      return new Set(data?.map(v => v.case_id) || []);
    } catch (error) {
      console.error('Error in getViewedCaseIds:', error);
      return new Set();
    }
  },

  async getTodayPTPCases(tenantId: string, employeeId?: string, teamId?: string): Promise<TeamInchargeCase[]> {
    try {
      console.log('🔍 getTodayPTPCases called', { tenantId, employeeId, teamId });

      // Strict filtering: require either employeeId OR teamId
      if (employeeId && !teamId) {
        console.warn('⚠️ Telecaller PTP request without teamId - returning empty');
        return [];
      }

      // NOTE: Removed check for !employeeId && !teamId to allow fetching all PTPs for the tenant (e.g. for Company Admin)

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Get ALL logs for today for this tenant
      const logsQuery = supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('case_id, ptp_datetime')
        .eq('tenant_id', tenantId) // Filter by tenant
        .gte('ptp_datetime', startOfDay.toISOString())
        .lte('ptp_datetime', endOfDay.toISOString())
        .not('ptp_datetime', 'is', null)
        .order('ptp_datetime', { ascending: true });

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching PTP logs:', logsError);
        return [];
      }

      if (!logs || logs.length === 0) {
        console.log('No PTPs found for today');
        return [];
      }

      // Map caseId to its PTP datetime
      const ptpMap = new Map<string, string>();
      logs.forEach(log => {
        if (log.ptp_datetime) {
          ptpMap.set(log.case_id, log.ptp_datetime);
        }
      });

      const caseIds = Array.from(ptpMap.keys());
      if (caseIds.length === 0) return [];

      const chunkSize = 20;
      const chunks = [];
      for (let i = 0; i < caseIds.length; i += chunkSize) {
        chunks.push(caseIds.slice(i, i + chunkSize));
      }

      const allCases: TeamInchargeCase[] = [];

      for (const chunk of chunks) {
        let casesQuery = supabase
          .from(CUSTOMER_CASE_TABLE)
          .select(`
            *,
            telecaller:employees!telecaller_id(
              id,
              name,
              emp_id
            )
          `)
          .eq('tenant_id', tenantId)
          .in('id', chunk)
          .order('created_at', { ascending: false });

        // Apply filters
        if (employeeId) {
          casesQuery = casesQuery.eq('telecaller_id', employeeId);
        }
        if (teamId) {
          casesQuery = casesQuery.eq('team_id', teamId);
        }

        const { data: cases, error: casesError } = await casesQuery;

        if (casesError) {
          console.error('Error fetching PTP cases chunk:', casesError);
          continue;
        }

        if (cases && cases.length > 0) {
          // Fetch latest call logs for this chunk only
          // We need to know the LATEST call date for these cases
          const chunkCaseIds = cases.map(c => c.id);
          const { data: latestLogs, error: logsError } = await supabase
            .from(CASE_CALL_LOG_TABLE)
            .select('case_id, created_at, call_status')
            .in('case_id', chunkCaseIds)
            .order('created_at', { ascending: false }); // We get all, but sorting helps find latest

          const latestLogMap = new Map<string, { created_at: string, call_status: string }>();

          if (latestLogs && !logsError) {
            // Since it's sorted desc, the first one we see for a case is the latest
            latestLogs.forEach(log => {
              if (!latestLogMap.has(log.case_id)) {
                latestLogMap.set(log.case_id, {
                  created_at: log.created_at,
                  call_status: log.call_status
                });
              }
            });
          }

          const enrichedCases = cases.map((c) => {
            const latestLog = latestLogMap.get(c.id);
            const details = c.case_data || {};

            // Helper to extract values from case_data
            const getValueFromDetails = (keys: string[]) => {
              for (const key of keys) {
                if (details[key] !== undefined && details[key] !== null && details[key] !== '') {
                  return String(details[key]);
                }
              }
              return '';
            };

            return {
              ...c,
              outstanding_amount: c.outstanding_amount || getValueFromDetails(['totalOutstanding', 'outstandingAmount', 'TOTAL OUTSTANDING', 'Total Outstanding', 'pos', 'posAmount']) || '0',
              latest_ptp_date: ptpMap.get(c.id) || startOfDay.toISOString(),
              latest_call_date: latestLog?.created_at,
              latest_call_status: latestLog?.call_status || c.latest_call_status
            };
          }).filter(c => c.latest_call_status !== 'PAYMENT_RECEIVED');

          allCases.push(...enrichedCases);
        }
      }

      return allCases as TeamInchargeCase[];

    } catch (error) {
      console.error('Unexpected error in getTodayPTPCases:', error);
      return [];
    }
  },

  async getTodayCallbackCases(tenantId: string, employeeId?: string, teamId?: string): Promise<TeamInchargeCase[]> {
    try {
      console.log('🔍 getTodayCallbackCases called', { tenantId, employeeId, teamId });

      // Strict filtering: require either employeeId OR teamId
      if (employeeId && !teamId) {
        console.warn('⚠️ Telecaller Callback request without teamId - returning empty');
        return [];
      }

      // NOTE: Removed check for !employeeId && !teamId to allow fetching all Callbacks for the tenant

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Get ALL callback logs for today for this tenant
      const logsQuery = supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('case_id, callback_datetime')
        .eq('tenant_id', tenantId)
        .gte('callback_datetime', startOfDay.toISOString())
        .lte('callback_datetime', endOfDay.toISOString())
        .not('callback_datetime', 'is', null)
        .order('callback_datetime', { ascending: true });

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching callback logs:', logsError);
        return [];
      }

      if (!logs || logs.length === 0) {
        console.log('No callbacks found for today');
        return [];
      }

      // Map caseId to its callback datetime
      const callbackMap = new Map<string, string>();
      logs.forEach(log => {
        if (log.callback_datetime) {
          callbackMap.set(log.case_id, log.callback_datetime);
        }
      });

      const caseIds = Array.from(callbackMap.keys());

      if (caseIds.length === 0) return [];

      // Chunk the case IDs to avoid 400 Bad Request (URL too long)
      const chunkSize = 20;
      const chunks = [];
      for (let i = 0; i < caseIds.length; i += chunkSize) {
        chunks.push(caseIds.slice(i, i + chunkSize));
      }

      const allCases: TeamInchargeCase[] = [];

      for (const chunk of chunks) {
        let casesQuery = supabase
          .from(CUSTOMER_CASE_TABLE)
          .select(`
            *,
            telecaller:employees!telecaller_id(
              id,
              name,
              emp_id
            )
          `)
          .eq('tenant_id', tenantId)
          .in('id', chunk)
          .order('created_at', { ascending: false });

        // Apply filters
        if (employeeId) {
          casesQuery = casesQuery.eq('telecaller_id', employeeId);
        }
        if (teamId) {
          casesQuery = casesQuery.eq('team_id', teamId);
        }

        const { data: cases, error: casesError } = await casesQuery;

        if (casesError) {
          console.error('Error fetching callback cases chunk:', casesError);
          continue;
        }

        if (cases && cases.length > 0) {
          // Fetch latest call logs for this chunk
          const chunkCaseIds = cases.map(c => c.id);
          const { data: latestLogs, error: logsError } = await supabase
            .from(CASE_CALL_LOG_TABLE)
            .select('case_id, created_at, call_status')
            .in('case_id', chunkCaseIds)
            .order('created_at', { ascending: false });

          const latestLogMap = new Map<string, { created_at: string, call_status: string }>();

          if (latestLogs && !logsError) {
            latestLogs.forEach(log => {
              if (!latestLogMap.has(log.case_id)) {
                latestLogMap.set(log.case_id, {
                  created_at: log.created_at,
                  call_status: log.call_status
                });
              }
            });
          }

          const enrichedCases = cases.map((c) => {
            const latestLog = latestLogMap.get(c.id);
            const details = c.case_data || {};

            const getValueFromDetails = (keys: string[]) => {
              for (const key of keys) {
                if (details[key] !== undefined && details[key] !== null && details[key] !== '') {
                  return String(details[key]);
                }
              }
              return '';
            };

            return {
              ...c,
              outstanding_amount: c.outstanding_amount || getValueFromDetails(['totalOutstanding', 'outstandingAmount', 'TOTAL OUTSTANDING', 'Total Outstanding', 'pos', 'posAmount']) || '0',
              latest_callback_date: callbackMap.get(c.id),
              latest_call_date: latestLog?.created_at,
              latest_call_status: latestLog?.call_status || c.latest_call_status
            };
          }).filter(c => c.latest_call_status !== 'PAYMENT_RECEIVED');

          allCases.push(...enrichedCases);
        }
      }

      return allCases as TeamInchargeCase[];

    } catch (error) {
      console.error('Unexpected error in getTodayCallbackCases:', error);
      return [];
    }
  },
  async getPaymentHistory(
    tenantId: string,
    employeeId?: string,
    teamId?: string,
    page: number = 0,
    pageSize: number = 100
  ): Promise<TeamInchargeCase[]> {
    try {
      // 0. Pre-fetch team telecallers if teamId is provided but employeeId is not
      let teamEmployeeIds: string[] = [];
      if (teamId && !employeeId) {
        const { data: teamTelecallers } = await supabase
          .from('team_telecallers')
          .select('telecaller_id')
          .eq('team_id', teamId);

        if (teamTelecallers) {
          teamEmployeeIds = teamTelecallers.map(t => t.telecaller_id);
        }
      }

      // 1. Get payment logs for this tenant (paginated, recent first)
      let logsQuery = supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('case_id, created_at, amount_collected, call_status')
        .eq('tenant_id', tenantId)
        .gt('amount_collected', 0) // Only where amount > 0
        .order('created_at', { ascending: false });

      // Apply Telecaller Filter directly on logs
      if (employeeId) {
        logsQuery = logsQuery.eq('employee_id', employeeId);
      } else if (teamId) {
        // If filtering by team, only include logs from employees in that team
        if (teamEmployeeIds.length > 0) {
          logsQuery = logsQuery.in('employee_id', teamEmployeeIds);
        } else {
          // Team has no employees or invalid team, return empty to be safe
          return [];
        }
      }

      // Apply Pagination to the filtered logs
      logsQuery = logsQuery.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('Error fetching payment logs:', logsError);
        return [];
      }

      if (!logs || logs.length === 0) {
        return [];
      }

      // Map logs to aggregate/latest info for the case WITHIN THIS PAGE
      // Note: If a case appears multiple times in the page, we aggregate it.
      const paymentMap = new Map<string, { latestTime: string; totalAmount: number }>();
      logs.forEach(log => {
        const amount = typeof log.amount_collected === 'number' ? log.amount_collected : parseFloat(log.amount_collected);
        const current = paymentMap.get(log.case_id) || { latestTime: log.created_at, totalAmount: 0 };

        paymentMap.set(log.case_id, {
          latestTime: log.created_at > current.latestTime ? log.created_at : current.latestTime,
          totalAmount: current.totalAmount + (isNaN(amount) ? 0 : amount)
        });
      });

      const caseIds = Array.from(paymentMap.keys());
      if (caseIds.length === 0) return [];

      const chunkSize = 20;
      const chunks = [];
      for (let i = 0; i < caseIds.length; i += chunkSize) {
        chunks.push(caseIds.slice(i, i + chunkSize));
      }

      const allCases: TeamInchargeCase[] = [];

      for (const chunk of chunks) {
        let casesQuery = supabase
          .from(CUSTOMER_CASE_TABLE)
          .select(`
            *,
            telecaller:employees!telecaller_id(
              id,
              name,
              emp_id
            )
          `)
          .eq('tenant_id', tenantId)
          .in('id', chunk)
          .order('created_at', { ascending: false });

        if (employeeId) {
          casesQuery = casesQuery.eq('telecaller_id', employeeId);
        }
        if (teamId) {
          casesQuery = casesQuery.eq('team_id', teamId);
        }

        const { data: cases, error: casesError } = await casesQuery;

        if (casesError) {
          console.error('Error fetching payment cases chunk:', casesError);
          continue;
        }

        if (cases && cases.length > 0) {
          const enrichedCases = cases.map((c) => {
            const paymentInfo = paymentMap.get(c.id);
            const details = c.case_data || {};

            const getValueFromDetails = (keys: string[]) => {
              for (const key of keys) {
                if (details[key] !== undefined && details[key] !== null && details[key] !== '') {
                  return String(details[key]);
                }
              }
              return '';
            };

            return {
              ...c,
              outstanding_amount: c.outstanding_amount || getValueFromDetails(['totalOutstanding', 'outstandingAmount', 'pos', 'posAmount']) || '0',
              latest_payment_date: paymentInfo?.latestTime,
              today_payment_amount: paymentInfo?.totalAmount || 0,
              latest_call_status: 'PAYMENT_RECEIVED'
            };
          });

          allCases.push(...enrichedCases);
        }
      }

      return allCases.sort((a, b) => {
        const dateA = a.latest_payment_date ? new Date(a.latest_payment_date).getTime() : 0;
        const dateB = b.latest_payment_date ? new Date(b.latest_payment_date).getTime() : 0;
        return dateB - dateA;
      }) as TeamInchargeCase[];

    } catch (error) {
      console.error('Unexpected error in getPaymentHistory:', error);
      return [];
    }
  },
  async getGlobalStats() {
    try {
      const { data: cases, error } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('total_collected_amount');

      if (error) throw error;

      const totalCollected = (cases || []).reduce((sum, c) => sum + (c.total_collected_amount || 0), 0);

      const { data: logs, error: logsError } = await supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('created_at, amount_collected')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Group collections by month for trend
      const monthlyCollections: Record<string, number> = {};
      logs?.forEach(log => {
        if (log.amount_collected && parseFloat(log.amount_collected) > 0) {
          const date = new Date(log.created_at);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          monthlyCollections[monthKey] = (monthlyCollections[monthKey] || 0) + parseFloat(log.amount_collected);
        }
      });

      const trend = Object.entries(monthlyCollections).map(([month, amount]) => ({
        month,
        amount
      })).slice(-6); // Last 6 months

      return {
        totalCollected,
        trend,
        recentLogs: logs?.slice(0, 10) || []
      };
    } catch (error) {
      console.error('Error fetching global stats:', error);
      return { totalCollected: 0, trend: [], recentLogs: [] };
    }
  },

  async toggleRetainCase(caseId: string, isRetained: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .update({ is_retained: isRetained, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling retain status:', error);
      throw error;
    }
  },

  async getRetainedCases(tenantId: string, employeeId: string): Promise<TeamInchargeCase[]> {
    try {
      const { data: cases, error } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employeeId)
        .eq('is_retained', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!cases || cases.length === 0) return [];

      // Fetch telecaller details to match TeamInchargeCase structure
      const { data: telecaller, error: telError } = await supabase
        .from('employees')
        .select('id, name, emp_id')
        .eq('id', employeeId)
        .single();

      const telecallerDetails = (!telError && telecaller) ? telecaller : null;

      return cases.map(c => ({
        ...c,
        telecaller: telecallerDetails
      })) as TeamInchargeCase[];
    } catch (error) {
      console.error('Error fetching retained cases:', error);
      return [];
    }
  },

  async bulkUpdateCallResponses(
    tenantId: string,
    employeeId: string,
    updates: Array<{
      loan_id: string;
      call_status: string;
      remarks?: string;
      ptp_date?: string;
      ptp_amount?: number;
    }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      console.log(`🚀 Starting bulk update for ${updates.length} records`);

      // 1. Fetch all cases assigned to this employee to build a Loan ID -> Case ID map
      // We also fetch current case_data to perform a merge
      const { data: assignedCases, error: fetchError } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('id, loan_id, case_data')
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employeeId);

      if (fetchError) throw fetchError;

      const loanToCaseMap = new Map<string, string>();
      const caseDataMap = new Map<string, Record<string, unknown>>();
      assignedCases?.forEach(c => {
        if (c.loan_id) {
          loanToCaseMap.set(c.loan_id, c.id);
          caseDataMap.set(c.id, c.case_data || {});
        }
      });

      const callLogsToInsert = [];
      const casesToUpdate = [];
      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (const update of updates) {
        const caseId = loanToCaseMap.get(update.loan_id);
        if (!caseId) {
          errors.push(`Loan ID ${update.loan_id} not found or not assigned to you.`);
          failedCount++;
          continue;
        }

        // Validate Call Status
        if (!CALL_STATUSES.includes(update.call_status as CallStatus)) {
          errors.push(`Invalid status '${update.call_status}' for Loan ID ${update.loan_id}. Allowed: ${CALL_STATUSES.join(', ')}`);
          failedCount++;
          continue;
        }

        // Prepare Call Log
        callLogsToInsert.push({
          tenant_id: tenantId,
          case_id: caseId,
          employee_id: employeeId,
          call_status: update.call_status,
          call_notes: update.remarks || '',
          ptp_datetime: update.ptp_date ? new Date(update.ptp_date).toISOString() : null,
          amount_collected: update.ptp_amount || 0,
          created_at: new Date().toISOString()
        });

        // Prepare Case Update - Merging into case_data for schema compatibility
        const currentData = caseDataMap.get(caseId) || {};
        const mergedCaseData = {
          ...currentData,
          latest_call_status: update.call_status,
          latest_call_notes: update.remarks || '',
          latest_call_date: new Date().toISOString(),
          ...(update.ptp_date && { latest_ptp_date: update.ptp_date }),
          ...(update.ptp_amount && { last_ptp_amount: update.ptp_amount })
        };

        casesToUpdate.push({
          id: caseId,
          tenant_id: tenantId,
          case_status: 'in_progress',
          case_data: mergedCaseData,
          updated_at: new Date().toISOString()
        });

        successCount++;
      }

      // 2. Perform batch operations
      if (callLogsToInsert.length > 0) {
        const { error: logError } = await supabase.from(CASE_CALL_LOG_TABLE).insert(callLogsToInsert);
        if (logError) throw logError;
      }

      if (casesToUpdate.length > 0) {
        // Perform individual updates since upsert requires all non-null columns
        for (const caseUpdate of casesToUpdate) {
          const { error: caseError } = await supabase
            .from(CUSTOMER_CASE_TABLE)
            .update({
              case_status: caseUpdate.case_status,
              case_data: caseUpdate.case_data,
              updated_at: caseUpdate.updated_at
            })
            .eq('id', caseUpdate.id)
            .eq('tenant_id', caseUpdate.tenant_id);

          if (caseError) throw caseError;
        }
      }

      return {
        success: successCount,
        failed: failedCount,
        errors
      };
    } catch (error) {
      console.error('❌ Bulk update failed:', error);
      throw error;
    }
  },

  async previewBulkUpdates(
    tenantId: string,
    employeeId: string,
    loanIds: string[]
  ): Promise<Array<{ loan_id: string; customer_name?: string; status: 'found' | 'not_found' | 'not_assigned' }>> {
    try {
      // 1. Fetch all matching cases for these Loan IDs in the tenant with chunking
      const chunkSize = 50;
      const matchedCases: any[] = [];

      for (let i = 0; i < loanIds.length; i += chunkSize) {
        const chunk = loanIds.slice(i, i + chunkSize);
        const { data: batchCases, error } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select('loan_id, customer_name, telecaller_id')
          .eq('tenant_id', tenantId)
          .in('loan_id', chunk);

        if (error) {
          console.error('Error fetching batch cases for preview:', error);
          continue;
        }

        if (batchCases) {
          matchedCases.push(...batchCases);
        }
      }



      // 2. Build a map for lookup
      const loanMap = new Map<string, { name: string; assignedTo: string | null }>();
      matchedCases?.forEach(c => {
        if (c.loan_id) {
          loanMap.set(c.loan_id, { name: c.customer_name, assignedTo: c.telecaller_id });
        }
      });

      // 3. Process each requested Loan ID
      return loanIds.map(id => {
        const match = loanMap.get(id);
        if (!match) {
          return { loan_id: id, status: 'not_found' };
        }
        if (match.assignedTo !== employeeId) {
          return { loan_id: id, customer_name: match.name, status: 'not_assigned' };
        }
        return { loan_id: id, customer_name: match.name, status: 'found' };
      });
    } catch (error) {
      console.error('❌ Preview failed:', error);
      throw error;
    }

  },

  async getLiveMonitoringStats(tenantId: string, teamIds: string[]): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_live_monitoring_stats', {
        p_tenant_id: tenantId,
        p_team_ids: teamIds
      });

      if (error) {
        // If RPC not found, return empty array to prevent crash
        if (error.code === '42883') { // Undefined function
          console.error('RPC get_live_monitoring_stats not found. Please run the migration.');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching live monitoring stats:', error);
      return [];
    }
  }
};
