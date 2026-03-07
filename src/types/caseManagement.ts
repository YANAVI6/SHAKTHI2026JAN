// Enhanced types for Case Management feature

export interface TeamInchargeCase {
  id: string;
  tenant_id: string;
  team_id: string;
  telecaller_id?: string;
  product_name: string;
  case_data: Record<string, unknown>;
  case_status?: string;
  latest_call_status?: string;
  latest_call_date?: string;
  latest_ptp_date?: string;
  latest_callback_date?: string;
  status?: 'new' | 'assigned' | 'in_progress' | 'closed';
  uploaded_by: string;
  assigned_by?: string;
  created_at: string;
  updated_at: string;
  telecaller?: {
    id: string;
    name: string;
    emp_id: string;
  };
  // Flattened fields from DB
  loan_id?: string;
  customer_name?: string;
  mobile_no?: string;
  alternate_number?: string;
  email?: string;
  loan_amount?: string;
  outstanding_amount?: string;
  pos_amount?: string;
  emi_amount?: string;
  dpd?: number;
  last_paid_amount?: string;
  last_paid_date?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  branch_name?: string;
  priority?: string;
  sanction_date?: string;
  payment_link?: string;
  remarks?: string;
  loan_type?: string;
  pending_dues?: string;
  total_collected_amount?: number;
  custom_fields?: Record<string, unknown>;
  latest_payment_date?: string;
  today_payment_amount?: number;
}

export interface CaseUploadResult {
  totalUploaded: number;
  autoAssigned: number;
  unassigned: number;
  errors: Array<{
    row: number;
    error: string;
    data: unknown;
  }>;
}

export interface CaseFilters {
  product?: string;
  telecaller?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TeamTelecaller {
  id: string;
  name: string;
  emp_id: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  assigned_cases: number;
}

export interface CaseAssignment {
  caseId: string;
  telecallerId: string | null;
  assignedBy: string;
}

export interface ExcelColumnMapping {
  [key: string]: {
    column_name: string;
    display_name: string;
    data_type: string;
    is_required: boolean;
  };
}

export interface CaseUploadProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentRow?: number;
  errors: string[];
}