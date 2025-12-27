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
  assigned_employee_id?: string;
  team_id?: string;
  telecaller_id?: string;
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

  async getCasesByTelecaller(tenantId: string, empId: string): Promise<CustomerCase[]> {
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

      // First try to get cases by telecaller_id (UUID)
      const { data: casesByTelecallerId, error: telecallerError } = await supabase
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
        .eq('telecaller_id', employee.id)
        .order('created_at', { ascending: false });

      if (telecallerError) {
        console.error('❌ Error fetching cases by telecaller_id:', telecallerError);
      }

      // If no cases found by telecaller_id, also try by assigned_employee_id as fallback
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
    const { data, error } = await supabase
      .from(CUSTOMER_CASE_TABLE)
      .select(`
          *,
          team:teams(name),
          telecaller:employees!telecaller_id(name),
          case_call_logs(call_status, ptp_datetime, created_at)
        `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all cases:', error);
      throw new Error('Failed to fetch all cases');
    }

    if (!data) return [];

    // Process cases to extract latest_call_status from logs
    return data.map((caseItem: CustomerCaseWithLogs) => {
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
      const pageSize = 1000;
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((log: any) => log.ptp_datetime)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allCases: any[] = [];
      let page = 0;
      const pageSize = 1000;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allCases: any[] = [];
    let page = 0;
    const pageSize = 1000;
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

  async createBulkCases(cases: Omit<CustomerCase, 'id' | 'created_at' | 'updated_at'>[]): Promise<CaseUploadResult> {
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
          autoAssigned++;
        } else {
          caseData.telecaller_id = undefined;
          caseData.assigned_employee_id = 'UNASSIGNED'; // Default value for unassigned cases
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
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
      // Also update case_status to 'assigned' if it's currently 'new' or 'pending'
      // But for now, let's just stick to fixing the assignment error
    } else {
      // Unassigning - clear assigned_employee_id and telecaller_id
      updateData.assigned_employee_id = 'UNASSIGNED';
      updateData.telecaller_id = null;
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
    // Using case_status instead of status (status column removed)
    return {
      total: cases.length,
      new: cases.filter(c => c.case_status === 'pending').length,
      assigned: cases.filter(c => c.telecaller_id != null).length,
      inProgress: cases.filter(c => c.case_status === 'in_progress').length,
      closed: cases.filter(c => c.case_status === 'closed').length
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



    const updateData: Partial<CustomerCase> = {
      total_collected_amount: newTotalCollected,
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
  async getDashboardMetrics(tenantId: string, empId: string): Promise<{
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

      const { data: cases, error: casesError } = await supabase
        .from(CUSTOMER_CASE_TABLE)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employee.id);

      if (casesError) {
        console.error('Error fetching cases for metrics:', casesError);
        return {
          collections: { collected: 0, target: 100000, progress: 0 },
          followUps: { todaysFollowUps: 0, upcomingFollowUps: 0, todaysPTP: 0 },
          caseStatus: { total: 0, new: 0, assigned: 0, inProgress: 0, closed: 0 }
        };
      }

      const totalCollected = cases?.reduce((sum: number, c: CustomerCase) => {
        return sum + (c.total_collected_amount || 0);
      }, 0) || 0;

      const monthlyTarget = 100000;
      const progress = monthlyTarget > 0 ? Math.round((totalCollected / monthlyTarget) * 100) : 0;

      const caseIds = cases?.map(c => c.id) || [];
      let todaysPTP = 0;
      let todaysFollowUps = 0;
      let upcomingFollowUps = 0;

      if (caseIds.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const { data: allLogs, error: logsError } = await supabase
          .from(CASE_CALL_LOG_TABLE)
          .select('*')
          .in('case_id', caseIds);

        if (!logsError && allLogs) {
          const todayStart = new Date(todayStr).getTime();
          const todayEnd = todayStart + 86400000;

          todaysPTP = allLogs.filter((log: CallLog) => {
            const logDate = log.created_at ? new Date(log.created_at).getTime() : 0;
            return logDate >= todayStart && logDate < todayEnd &&
              (log.call_status === 'PTP' || log.call_status === 'FUTURE_PTP');
          }).length;

          const ptpMap = new Map();
          allLogs.forEach(log => {
            if (log.ptp_datetime) {
              const existingLog = ptpMap.get(log.case_id);
              if (!existingLog || new Date(log.created_at) > new Date(existingLog.created_at)) {
                ptpMap.set(log.case_id, log);
              }
            }
          });

          ptpMap.forEach(log => {
            if (log.ptp_datetime) {
              const ptpDate = new Date(log.ptp_datetime);
              ptpDate.setHours(0, 0, 0, 0);
              const ptpTime = ptpDate.getTime();

              if (ptpTime === todayStart) {
                todaysFollowUps++;
              } else if (ptpTime > todayStart) {
                upcomingFollowUps++;
              }
            }
          });
        }
      }

      // Using case_status instead of status (status column removed)
      const statusCounts = {
        total: cases?.length || 0,
        new: cases?.filter(c => c.case_status === 'pending').length || 0,
        assigned: cases?.filter(c => c.telecaller_id != null).length || 0,
        inProgress: cases?.filter(c => c.case_status === 'in_progress').length || 0,
        closed: cases?.filter(c => c.case_status === 'closed').length || 0
      };

      return {
        collections: {
          collected: totalCollected,
          target: monthlyTarget,
          progress: progress > 100 ? 100 : progress
        },
        followUps: {
          todaysFollowUps,
          upcomingFollowUps,
          todaysPTP
        },
        caseStatus: statusCounts
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

  async getCasesWithPendingFollowups(tenantId: string, empId: string): Promise<string[]> {
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
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('telecaller_id', employee.id);

      if (casesError || !cases || cases.length === 0) {
        return [];
      }

      const caseIds = cases.map(c => c.id);

      const { data: allLogs, error: logsError } = await supabase
        .from(CASE_CALL_LOG_TABLE)
        .select('case_id, ptp_datetime, created_at')
        .in('case_id', caseIds);

      if (logsError || !allLogs) {
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      const ptpMap = new Map();
      allLogs.forEach(log => {
        if (log.ptp_datetime) {
          const existingLog = ptpMap.get(log.case_id);
          if (!existingLog || new Date(log.created_at) > new Date(existingLog.created_at)) {
            ptpMap.set(log.case_id, log);
          }
        }
      });

      const casesWithPendingPTP: string[] = [];
      ptpMap.forEach((log, caseId) => {
        if (log.ptp_datetime) {
          const ptpDate = new Date(log.ptp_datetime);
          ptpDate.setHours(0, 0, 0, 0);
          const ptpTime = ptpDate.getTime();

          if (ptpTime >= todayTime) {
            casesWithPendingPTP.push(caseId);
          }
        }
      });

      return casesWithPendingPTP;
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

  async getTodayPTPCases(tenantId: string, employeeId?: string): Promise<TeamInchargeCase[]> {
    try {
      console.log('🔍 getTodayPTPCases called', { tenantId, employeeId });

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

      // Map caseId to its PTP datetime. If multiple, we generally want the latest one or all?
      // For alerts, if there are multiple PTPs, meaningful one is likely the last one set 
      // or we handle the one that is "next" due? 
      // Let's take the latest PTP time for today for simplicity.
      const ptpMap = new Map<string, string>();
      logs.forEach(log => {
        // Since we filtered logs for today, this timestamp is today
        if (log.ptp_datetime) {
          ptpMap.set(log.case_id, log.ptp_datetime);
        }
      });

      const caseIds = Array.from(ptpMap.keys());

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

        // 2. Filter cases by telecaller_id if employeeId is provided
        if (employeeId) {
          casesQuery = casesQuery.eq('telecaller_id', employeeId);
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
          });

          allCases.push(...enrichedCases);
        }
      }

      return allCases as TeamInchargeCase[];

    } catch (error) {
      console.error('Unexpected error in getTodayPTPCases:', error);
      return [];
    }
  },

  async getTodayCallbackCases(tenantId: string, employeeId?: string): Promise<TeamInchargeCase[]> {
    try {
      console.log('🔍 getTodayCallbackCases called', { tenantId, employeeId });

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

        // Filter cases by telecaller_id if employeeId is provided
        if (employeeId) {
          casesQuery = casesQuery.eq('telecaller_id', employeeId);
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
          });

          allCases.push(...enrichedCases);
        }
      }

      return allCases as TeamInchargeCase[];

    } catch (error) {
      console.error('Unexpected error in getTodayCallbackCases:', error);
      return [];
    }
  }
};
