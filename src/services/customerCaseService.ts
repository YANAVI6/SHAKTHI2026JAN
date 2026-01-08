import { supabase } from '../lib/supabase';
import {
  CUSTOMER_CASE_TABLE,
  EMPLOYEE_TABLE,
  CASE_CALL_LOG_TABLE
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

    // Fetch employee names
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name')
      .in('id', employeeIds);

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      // Return logs without employee names if fetch fails
      return logs.map(log => ({
        ...log,
        employee_name: 'Unknown'
      }));
    }

    // Create a map of employee IDs to names
    const employeeMap = new Map(
      (employees || []).map(emp => [emp.id, emp.name])
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

  async getLiveMonitoringStats(tenantId: string, teamIds: string[]): Promise<unknown[]> {
    try {
      // 1. Get Teams with Telecallers via Junction Table
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
                id, 
                name, 
                team_telecallers (
                    employees:telecaller_id (id, name, emp_id, role, status)
                )
            `)
        .in('id', teamIds)
        .eq('status', 'active'); // Teams must be active

      if (error) {
        console.error('Error fetching teams for live monitoring:', error);
        return [];
      }

      if (!teams) return [];

      // Flatten the structure: Team -> Junction -> Employee
      const teamsWithEmployees = teams.map(t => {
        const junctions = (t.team_telecallers as unknown as { employees: { id: string, name: string, emp_id: string, role: string, status: string } }[]) || [];
        // Filter out any null employees or non-active/non-telecaller ones if needed
        // The TeamService generally ensures valid assignments, but safe to filter.
        const employees = junctions
          .map(j => j.employees)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((e: any) => e && e.status === 'active' && e.role === 'Telecaller');

        return {
          ...t,
          telecallers: employees
        };
      });

      const allTelecallerIds = teamsWithEmployees.flatMap(t => t.telecallers.map((e: { id: string }) => e.id));

      if (allTelecallerIds.length === 0) {
        return teamsWithEmployees.map(t => ({
          teamId: t.id,
          teamName: t.name,
          totalCases: 0,
          liveCases: 0,
          telecallers: []
        }));
      }

      // 2. Get User Activity
      const { data: activityData } = await supabase
        .from('user_activity')
        .select('employee_id, status, last_active_time')
        .in('employee_id', allTelecallerIds)
        .eq('tenant_id', tenantId)
        //.order('last_active_time', { ascending: false }); // Order in JS to avoid grouping issues if any
        .gt('last_active_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Optimization: only last 24h

      const activityMap = new Map();
      // Since we ordered by time desc, first entry per user is latest
      // We need to sort in JS if we fetched multiple
      activityData?.sort((a, b) => new Date(b.last_active_time).getTime() - new Date(a.last_active_time).getTime());
      activityData?.forEach(a => {
        if (!activityMap.has(a.employee_id)) activityMap.set(a.employee_id, a);
      });

      // 3. Get Total Case Counts (Paginated to bypass limit)
      // We only need count per telecaller.
      let allAssignedCases: { telecaller_id: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Safety break
      let loopCount = 0;
      while (hasMore && loopCount < 50) { // Limit to 50 pages (50k cases) for safety
        const { data: batch } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select('telecaller_id')
          .eq('tenant_id', tenantId)
          .in('telecaller_id', allTelecallerIds)
          .neq('case_status', 'deleted')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (batch && batch.length > 0) {
          allAssignedCases = [...allAssignedCases, ...batch];
          if (batch.length < pageSize) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
        loopCount++;
      }

      const caseCounts = new Map<string, number>();
      allAssignedCases.forEach(c => {
        if (c.telecaller_id) {
          caseCounts.set(c.telecaller_id, (caseCounts.get(c.telecaller_id) || 0) + 1);
        }
      });

      // 4. Get Call Logs (Today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: callLogs } = await supabase
        .from('case_call_logs')
        .select('case_id, employee_id, call_status, created_at')
        .in('employee_id', allTelecallerIds)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      const logs = callLogs || [];

      // 5. Get Unique Cases for Details
      const activeCaseIds = [...new Set(logs.map(l => l.case_id))];
      let caseDetailsMap = new Map();

      if (activeCaseIds.length > 0) {
        const { data: activeCases } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .select('*')
          .in('id', activeCaseIds);

        if (activeCases) {
          caseDetailsMap = new Map(activeCases.map(c => [c.id, c]));
        }
      }

      return teamsWithEmployees.map(team => {
        const teamTelecallers = (team.telecallers as { id: string, name: string }[]) || [];

        const telecallerStats = teamTelecallers.map(t => {
          const totalVariables = caseCounts.get(t.id) || 0;
          const userLogs = logs.filter(l => l.employee_id === t.id);
          const uniqueWorkedCaseIds = [...new Set(userLogs.map(l => l.case_id))];

          // Build Case Details
          const casesDetails = uniqueWorkedCaseIds.map(caseId => {
            const caseData = caseDetailsMap.get(caseId);
            const log = userLogs.find(l => l.case_id === caseId); // First one is latest due to sort
            if (!caseData || !log) return null;

            // Helper to get value from case_data
            const getValueFromCaseData = (keys: string[]) => {
              const data = caseData.case_data || {};
              for (const key of keys) {
                if (data[key] !== undefined && data[key] !== null) {
                  return String(data[key]).replace(/,/g, '');
                }
              }
              return undefined;
            };

            const rawPos = caseData.outstanding_amount || getValueFromCaseData(['pos', 'pos_amount', 'outstanding_amount', 'total_outstanding', 'Total Outstanding', 'POS']);
            const rawEmi = caseData.emi_amount || getValueFromCaseData(['emi', 'emi_amount', 'EMI', 'EMI Amount']);

            return {
              id: caseId,
              loanId: caseData.loan_id || 'N/A',
              customerName: caseData.customer_name || 'N/A',
              mobileNo: caseData.mobile_no || 'N/A',
              callStatus: log.call_status || 'N/A',
              lastCallTime: new Date(log.created_at).toLocaleTimeString(),
              callCount: userLogs.filter(l => l.case_id === caseId).length,
              caseStatus: caseData.case_status,
              dpd: caseData.dpd,
              pos: rawPos ? parseFloat(String(rawPos).replace(/,/g, '')) : undefined,
              emi: rawEmi ? parseFloat(String(rawEmi).replace(/,/g, '')) : undefined,
              priority: caseData.priority
            };
          }).filter(Boolean);

          const activity = activityMap.get(t.id);
          const lastActive = activity?.last_active_time ? new Date(activity.last_active_time) : null;
          const minutesAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 60000) : 999;

          return {
            id: t.id,
            name: t.name,
            teamName: team.name,
            totalCases: totalVariables,
            liveCases: casesDetails.length,
            completedToday: userLogs.filter(l => l.call_status === 'PTP' || l.call_status === 'PAID').length,
            lastActivity: minutesAgo < 60 ? `${minutesAgo}m ago` : minutesAgo < 1440 ? `${Math.floor(minutesAgo / 60)}h ago` : 'Offline',
            status: activity?.status || 'Offline',
            casesDetails: casesDetails
          };
        });

        return {
          teamId: team.id,
          teamName: team.name,
          totalCases: telecallerStats.reduce((s, t) => s + t.totalCases, 0),
          liveCases: telecallerStats.reduce((s, t) => s + t.liveCases, 0),
          telecallers: telecallerStats
        };
      });

    } catch (error) {
      console.error('Error fetching live monitoring stats:', error);
      return [];
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
          latest_ptp_date: c.latest_ptp_date || (cData.latest_ptp_date as string) || logs[0]?.ptp_datetime
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

  async createBulkCases(cases: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>[], onProgress?: (progress: number) => void): Promise<CaseUploadResult> {
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

    // Process cases in batches
    for (let i = 0; i < cases.length; i++) {
      try {
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
          caseData.telecaller_id = telecallerMap.get(String(caseData.case_data.EMPID));
          caseData.assigned_employee_id = String(caseData.case_data.EMPID);
          caseData.case_status = 'assigned';
          autoAssigned++;
        } else {
          caseData.telecaller_id = undefined;
          caseData.assigned_employee_id = 'UNASSIGNED'; // Default value for unassigned cases
          caseData.case_status = 'pending';
          unassigned++;
        }

        // IMPORTANT: Remove status field if it exists (column was removed from database)
        if ('status' in caseData) {
          delete (caseData as { status?: string }).status;
        }

        // Try to insert first, if it fails due to duplicate, try to update
        let { error } = await supabase
          .from(CUSTOMER_CASE_TABLE)
          .insert([caseData]);

        // If insert failed due to duplicate key, try update
        if (error && error.code === '23505') {

          const { error: updateError } = await supabase
            .from(CUSTOMER_CASE_TABLE)
            .update({
              ...caseData,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', caseData.tenant_id)
            .eq('loan_id', caseData.loan_id);

          if (updateError) {
            console.error('Update error:', updateError);
            error = updateError;
          } else {

            error = null; // Update succeeded
          }
        }

        if (error) {
          console.error('Final error for row', rowNumber, ':', error);
          errors.push({
            row: rowNumber,
            error: error.message || 'Unknown database error',
            data: caseData
          });
        } else {
          totalUploaded++;
        }

        // Report progress
        if (onProgress) {
          const progress = Math.round(((i + 1) / cases.length) * 100);
          onProgress(progress);
        }
      } catch (error) {
        errors.push({
          row: i + 1,
          error: (error as Error).message,
          data: cases[i]
        });
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

      const { data: allCallLogs, error: logsError } = await supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('*')
        .in('case_id', caseIds)
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching call logs for export:', logsError);
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

      // If no employeeId and no teamId, return empty (prevents showing all PTPs)
      if (!employeeId && !teamId) {
        console.warn('⚠️ PTP request without employeeId or teamId - returning empty');
        return [];
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Get ALL logs for today
      const logsQuery = supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('case_id, ptp_datetime')
        .gte('ptp_datetime', startOfDay.toISOString())
        .lte('ptp_datetime', endOfDay.toISOString())
        .not('ptp_datetime', 'is', null)
        .order('ptp_datetime', { ascending: true }); // Get earliest PTPs first? or just chronological

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

      // If no employeeId and no teamId, return empty (prevents showing all callbacks)
      if (!employeeId && !teamId) {
        console.warn('⚠️ Callback request without employeeId or teamId - returning empty');
        return [];
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Get ALL callback logs for today
      const logsQuery = supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('case_id, callback_datetime')
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
  }
};
