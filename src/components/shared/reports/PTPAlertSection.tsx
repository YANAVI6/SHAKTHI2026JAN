import React, { useState, useEffect } from 'react';
import { AlertCircle, Phone, IndianRupee } from 'lucide-react';
import { customerCaseService } from '../../../services/customerCaseService';
import type { TeamInchargeCase } from '../../../types/caseManagement';

interface PTPAlertSectionProps {
    user: {
        id: string;
        role: string;
        tenantId?: string;
    };
    onCaseClick?: (caseItem: TeamInchargeCase) => void;
    teamId?: string;
}

export const PTPAlertSection: React.FC<PTPAlertSectionProps> = ({ user, onCaseClick, teamId }) => {
    const [cases, setCases] = useState<TeamInchargeCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPTPCases = async () => {
            if (!user.tenantId) return;
            setIsLoading(true);
            try {
                const employeeId = user.role === 'Telecaller' ? user.id : undefined;
                const data = await customerCaseService.getTodayPTPCases(user.tenantId, employeeId, teamId);
                setCases(data);
            } catch (error) {
                console.error('Error loading PTP cases:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPTPCases();
    }, [user.tenantId, user.role, user.id, teamId]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading PTP Alerts...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Today's PTP Alerts</h1>
                        <p className="text-gray-500 text-sm">Cases scheduled for payment collection today</p>
                    </div>
                </div>
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium border border-red-100">
                    {cases.length} Due Today
                </div>
            </div>

            {cases.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No PTPs For Today</h3>
                    <p className="text-gray-500">There are no cases with a Promise to Pay date set for today.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">PTP Time</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">DPD</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    {user.role !== 'Telecaller' && (
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telecaller</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {cases.map((caseItem) => (
                                    <tr
                                        key={caseItem.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => onCaseClick?.(caseItem)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{caseItem.customer_name || 'Unknown'}</div>
                                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <Phone className="w-3 h-3" />
                                                {caseItem.mobile_no || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{caseItem.loan_id}</div>
                                            <div className="text-xs text-gray-500 mt-1 capitalize">{caseItem.product_name || 'Loan'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-red-600">
                                                    {caseItem.latest_ptp_date
                                                        ? new Date(caseItem.latest_ptp_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : 'N/A'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {caseItem.latest_ptp_date
                                                        ? new Date(caseItem.latest_ptp_date).toLocaleDateString()
                                                        : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium text-gray-900 flex items-center">
                                                    <IndianRupee className="w-3 h-3 mr-1" />
                                                    {caseItem.outstanding_amount || 0}
                                                </span>
                                                <span className="text-xs text-gray-500">Outstanding</span>
                                                {caseItem.emi_amount && (
                                                    <span className="text-xs text-blue-600 flex items-center">
                                                        <IndianRupee className="w-3 h-3 mr-0.5" />
                                                        {caseItem.emi_amount} EMI
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${(caseItem.dpd || 0) > 90 ? 'bg-red-100 text-red-700' :
                                                (caseItem.dpd || 0) > 30 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {caseItem.dpd || 0} Days
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {caseItem.latest_call_status ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                        {caseItem.latest_call_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No calls yet</span>
                                                )}
                                            </div>
                                        </td>
                                        {user.role !== 'Telecaller' && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-2">
                                                        {caseItem.telecaller?.name?.substring(0, 2).toUpperCase() || 'UN'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{caseItem.telecaller?.name || 'Unassigned'}</div>
                                                        <div className="text-xs text-gray-500">{caseItem.telecaller?.emp_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
