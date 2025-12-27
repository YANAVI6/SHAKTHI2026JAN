export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export type ReportType =
  | 'case_details'
  | 'payment_details'
  | 'performance'
  | 'team_overview'
  | 'telecaller_performance';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ReportFilter {
  dateFrom?: string;
  dateTo?: string;
  period?: ReportPeriod;
  caseStatus?: string[];
  priority?: string[];
  telecallerId?: string[];
  teamId?: string[];
  dpdRange?: string;
  paymentStatus?: string[];
  callStatus?: string[];
  loanType?: string[];
  branchName?: string;
  collectionAmountMin?: number;
  collectionAmountMax?: number;
}

export interface CaseReportData {
  id: string;
  loan_id: string;
  customer_name: string;
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
  telecaller_name?: string;
  telecaller_emp_id?: string;
  team_name?: string;
  total_calls: number;
  last_call_status?: string;
  last_call_date?: string;
  last_call_notes?: string;
  total_collected_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentReportData {
  id: string;
  case_id: string;
  loan_id: string;
  customer_name: string;
  amount_collected: number;
  payment_date: string;
  payment_method?: string;
  transaction_id?: string;
  payment_status: string;
  telecaller_id: string;
  telecaller_name: string;
  telecaller_emp_id: string;
  team_name?: string;
  call_status: string;
  ptp_datetime?: string;
  call_notes?: string;
  settlement_status?: string;
  created_at: string;
}

export interface TeamPerformanceData {
  team_id: string;
  team_name: string;
  product_name: string;
  total_cases: number;
  cases_assigned: number;
  cases_in_progress: number;
  cases_resolved: number;
  cases_closed: number;
  total_calls: number;
  total_collection: number;
  target_amount?: number;
  achievement_percentage: number;
  active_telecallers: number;
  average_resolution_time: number;
  efficiency_rate: number;
  telecallers: TelecallerPerformanceData[];
}

export interface TelecallerPerformanceData {
  telecaller_id: string;
  telecaller_name: string;
  telecaller_emp_id: string;
  team_name?: string;
  total_cases_assigned: number;
  cases_pending: number;
  cases_in_progress: number;
  cases_resolved: number;
  cases_closed: number;
  total_calls_made: number;
  total_amount_collected: number;
  call_success_rate: number;
  ptp_fulfillment_rate: number;
  average_call_duration: number;
  daily_calls: number;
  weekly_calls: number;
  monthly_calls: number;
  daily_collection: number;
  weekly_collection: number;
  monthly_collection: number;
  target_calls?: number;
  target_collection?: number;
  call_target_achievement: number;
  collection_target_achievement: number;
  ranking?: number;
}

export interface PerformanceMetrics {
  total_cases: number;
  total_calls: number;
  total_collection: number;
  case_status_distribution: {
    pending: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  call_status_distribution: {
    [key: string]: number;
  };
  payment_status_distribution: {
    success: number;
    failed: number;
    pending: number;
  };
  dpd_bucket_distribution: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
  collection_efficiency: number;
  resolution_rate: number;
  average_call_duration: number;
  ptp_conversion_rate: number;
}

export interface ReportData {
  cases?: CaseReportData[];
  payments?: PaymentReportData[];
  teamPerformance?: TeamPerformanceData[];
  telecallerPerformance?: TelecallerPerformanceData;
  metrics?: PerformanceMetrics;
  filters: ReportFilter;
  generatedAt: string;
  generatedBy: string;
  totalRecords: number;
}

export interface ReportExportOptions {
  format: ExportFormat;
  filename: string;
  includeCharts: boolean;
  includeFilters: boolean;
  companyName?: string;
  reportTitle: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderWidth?: number;
  }[];
}
