import React, { useState } from 'react';
import { DollarSign, Calendar, User, TrendingUp } from 'lucide-react';
import type { PaymentReportData } from '../../../types/reports';
import { formatIndianCurrency } from '../../../utils/dateUtils';
import { ReportPieChart } from '../ReportPieChart';

interface PaymentDetailsReportViewProps {
  payments: PaymentReportData[];
  isLoading: boolean;
}

export const PaymentDetailsReportView: React.FC<PaymentDetailsReportViewProps> = ({
  payments,
  isLoading
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = payments.slice(startIndex, endIndex);

  const totalAmount = payments.reduce((sum, p) => sum + p.amount_collected, 0);
  const dailyTotal = payments
    .filter(p => new Date(p.payment_date).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + p.amount_collected, 0);

  const telecallerDistribution = payments.reduce((acc, p) => {
    acc[p.telecaller_name] = (acc[p.telecaller_name] || 0) + p.amount_collected;
    return acc;
  }, {} as Record<string, number>);

  const top5Telecallers = Object.entries(telecallerDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const callStatusDistribution = payments.reduce((acc, p) => {
    acc[p.call_status] = (acc[p.call_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-20" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <div className="text-gray-400 text-lg mb-2">No payment records found</div>
        <p className="text-gray-500 text-sm">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700 mb-1">Total Collections</div>
              <div className="text-2xl font-bold text-green-900">
                {formatIndianCurrency(totalAmount)}
              </div>
            </div>
            <DollarSign className="w-10 h-10 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-700 mb-1">Today's Collection</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatIndianCurrency(dailyTotal)}
              </div>
            </div>
            <Calendar className="w-10 h-10 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-700 mb-1">Total Transactions</div>
              <div className="text-2xl font-bold text-purple-900">{payments.length}</div>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportPieChart
          title="Top 5 Collectors"
          labels={top5Telecallers.map(([name]) => name)}
          data={top5Telecallers.map(([, amount]) => amount)}
          height={300}
        />

        <ReportPieChart
          title="Payment by Call Status"
          labels={Object.keys(callStatusDistribution)}
          data={Object.values(callStatusDistribution)}
          height={300}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telecaller
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPayments.map((payment, index) => (
                <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.payment_date).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.customer_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {payment.loan_id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatIndianCurrency(payment.amount_collected)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <div>
                        <div>{payment.telecaller_name}</div>
                        <div className="text-xs text-gray-500">{payment.telecaller_emp_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {payment.call_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      SUCCESS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({payments.length} records)
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
    </div>
  );
};
