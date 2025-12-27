import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Phone } from 'lucide-react';
import type { CaseReportData } from '../../../types/reports';
import { formatIndianCurrency } from '../../../utils/dateUtils';

interface CaseDetailsReportViewProps {
  cases: CaseReportData[];
  isLoading: boolean;
}

export const CaseDetailsReportView: React.FC<CaseDetailsReportViewProps> = ({
  cases,
  isLoading
}) => {
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const totalPages = Math.ceil(cases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCases = cases.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getDpdColor = (dpd: number | null) => {
    if (!dpd) return 'text-gray-600';
    if (dpd <= 30) return 'text-green-600';
    if (dpd <= 60) return 'text-yellow-600';
    if (dpd <= 90) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-24" />
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No cases found</div>
        <p className="text-gray-500 text-sm">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900">
          <span className="font-semibold">Total Cases:</span> {cases.length}
          <span className="mx-4">|</span>
          <span className="font-semibold">Showing:</span> {startIndex + 1} - {Math.min(endIndex, cases.length)}
        </div>
      </div>

      <div className="space-y-3">
        {currentCases.map(caseData => (
          <div key={caseData.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{caseData.customer_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(caseData.case_status)}`}>
                      {caseData.case_status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(caseData.priority)}`}>
                      {caseData.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Loan ID: <span className="font-medium text-gray-900">{caseData.loan_id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedCase(expandedCase === caseData.id ? null : caseData.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedCase === caseData.id ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Loan Amount</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {caseData.loan_amount ? formatIndianCurrency(parseFloat(caseData.loan_amount)) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Outstanding</div>
                  <div className="text-sm font-semibold text-orange-600">
                    {caseData.outstanding_amount ? formatIndianCurrency(parseFloat(caseData.outstanding_amount)) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">DPD</div>
                  <div className={`text-sm font-semibold ${getDpdColor(caseData.dpd)}`}>
                    {caseData.dpd !== null ? `${caseData.dpd} days` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Collected</div>
                  <div className="text-sm font-semibold text-green-600">
                    {formatIndianCurrency(caseData.total_collected_amount)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{caseData.mobile_no || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Calls:</span>
                  <span className="font-medium text-gray-900">{caseData.total_calls}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Telecaller:</span>
                  <span className="font-medium text-gray-900">{caseData.telecaller_name || 'Unassigned'}</span>
                </div>
              </div>

              {expandedCase === caseData.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900 mb-2">Customer Details</h5>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-500">Mobile:</span>
                          <span className="ml-2 text-gray-900">{caseData.mobile_no || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Alternate:</span>
                          <span className="ml-2 text-gray-900">{caseData.alternate_number || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 text-gray-900">{caseData.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Address:</span>
                          <span className="ml-2 text-gray-900">{caseData.address || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">City/State:</span>
                          <span className="ml-2 text-gray-900">{caseData.city || 'N/A'}, {caseData.state || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="font-semibold text-gray-900 mb-2">Loan Details</h5>
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-500">Loan Type:</span>
                          <span className="ml-2 text-gray-900">{caseData.loan_type || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Branch:</span>
                          <span className="ml-2 text-gray-900">{caseData.branch_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">POS Amount:</span>
                          <span className="ml-2 text-gray-900">
                            {caseData.pos_amount ? formatIndianCurrency(parseFloat(caseData.pos_amount)) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">EMI Amount:</span>
                          <span className="ml-2 text-gray-900">
                            {caseData.emi_amount ? formatIndianCurrency(parseFloat(caseData.emi_amount)) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Pending Dues:</span>
                          <span className="ml-2 text-orange-600 font-medium">
                            {caseData.pending_dues ? formatIndianCurrency(parseFloat(caseData.pending_dues)) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Sanction Date:</span>
                          <span className="ml-2 text-gray-900">
                            {caseData.sanction_date ? new Date(caseData.sanction_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 md:col-span-2">
                      <h5 className="font-semibold text-gray-900 mb-2">Call History</h5>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                        <div>
                          <span className="text-gray-500">Last Call Status:</span>
                          <span className="ml-2 text-gray-900 font-medium">{caseData.last_call_status || 'No calls yet'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Last Call Date:</span>
                          <span className="ml-2 text-gray-900">
                            {caseData.last_call_date ? new Date(caseData.last_call_date).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        {caseData.last_call_notes && (
                          <div>
                            <span className="text-gray-500">Notes:</span>
                            <p className="ml-2 text-gray-900 mt-1">{caseData.last_call_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
