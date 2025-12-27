
import { supabase } from '../lib/supabase';
import type {
  ReportFilter,
  CaseReportData,
  PaymentReportData,
  TeamPerformanceData,
  TelecallerPerformanceData,
  PerformanceMetrics
} from '../types/reports';

// Interfaces for Supabase responses
interface RawCallLog {
  id: string;
  call_status: string;
  amount_collected: string | null;
  created_at: string;
  call_notes: string | null;
  call_duration?: number;
  ptp_datetime?: string;
}

interface RawTeam {
  id: string;
  team_name: string;
}

interface RawEmployee {
  id: string;
  name: string;
  emp_id: string;
  team_id?: string;
  status?: string;
  teams?: RawTeam | RawTeam[]; // Handle potential array return from joins
}

interface RawCustomerCase {
  id: string;
  loan_id: string;
  customer_name: string;
  tenant_id: string;
  mobile_no: string | null;
  alternate_number: string | null;
  email: string | null;
  loan_amount: string | null;
  loan_type: string | null;
  outstanding_amount: string | null;
  pos_amount: string | null;
  emi_amount: string | null;
  pending_dues: string | null;
  dpd: number | null;
  branch_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  sanction_date: string | null;
  last_paid_date: string | null;
  last_paid_amount: string | null;
  payment_link: string | null;
  remarks: string | null;
  case_status: string;
  priority: string;
  assigned_employee_id: string;
  created_at: string;
  updated_at: string;
  employees?: RawEmployee | RawEmployee[];
  case_call_logs?: RawCallLog[];
}

interface RawPaymentResponse {
  id: string;
  case_id: string;
  employee_id: string;
  call_status: string;
  amount_collected: string | null;
  ptp_datetime: string | null;
  call_notes: string | null;
  created_at: string;
  customer_cases: RawCustomerCase | RawCustomerCase[];
  employees: RawEmployee | RawEmployee[];
}

interface RawTeamResponse {
  id: string;
  team_name: string;
  product_name: string;
  employees: Array<RawEmployee & {
    customer_cases: Array<RawCustomerCase & {
      case_call_logs: RawCallLog[];
    }>;
  }>;
  telecaller_targets: Array<{
    daily_call_target: number;
    weekly_call_target: number;
    monthly_call_target: number;
    daily_collection_target: number;
    weekly_collection_target: number;
    monthly_collection_target: number;
  }>;
}

