import * as XLSX from 'xlsx';
import type { CaseReportData, PaymentReportData, ReportExportOptions } from '../types/reports';

export class ReportExportService {
  static exportToExcel(
    data: {
      cases?: CaseReportData[];
      payments?: PaymentReportData[];
    },
    options: ReportExportOptions
  ): void {
    const workbook = XLSX.utils.book_new();

    if (data.cases && data.cases.length > 0) {
      const casesSheet = this.createCasesSheet(data.cases);
      XLSX.utils.book_append_sheet(workbook, casesSheet, 'Case Details');
    }

    if (data.payments && data.payments.length > 0) {
      const paymentsSheet = this.createPaymentsSheet(data.payments);
      XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Payment Details');
    }

    XLSX.writeFile(workbook, `${options.filename}.xlsx`);
  }

  static exportToCSV(
    data: CaseReportData[] | PaymentReportData[],
    options: ReportExportOptions
  ): void {
    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${options.filename}.csv`;
    link.click();
  }

  static async exportToPDF(
    element: HTMLElement,
    options: ReportExportOptions
  ): Promise<void> {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${options.reportTitle}</title>
            <style>
              ${styles}
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${options.companyName ? `<h1>${options.companyName}</h1>` : ''}
            <h2>${options.reportTitle}</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <hr />
            ${element.innerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }

  private static createCasesSheet(cases: CaseReportData[]): XLSX.WorkSheet {
    const data = cases.map(c => ({
      'Loan ID': c.loan_id,
      'Customer Name': c.customer_name,
      'Mobile': c.mobile_no || '',
      'Email': c.email || '',
      'Loan Amount': c.loan_amount || '',
      'Loan Type': c.loan_type || '',
      'Outstanding': c.outstanding_amount || '',
      'POS Amount': c.pos_amount || '',
      'EMI': c.emi_amount || '',
      'Pending Dues': c.pending_dues || '',
      'DPD': c.dpd || 0,
      'Branch': c.branch_name || '',
      'City': c.city || '',
      'State': c.state || '',
      'Status': c.case_status,
      'Priority': c.priority,
      'Telecaller': c.telecaller_name || 'Unassigned',
      'Team': c.team_name || '',
      'Total Calls': c.total_calls,
      'Last Call Status': c.last_call_status || '',
      'Total Collected': c.total_collected_amount,
      'Created Date': new Date(c.created_at).toLocaleDateString()
    }));

    return XLSX.utils.json_to_sheet(data);
  }

  private static createPaymentsSheet(payments: PaymentReportData[]): XLSX.WorkSheet {
    const data = payments.map(p => ({
      'Date': new Date(p.payment_date).toLocaleString(),
      'Customer Name': p.customer_name,
      'Loan ID': p.loan_id,
      'Amount': p.amount_collected,
      'Call Status': p.call_status,
      'Telecaller': p.telecaller_name,
      'Employee ID': p.telecaller_emp_id,
      'Team': p.team_name || '',
      'PTP Date': p.ptp_datetime ? new Date(p.ptp_datetime).toLocaleDateString() : '',
      'Notes': p.call_notes || '',
      'Status': p.payment_status
    }));

    return XLSX.utils.json_to_sheet(data);
  }
}
