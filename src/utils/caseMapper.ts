import { CustomerCase as ServiceCustomerCase } from '../services/customerCaseService';
import { CustomerCase as DashboardCustomerCase } from '../components/TelecallerDashboard/types';

interface ServiceCaseWithRelations extends ServiceCustomerCase {
    team?: { name: string };
    telecaller?: { name: string };
}

/**
 * Maps a snake_case CustomerCase from the service layer to the camelCase CustomerCase expected by the dashboard UI.
 */
export const mapServiceCaseToDashboardCase = (serviceCase: ServiceCustomerCase): DashboardCustomerCase => {
    const sCase = serviceCase as ServiceCaseWithRelations;
    const details = sCase.case_data || {};

    // Helper to safely get values from case_data with multiple key possibilities (Excel upload fallbacks)
    const getValueFromDetails = (keys: string[]) => {
        for (const key of keys) {
            if (details[key] !== undefined && details[key] !== null && details[key] !== '') {
                return String(details[key]);
            }
        }
        return '';
    };

    return {
        id: sCase.id || '',
        tenant_id: sCase.tenant_id || '',
        customerName: sCase.customer_name || getValueFromDetails(['customerName', 'Customer Name']) || '',
        loanId: sCase.loan_id || getValueFromDetails(['loanId', 'loanNumber', 'Loan ID']) || '',
        mobileNo: sCase.mobile_no || getValueFromDetails(['mobileNo', 'mobileNumber', 'Mobile Number']) || '',
        dpd: sCase.dpd || Number(getValueFromDetails(['dpd', 'DPD'])) || 0,
        outstandingAmount: sCase.outstanding_amount || getValueFromDetails(['totalOutstanding', 'outstandingAmount', 'TOTAL OUTSTANDING', 'Total Outstanding', 'pos', 'posAmount']) || '',
        emiAmount: sCase.emi_amount || getValueFromDetails(['emi', 'emiAmount', 'EMI']) || '',
        lastPaidDate: sCase.last_paid_date || getValueFromDetails(['lastPaymentDate', 'lastPaidDate', 'LAST PAYMENT DATE']) || '',
        loanAmount: sCase.loan_amount || getValueFromDetails(['loanAmount', 'Loan Amount']) || '',
        posAmount: sCase.pos_amount || getValueFromDetails(['pos', 'posAmount', 'POS']) || '',
        pendingDues: sCase.pending_dues || '',
        paymentLink: sCase.payment_link || getValueFromDetails(['paymentLink', 'Payment Link']) || '',
        alternateNumber: sCase.alternate_number || getValueFromDetails(['alternateNumber', 'Alternate Number']) || '',
        sanctionDate: sCase.sanction_date || getValueFromDetails(['loanCreatedAt', 'sanctionDate', 'LOAN CREATED AT']) || '',
        lastPaidAmount: sCase.last_paid_amount || getValueFromDetails(['lastPaymentAmount', 'lastPaidAmount', 'LAST PAYMENT AMOUNT']) || '',
        branchName: sCase.branch_name || '',
        loanType: sCase.loan_type || getValueFromDetails(['loanType', 'Loan Type']) || '',
        caseStatus: sCase.case_status || '',
        priority: sCase.priority || 'medium',
        telecaller_id: sCase.telecaller_id,
        telecallerId: sCase.telecaller_id, // For compatibility
        team_id: sCase.team_id,
        teamName: sCase.team?.name || '',
        telecallerName: sCase.telecaller?.name || '',
        address: sCase.address || getValueFromDetails(['address', 'Address']) || '',
        email: sCase.email || getValueFromDetails(['email', 'Email']) || '',
        latest_call_status: sCase.latest_call_status,
        latest_ptp_date: sCase.latest_ptp_date,
        buckets: sCase.buckets || getValueFromDetails(['buckets', 'Buckets', 'Bucket']) || '',
        remarks: sCase.remarks || '',
        total_collected_amount: sCase.total_collected_amount || 0,
        // Include all extra fields from case_data for complete details coverage
        ...details,
        // Include all custom fields if they exist from DB
        ...(sCase.custom_fields || {})
    };
};