export class ReportService {
  static async generateCaseDetailsReport(
    tenantId: string,
    filters: ReportFilter,
    userRole: string,
    userId?: string
  ): Promise<CaseReportData[]> {
    let query = supabase
      .from('customer_cases')
      .select(`
  *,
  employees!customer_cases_assigned_employee_id_fkey(
    id,
    name,
    emp_id,
    team_id,
    teams(
      id,
      team_name
    )
  ),
    case_call_logs(
      id,
      call_status,
      amount_collected,
      created_at,
      call_notes
    )
      `)
      .eq('tenant_id', tenantId);

    if (userRole === 'telecaller' && userId) {
      query = query.eq('assigned_employee_id', userId);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.caseStatus && filters.caseStatus.length > 0) {
      query = query.in('case_status', filters.caseStatus);
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters.telecallerId && filters.telecallerId.length > 0) {
      query = query.in('assigned_employee_id', filters.telecallerId);
    }

    if (filters.loanType && filters.loanType.length > 0) {
      query = query.in('loan_type', filters.loanType);
    }

    if (filters.branchName) {
      query = query.eq('branch_name', filters.branchName);
    }

    if (filters.dpdRange) {
      const [min, max] = filters.dpdRange.split('-').map(v => v.replace('+', ''));
      if (max) {
        query = query.gte('dpd', parseInt(min)).lte('dpd', parseInt(max));
      } else {
        query = query.gte('dpd', parseInt(min));
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Cast data to our defined type
    const cases = (data || []) as unknown as RawCustomerCase[];

    return cases.map(caseItem => {
      const callLogs = caseItem.case_call_logs || [];
      const totalCollected = callLogs.reduce((sum: number, log: RawCallLog) => {
        return sum + (parseFloat(log.amount_collected || '0'));
      }, 0);

      const lastCall = callLogs.length > 0 ? callLogs[callLogs.length - 1] : null;

      // Handle potential array return for employees
      const employee = Array.isArray(caseItem.employees) ? caseItem.employees[0] : caseItem.employees;
      // Handle potential array return for teams within employee
      const team = employee?.teams ? (Array.isArray(employee.teams) ? employee.teams[0] : employee.teams) : undefined;

      return {
        id: caseItem.id,
        loan_id: caseItem.loan_id,
        customer_name: caseItem.customer_name,
        mobile_no: caseItem.mobile_no,
        alternate_number: caseItem.alternate_number,
        email: caseItem.email,
        loan_amount: caseItem.loan_amount,
        loan_type: caseItem.loan_type,
        outstanding_amount: caseItem.outstanding_amount,
        pos_amount: caseItem.pos_amount,
        emi_amount: caseItem.emi_amount,
        pending_dues: caseItem.pending_dues,
        dpd: caseItem.dpd,
        branch_name: caseItem.branch_name,
        address: caseItem.address,
        city: caseItem.city,
        state: caseItem.state,
        pincode: caseItem.pincode,
        sanction_date: caseItem.sanction_date,
        last_paid_date: caseItem.last_paid_date,
        last_paid_amount: caseItem.last_paid_amount,
        payment_link: caseItem.payment_link,
        remarks: caseItem.remarks,
        case_status: caseItem.case_status,
        priority: caseItem.priority,
        assigned_employee_id: caseItem.assigned_employee_id,
        telecaller_name: employee?.name,
        telecaller_emp_id: employee?.emp_id,
        team_name: team?.team_name,
        total_calls: callLogs.length,
        last_call_status: lastCall?.call_status,
        last_call_date: lastCall?.created_at,
        last_call_notes: lastCall?.call_notes || undefined,
        total_collected_amount: totalCollected,
        created_at: caseItem.created_at,
        updated_at: caseItem.updated_at
      };
    });
  }

  static async generatePaymentReport(
    tenantId: string,
    filters: ReportFilter,
    userRole: string,
    userId?: string
  ): Promise<PaymentReportData[]> {
    let query = supabase
      .from('case_call_logs')
      .select(`
id,
  case_id,
  employee_id,
  call_status,
  amount_collected,
  ptp_datetime,
  call_notes,
  created_at,
  customer_cases!inner(
    loan_id,
    customer_name,
    tenant_id
  ),
    employees!case_call_logs_employee_id_fkey(
      id,
      name,
      emp_id,
      teams(
        team_name
      )
    )
      `)
      .eq('customer_cases.tenant_id', tenantId)
      .not('amount_collected', 'is', null)
      .gt('amount_collected', '0');

    if (userRole === 'telecaller' && userId) {
      query = query.eq('employee_id', userId);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.telecallerId && filters.telecallerId.length > 0) {
      query = query.in('employee_id', filters.telecallerId);
    }

    if (filters.callStatus && filters.callStatus.length > 0) {
      query = query.in('call_status', filters.callStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Cast data to our defined type
    const payments = (data || []) as unknown as RawPaymentResponse[];

    return payments.map(payment => {
      // Handle potential array returns
      const customerCase = Array.isArray(payment.customer_cases) ? payment.customer_cases[0] : payment.customer_cases;
      const employee = Array.isArray(payment.employees) ? payment.employees[0] : payment.employees;
      const team = employee?.teams ? (Array.isArray(employee.teams) ? employee.teams[0] : employee.teams) : undefined;

      return {
        id: payment.id,
        case_id: payment.case_id,
        loan_id: customerCase?.loan_id || '',
        customer_name: customerCase?.customer_name || '',
        amount_collected: parseFloat(payment.amount_collected || '0'),
        payment_date: payment.created_at,
        payment_status: 'success',
        telecaller_id: payment.employee_id,
        telecaller_name: employee?.name || '',
        telecaller_emp_id: employee?.emp_id || '',
        team_name: team?.team_name,
        call_status: payment.call_status,
        ptp_datetime: payment.ptp_datetime || undefined,
        call_notes: payment.call_notes || undefined,

        created_at: payment.created_at
      };
    });
  }



  static async generateTeamPerformanceReport(
    tenantId: string
  ): Promise<TeamPerformanceData[]> {
    const { data, error: teamsError } = await supabase
      .from('teams')
      .select(`
id,
  team_name,
  product_name,
  employees(
    id,
    name,
    emp_id,
    status,
    customer_cases(
      id,
      case_status,
      case_call_logs(
        id,
        amount_collected
      )
    )
  ),
  telecaller_targets(
    daily_call_target,
    weekly_call_target,
    monthly_call_target,
    daily_collection_target,
    weekly_collection_target,
    monthly_collection_target
  )
    `)
      .eq('tenant_id', tenantId);

    if (teamsError) throw teamsError;

    // Cast data to our defined type
    const teams = (data || []) as unknown as RawTeamResponse[];

    return teams.map(team => {
      const telecallers = team.employees || [];
      const activeTelecallers = telecallers.filter(t => t.status === 'active');

      let totalCases = 0;
      let casesAssigned = 0;
      let casesInProgress = 0;
      let casesResolved = 0;
      let casesClosed = 0;
      let totalCalls = 0;
      let totalCollection = 0;

      telecallers.forEach(telecaller => {
        const cases = telecaller.customer_cases || [];
        totalCases += cases.length;
        casesAssigned += cases.filter(c => c.case_status === 'pending').length;
        casesInProgress += cases.filter(c => c.case_status === 'in_progress').length;
        casesResolved += cases.filter(c => c.case_status === 'resolved').length;
        casesClosed += cases.filter(c => c.case_status === 'closed').length;

        cases.forEach(caseItem => {
          const callLogs = caseItem.case_call_logs || [];
          totalCalls += callLogs.length;
          totalCollection += callLogs.reduce((sum: number, log: RawCallLog) => {
            return sum + parseFloat(log.amount_collected || '0');
          }, 0);
        });
      });

      const targets = team.telecaller_targets?.[0];
      const targetAmount = targets?.monthly_collection_target || 0;
      const achievementPercentage = targetAmount > 0 ? (totalCollection / targetAmount) * 100 : 0;

      return {
        team_id: team.id,
        team_name: team.team_name,
        product_name: team.product_name,
        total_cases: totalCases,
        cases_assigned: casesAssigned,
        cases_in_progress: casesInProgress,
        cases_resolved: casesResolved,
        cases_closed: casesClosed,
        total_calls: totalCalls,
        total_collection: totalCollection,
        target_amount: targetAmount,
        achievement_percentage: Math.round(achievementPercentage),
        active_telecallers: activeTelecallers.length,
        average_resolution_time: 0,
        efficiency_rate: totalCases > 0 ? ((casesResolved + casesClosed) / totalCases) * 100 : 0,
        telecallers: []
      };
    });
  }

  static async generateTelecallerPerformanceReport(
    tenantId: string,
    telecallerId: string
  ): Promise<TelecallerPerformanceData> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
id,
  name,
  emp_id,
  teams(
    team_name
  ),
  customer_cases(
    id,
    case_status,
    created_at,
    case_call_logs(
      id,
      call_status,
      amount_collected,
      call_duration,
      ptp_datetime,
      created_at
    )
  ),
  telecaller_targets(
    daily_call_target,
    weekly_call_target,
    monthly_call_target,
    daily_collection_target,
    weekly_collection_target,
    monthly_collection_target
  )
    `)
      .eq('id', telecallerId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;

    // Cast data to our defined type
    // We reuse RawEmployee but need to extend it for this specific query structure which is slightly different
    // or just define a specific interface for this query result
    interface TelecallerPerformanceResponse {
      id: string;
      name: string;
      emp_id: string;
      teams: RawTeam | RawTeam[];
      customer_cases: Array<RawCustomerCase & {
        case_call_logs: RawCallLog[];
      }>;
      telecaller_targets: Array<{
        daily_call_target: number;
        weekly_call_target: number;
        monthly_call_target: number;
        daily_collection_target: number;
        weekly_collection_target: number;
        monthly_collection_target: number;
      }>;
    }

    const telecaller = data as unknown as TelecallerPerformanceResponse;

    const cases = telecaller.customer_cases || [];
    const targets = telecaller.telecaller_targets?.[0];
    // Handle potential array return for teams
    const team = Array.isArray(telecaller.teams) ? telecaller.teams[0] : telecaller.teams;

    let totalCallsMade = 0;
    let totalAmountCollected = 0;
    let successfulCalls = 0;
    let totalCallDuration = 0;
    let ptpCount = 0;
    let ptpFulfilled = 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let dailyCalls = 0;
    let weeklyCalls = 0;
    let monthlyCalls = 0;
    let dailyCollection = 0;
    let weeklyCollection = 0;
    let monthlyCollection = 0;

    cases.forEach(caseItem => {
      const callLogs = caseItem.case_call_logs || [];

      callLogs.forEach(log => {
        totalCallsMade++;
        const callDate = new Date(log.created_at);

        if (callDate >= todayStart) {
          dailyCalls++;
        }
        if (callDate >= weekStart) {
          weeklyCalls++;
        }
        if (callDate >= monthStart) {
          monthlyCalls++;
        }

        if (log.call_status === 'PTP' || log.call_status === 'FUTURE_PTP') {
          successfulCalls++;
          ptpCount++;
        }

        if (log.amount_collected) {
          const amount = parseFloat(log.amount_collected);
          totalAmountCollected += amount;
          ptpFulfilled++;

          if (callDate >= todayStart) {
            dailyCollection += amount;
          }
          if (callDate >= weekStart) {
            weeklyCollection += amount;
          }
          if (callDate >= monthStart) {
            monthlyCollection += amount;
          }
        }

        totalCallDuration += log.call_duration || 0;
      });
    });

    const casesPending = cases.filter(c => c.case_status === 'pending').length;
    const casesInProgress = cases.filter(c => c.case_status === 'in_progress').length;
    const casesResolved = cases.filter(c => c.case_status === 'resolved').length;
    const casesClosed = cases.filter(c => c.case_status === 'closed').length;

    const callSuccessRate = totalCallsMade > 0 ? (successfulCalls / totalCallsMade) * 100 : 0;
    const ptpFulfillmentRate = ptpCount > 0 ? (ptpFulfilled / ptpCount) * 100 : 0;
    const averageCallDuration = totalCallsMade > 0 ? totalCallDuration / totalCallsMade : 0;

    const callTargetAchievement = targets?.monthly_call_target
      ? (monthlyCalls / targets.monthly_call_target) * 100
      : 0;
    const collectionTargetAchievement = targets?.monthly_collection_target
      ? (monthlyCollection / targets.monthly_collection_target) * 100
      : 0;

    return {
      telecaller_id: telecaller.id,
      telecaller_name: telecaller.name,
      telecaller_emp_id: telecaller.emp_id,
      team_name: team?.team_name,
      total_cases_assigned: cases.length,
      cases_pending: casesPending,
      cases_in_progress: casesInProgress,
      cases_resolved: casesResolved,
      cases_closed: casesClosed,
      total_calls_made: totalCallsMade,
      total_amount_collected: totalAmountCollected,
      call_success_rate: Math.round(callSuccessRate),
      ptp_fulfillment_rate: Math.round(ptpFulfillmentRate),
      average_call_duration: Math.round(averageCallDuration),
      daily_calls: dailyCalls,
      weekly_calls: weeklyCalls,
      monthly_calls: monthlyCalls,
      daily_collection: dailyCollection,
      weekly_collection: weeklyCollection,
      monthly_collection: monthlyCollection,
      target_calls: targets?.monthly_call_target,
      target_collection: targets?.monthly_collection_target,
      call_target_achievement: Math.round(callTargetAchievement),
      collection_target_achievement: Math.round(collectionTargetAchievement)
    };
  }

  static async generatePerformanceMetrics(
    tenantId: string,
    filters: ReportFilter,
    userRole: string,
    userId?: string
  ): Promise<PerformanceMetrics> {
    const cases = await this.generateCaseDetailsReport(tenantId, filters, userRole, userId);
    const payments = await this.generatePaymentReport(tenantId, filters, userRole, userId);

    const totalCases = cases.length;
    const totalCalls = cases.reduce((sum, c) => sum + c.total_calls, 0);
    const totalCollection = payments.reduce((sum, p) => sum + p.amount_collected, 0);

    const caseStatusDistribution = {
      pending: cases.filter(c => c.case_status === 'pending').length,
      in_progress: cases.filter(c => c.case_status === 'in_progress').length,
      resolved: cases.filter(c => c.case_status === 'resolved').length,
      closed: cases.filter(c => c.case_status === 'closed').length
    };

    const callStatusDistribution: { [key: string]: number } = {};
    cases.forEach(caseItem => {
      if (caseItem.last_call_status) {
        callStatusDistribution[caseItem.last_call_status] =
          (callStatusDistribution[caseItem.last_call_status] || 0) + 1;
      }
    });

    const paymentStatusDistribution = {
      success: payments.filter(p => p.payment_status === 'success').length,
      failed: 0,
      pending: 0
    };

    const dpdBucketDistribution = {
      '0-30': cases.filter(c => c.dpd !== null && c.dpd >= 0 && c.dpd <= 30).length,
      '31-60': cases.filter(c => c.dpd !== null && c.dpd >= 31 && c.dpd <= 60).length,
      '61-90': cases.filter(c => c.dpd !== null && c.dpd >= 61 && c.dpd <= 90).length,
      '90+': cases.filter(c => c.dpd !== null && c.dpd > 90).length
    };

    const resolvedAndClosed = caseStatusDistribution.resolved + caseStatusDistribution.closed;
    const resolutionRate = totalCases > 0 ? (resolvedAndClosed / totalCases) * 100 : 0;
    const collectionEfficiency = totalCases > 0 ? (payments.length / totalCases) * 100 : 0;

    return {
      total_cases: totalCases,
      total_calls: totalCalls,
      total_collection: totalCollection,
      case_status_distribution: caseStatusDistribution,
      call_status_distribution: callStatusDistribution,
      payment_status_distribution: paymentStatusDistribution,
      dpd_bucket_distribution: dpdBucketDistribution,
      collection_efficiency: Math.round(collectionEfficiency),
      resolution_rate: Math.round(resolutionRate),
      average_call_duration: 0,
      ptp_conversion_rate: 0
    };
  }
}
