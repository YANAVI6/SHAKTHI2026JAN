import React, { useState, useEffect } from 'react';
import { PhoneCall, Phone, IndianRupee, Clock, Download, Filter } from 'lucide-react';
import { customerCaseService } from '../../../services/customerCaseService';
import type { TeamInchargeCase } from '../../../types/caseManagement';

interface CallbackAlertSectionProps {
    user: {
        id: string;
        role: string;
        tenantId?: string;
    };
    onCaseClick?: (caseItem: TeamInchargeCase) => void;
    teamId?: string;
}

export const CallbackAlertSection: React.FC<CallbackAlertSectionProps> = ({ user, onCaseClick, teamId }) => {
    const [cases, setCases] = useState<TeamInchargeCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTelecaller, setSelectedTelecaller] = useState<string>('all');

    useEffect(() => {
        const loadCallbackCases = async () => {
            if (!user.tenantId) return;
            setIsLoading(true);
            try {
                const employeeId = user.role === 'Telecaller' ? user.id : undefined;
                const data = await customerCaseService.getTodayCallbackCases(user.tenantId, employeeId, teamId);
                setCases(data);
            } catch (error) {
                console.error('Error loading callback cases:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCallbackCases();
    }, [user.tenantId, user.role, user.id, teamId]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading Callback Alerts...</div>;
    }

    const telecallers = React.useMemo(() => {
        const unique = new Map();
        cases.forEach(c => {
            if (c.telecaller?.id) {
                unique.set(c.telecaller.id, {
                    id: c.telecaller.id,
                    name: c.telecaller.name || 'Unknown',
                    empId: c.telecaller.emp_id || ''
                });
            }
        });
        return Array.from(unique.values());
    }, [cases]);

    const filteredCases = React.useMemo(() => {
        if (selectedTelecaller === 'all') return cases;
        return cases.filter(c => c.telecaller?.id === selectedTelecaller);
    }, [cases, selectedTelecaller]);

    const exportToCSV = () => {
        if (filteredCases.length === 0) return;

        const headers = [
            'Customer Name',
            'Mobile',
            'Loan ID',
            'Product',
            'Callback Date',
            'Callback Time',
            'Outstanding Amount',
            'EMI Amount',
            'DPD',
            'Latest Call Status',
            'Telecaller Name',
            'Telecaller ID'
        ].join(',');

        const rows = filteredCases.map(c => {
            const callbackDatetime = c.latest_callback_date ? new Date(c.latest_callback_date) : null;
            return [
                `"${c.customer_name || ''}"`,
                `"${c.mobile_no || ''}"`,
                `"${c.loan_id || ''}"`,
                `"${c.product_name || ''}"`,
                `"${callbackDatetime ? callbackDatetime.toLocaleDateString() : ''}"`,
                `"${callbackDatetime ? callbackDatetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}"`,
                `"${c.outstanding_amount || 0}"`,
                `"${c.emi_amount || ''}"`,
                `"${c.dpd || 0}"`,
                `"${c.latest_call_status || ''}"`,
                `"${c.telecaller?.name || ''}"`,
                `"${c.telecaller?.emp_id || ''}"`
            ].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `callback_alerts_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <PhoneCall className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Today's Callback Alerts</h1>
                        <p className="text-gray-500 text-sm">Cases scheduled for callback today</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {user.role !== 'Telecaller' && telecallers.length > 0 && (
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                            <Filter className="w-4 h-4 text-gray-400 mr-2" />
                            <select
                                value={selectedTelecaller}
                                onChange={(e) => setSelectedTelecaller(e.target.value)}
                                className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
                            >
                                <option value="all">All Telecallers</option>
                                {telecallers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.empId})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={exportToCSV}
                        disabled={filteredCases.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-100">
                        {filteredCases.length} Due Today
                    </div>
                </div>
            </div>

            {filteredCases.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PhoneCall className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Callbacks For Today</h3>
                    <p className="text-gray-500">There are no cases with a callback scheduled for today.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Callback Time</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">DPD</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Status</th>
                                    {user.role !== 'Telecaller' && (
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telecaller</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredCases.map((caseItem) => (
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
                                                <span className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {caseItem.latest_callback_date
                                                        ? new Date(caseItem.latest_callback_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : 'N/A'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {caseItem.latest_callback_date
                                                        ? new Date(caseItem.latest_callback_date).toLocaleDateString()
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
