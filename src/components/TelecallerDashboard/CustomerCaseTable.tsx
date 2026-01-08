import React from 'react';
import { Eye, Phone, Copy, Filter, ArrowUpDown, Download, AlertTriangle } from 'lucide-react';
import { CustomerCase, ColumnConfig } from './types';
import { getDPDColor, copyToClipboard, getTotalPages, debounce } from './utils';
import { customerCaseService } from '../../services/customerCaseService';

export interface CustomerCaseFilters {
  searchTerm: string;
  dpd: string;
  callResponse: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface CustomerCaseTableProps {
  customerCases: CustomerCase[];
  columnConfigs: ColumnConfig[];
  isLoading: boolean;
  tenantId: string;
  empId: string;

  // Pagination & Data Props
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // Filter Props
  filters: CustomerCaseFilters;
  onFilterChange: (filters: CustomerCaseFilters) => void;

  // Pending Followups specific props
  showPendingFollowupsOnly?: boolean;
  onClearFollowupFilter?: () => void;

  viewedCases?: Set<string>;
  onViewDetails: (caseData: CustomerCase) => void;
  onCallCustomer: (caseData: CustomerCase) => void;
  onUpdateStatus?: (caseData: CustomerCase) => void;
}

const CustomerCaseTable: React.FC<CustomerCaseTableProps> = ({
  customerCases,
  columnConfigs,
  isLoading,
  tenantId,
  empId,
  totalCount,
  currentPage,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  filters,
  onFilterChange,
  showPendingFollowupsOnly = false,
  viewedCases = new Set(),
  onClearFollowupFilter,
  onViewDetails,
  onCallCustomer
}) => {
  // We keep debounced search locally but it triggers onFilterChange
  // No, if it's controlled, the value in input must vary.
  // We can keep local state for input value to avoid lag, and debounce the callback.
  const [localSearchTerm, setLocalSearchTerm] = React.useState(filters.searchTerm);

  React.useEffect(() => {
    setLocalSearchTerm(filters.searchTerm);
  }, [filters.searchTerm]);

  const debouncedSearch = React.useMemo(
    () => debounce<(term: string) => void>((term: string) => {
      onFilterChange({ ...filters, searchTerm: term });
      onPageChange(1); // Reset to page 1 on search
    }, 500),
    [filters, onFilterChange, onPageChange]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearchTerm(val);
    debouncedSearch(val);
  };

  const handleFilterChange = (key: keyof CustomerCaseFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
    onPageChange(1);
  };

  const totalPages = getTotalPages(totalCount, itemsPerPage);

  const getActiveColumns = (): ColumnConfig[] => {
    const columns = columnConfigs.length > 0
      ? columnConfigs.map(config => ({
        id: config.id,
        columnName: config.columnName,
        displayName: config.displayName,
        isActive: config.isActive
      }))
      : [];

    columns.push({ id: 999, columnName: 'actions', displayName: 'Actions', isActive: true });
    return columns;
  };

  const renderColumnValue = (case_: CustomerCase, column: ColumnConfig) => {
    const isViewed = viewedCases.has(case_.id || '');

    switch (column.columnName) {
      case 'dpd':
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDPDColor(case_.dpd || 0)}`}>
            {case_.dpd || 0} days
          </span>
        );
      case 'paymentLink':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(case_.paymentLink || '');
            }}
            disabled={!case_.paymentLink}
            className="inline-flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy Link
          </button>
        );
      case 'latestCallStatus': {
        const status = case_.latest_call_status || '-';
        let statusColor = 'bg-gray-100 text-gray-800'; // default

        switch (status.toUpperCase()) {
          case 'CONNECTED':
          case 'PTP':
          case 'FUTURE_PTP':
            statusColor = 'bg-green-100 text-green-800';
            break;
          case 'RNR':
          case 'NC':
          case 'NOT RECHABLE':
          case 'NOT REACHABLE':
          case 'SW':
          case 'SWITCH OFF':
          case 'SWITCHED OFF':
            statusColor = 'bg-red-100 text-red-800';
            break;
          case 'BUSY':
          case 'CALL_BACK':
          case 'CALLBACK':
          case 'CALL BACK':
            statusColor = 'bg-yellow-100 text-yellow-800';
            break;
          case 'BPTP':
          case 'RTP':
          case 'REFUSED':
            statusColor = 'bg-red-200 text-red-900';
            break;
          case 'WN':
          case 'WRONG NUMBER':
          case 'CD':
          case 'DISCONNECTED':
          case 'CALL DISCONNECTED':
            statusColor = 'bg-gray-200 text-gray-600';
            break;
          case 'INC':
          case 'INCOMING':
            statusColor = 'bg-blue-100 text-blue-800';
            break;
        }

        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
            {status}
          </span>
        );
      }
      case 'actions':
        return (
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(case_);
              }}
              className="text-purple-600 hover:text-purple-900 inline-flex items-center text-xs"
              title="View Details"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCallCustomer(case_);
              }}
              className="text-green-600 hover:text-green-900 inline-flex items-center text-xs"
              title="Call Customer"
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </button>
          </div>
        );
      default: {
        const caseRecord = case_ as unknown as Record<string, unknown>;
        const value = caseRecord[column.columnName];
        return (
          <span className={
            column.columnName.includes('Amount') || column.columnName.includes('Dues')
              ? column.columnName === 'outstandingAmount' || column.columnName === 'pendingDues'
                ? 'font-medium text-red-600'
                : `font-medium ${isViewed ? 'text-gray-600' : 'text-gray-900'}`
              : `${isViewed ? 'text-gray-600' : 'text-gray-900 font-medium'}`
          }>
            {String(value || '-')}
          </span>
        );
      }
    }
  };

  const exportToCSV = async () => {
    try {
      const exportData = await customerCaseService.getCompleteCaseDataForExport(tenantId, empId);

      if (exportData.length === 0) {
        alert('No data available to export');
        return;
      }

      const headers = [
        'Loan ID',
        'Customer Name',
        'Mobile No',
        'Alternate Number',
        'Email',
        'Address',
        'City',
        'State',
        'Pincode',
        'Product Name',
        'Loan Amount',
        'Outstanding Amount',
        'POS Amount',
        'EMI Amount',
        'Pending Dues',
        'DPD',
        'Last Paid Amount',
        'Last Paid Date',
        'Sanction Date',
        'Branch Name',
        'Loan Type',
        'Payment Link',
        'Case Status',
        'Status',
        'Priority',
        'Total Collected Amount',
        'Payment Count',
        'Last Payment Amount',
        'Last Payment Date',
        'Latest Call Status',
        'Latest Call Date',
        'Latest Call Notes',
        'Latest PTP Date',
        'Remarks',
        'Created At',
        'Updated At'
      ];

      const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN');
      };

      const formatCurrency = (value: unknown) => {
        if (!value || value === '0' || value === 0) return '0';
        return String(value);
      };

      const escapeCSV = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = exportData.map(caseItem => [
        escapeCSV(caseItem.loan_id),
        escapeCSV(caseItem.customer_name),
        escapeCSV(caseItem.mobile_no),
        escapeCSV(caseItem.alternate_number),
        escapeCSV(caseItem.email),
        escapeCSV(caseItem.address),
        escapeCSV(caseItem.city),
        escapeCSV(caseItem.state),
        escapeCSV(caseItem.pincode),
        escapeCSV(caseItem.product_name),
        formatCurrency(caseItem.loan_amount),
        formatCurrency(caseItem.outstanding_amount),
        formatCurrency(caseItem.pos_amount),
        formatCurrency(caseItem.emi_amount),
        formatCurrency(caseItem.pending_dues),
        escapeCSV(caseItem.dpd || 0),
        formatCurrency(caseItem.last_paid_amount),
        formatDate(caseItem.last_paid_date),
        formatDate(caseItem.sanction_date),
        escapeCSV(caseItem.branch_name),
        escapeCSV(caseItem.loan_type),
        escapeCSV(caseItem.payment_link),
        escapeCSV(caseItem.case_status),
        escapeCSV(caseItem.status),
        escapeCSV(caseItem.priority),
        formatCurrency(caseItem.total_collected_amount || 0),
        escapeCSV(caseItem.payment_count || 0),
        formatCurrency(caseItem.last_payment_amount || 0),
        formatDate(caseItem.last_payment_date),
        escapeCSV(caseItem.latest_call_status),
        formatDate(caseItem.latest_call_date),
        escapeCSV(caseItem.latest_call_notes),
        formatDate(caseItem.latest_ptp_date),
        escapeCSV(caseItem.remarks),
        formatDate(caseItem.created_at),
        formatDate(caseItem.updated_at)
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `customer-cases-export-${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Cases</h3>
            <p className="text-sm text-gray-600 mt-1">Manage and track your assigned loan recovery cases</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToCSV}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Complete Data
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mt-4 space-y-4">
          {showPendingFollowupsOnly && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Showing only cases with pending follow-ups ({customerCases.length} cases)
                </span>
              </div>
              <button
                onClick={() => {
                  if (onClearFollowupFilter) {
                    onClearFollowupFilter();
                  }
                }}
                className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
              >
                Clear Filter
              </button>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search by name, loan ID, or mobile..."
                value={localSearchTerm}
                onChange={handleSearchChange}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
              />
              <span className="text-sm text-gray-600">
                Showing {totalCount === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} cases
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">DPD Filter:</span>
              <select
                value={filters.dpd}
                onChange={(e) => handleFilterChange('dpd', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Cases</option>
                <option value="0-30">0-30 Days</option>
                <option value="31-60">31-60 Days</option>
                <option value="61-90">61-90 Days</option>
                <option value="91-100">91-100 Days</option>
                <option value="101-200">101-200 Days</option>
                <option value="201-300">201-300 Days</option>
                <option value="301-500">301-500 Days</option>
                <option value="501-1000">501-1000 Days</option>
                <option value="1001-1500">1001-1500 Days</option>
                <option value="1501-2000">1501-2000 Days</option>
                <option value="2001-2500">2001-2500 Days</option>
                <option value="2500+">2500+ Days</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Response:</span>
              <select
                value={filters.callResponse}
                onChange={(e) => handleFilterChange('callResponse', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Responses</option>
                <option value="CONNECTED">Connected</option>
                <option value="PTP">PTP</option>
                <option value="FUTURE_PTP">Future PTP</option>
                <option value="WN">Wrong Number</option>
                <option value="SW">Switched Off</option>
                <option value="RNR">RNR / Ringing</option>
                <option value="BUSY">Busy</option>
                <option value="CALL_BACK">Callback</option>
                <option value="BPTP">BPTP</option>
                <option value="RTP">RTP (Refused)</option>
                <option value="NC">No Contact</option>
                <option value="CD">Call Disconnected</option>
                <option value="INC">Incoming</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Sort By:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="dpd">DPD</option>
                <option value="customerName">Customer Name</option>
                <option value="outstandingAmount">Outstanding Amount</option>
                <option value="emiAmount">EMI Amount</option>
                <option value="lastPaidDate">Last Paid Date</option>
              </select>
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {getActiveColumns().filter(col => col.isActive).map((column) => (
                  <th key={column.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={getActiveColumns().length} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-2"></div>
                      Loading cases...
                    </div>
                  </td>
                </tr>
              ) : customerCases.length === 0 ? (
                <tr>
                  <td colSpan={getActiveColumns().length} className="px-4 py-8 text-center text-gray-500">
                    {filters.searchTerm ? 'No cases match your search criteria' : 'No cases available'}
                  </td>
                </tr>
              ) : (
                customerCases.map((case_, index) => {
                  return (
                    <tr
                      key={case_.id || index}
                      className={`hover:bg-gray-50 transition-colors ${viewedCases.has(case_.id || '') ? 'bg-gray-50/50' : 'bg-white'}`}
                    >
                      {getActiveColumns().filter(col => col.isActive).map((column) => (
                        <td key={column.id} className="px-4 py-4 whitespace-nowrap text-sm">
                          {renderColumnValue(case_, column)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 rounded-md text-sm font-medium"
              >
                Previous
              </button>
              {(() => {
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                if (endPage - startPage < maxPagesToShow - 1) {
                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }

                return pages.map(page => (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${currentPage === page
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                      }`}
                  >
                    {page}
                  </button>
                ));
              })()}
              <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-700 rounded-md text-sm font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCaseTable;