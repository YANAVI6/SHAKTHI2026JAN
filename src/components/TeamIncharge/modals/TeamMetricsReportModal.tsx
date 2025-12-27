import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

interface TeamMetricsReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
}

interface Team {
    id: string;
    name: string;
}

interface Telecaller {
    id: string;
    name: string;
}

export const TeamMetricsReportModal: React.FC<TeamMetricsReportModalProps> = ({
    isOpen,
    onClose,
    tenantId
}) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [telecallers, setTelecallers] = useState<Telecaller[]>([]);

    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [selectedTelecallerId, setSelectedTelecallerId] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);

    // Load Teams
    useEffect(() => {
        if (isOpen && tenantId) {
            const loadTeams = async () => {
                const { data } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'active');
                setTeams(data || []);
            };
            loadTeams();
        }
    }, [isOpen, tenantId]);

    // Load Telecallers when Team changes
    useEffect(() => {
        if (selectedTeamId) {
            const loadTelecallers = async () => {
                const { data } = await supabase
                    .from('employees')
                    .select('id, name')
                    .eq('team_id', selectedTeamId)
                    .eq('role', 'Telecaller')
                    .eq('status', 'active');
                setTelecallers(data || []);
                setSelectedTelecallerId(''); // Reset telecaller selection
            };
            loadTelecallers();
        } else {
            setTelecallers([]);
            setSelectedTelecallerId('');
        }
    }, [selectedTeamId]);

    const downloadActivityReport = async (period: 'daily' | 'weekly' | 'monthly') => {
        if (!selectedTeamId || !selectedTelecallerId) {
            alert('Please select both Team and Telecaller');
            return;
        }

        setIsLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();
            let fileNamePrefix = 'Daily';

            if (period === 'daily') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'weekly') {
                const currentDay = now.getDay();
                const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
                startDate = new Date(now);
                startDate.setDate(now.getDate() - daysSinceMonday);
                startDate.setHours(0, 0, 0, 0);
                fileNamePrefix = 'Weekly';
            } else if (period === 'monthly') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                fileNamePrefix = 'Monthly';
            }

            // Fetch logs for activity report in batches
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let allLogs: any[] = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data: logs, error } = await supabase
                    .from('case_call_logs')
                    .select(`
                      *,
                      customer_cases (*)
                    `)
                    .eq('employee_id', selectedTelecallerId)
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) throw error;

                if (logs) {
                    allLogs = [...allLogs, ...logs];
                    if (logs.length < pageSize) hasMore = false;
                    page++;
                } else {
                    hasMore = false;
                }
            }

            const logs = allLogs;

            if (!logs || logs.length === 0) {
                alert(`No data found for this ${period} report`);
                return;
            }

            const telecaller = telecallers.find(t => t.id === selectedTelecallerId);
            const telecallerName = telecaller?.name || 'Unknown';
            const telecallerId = telecaller?.id || '';

            // Flatten and sanitize data
            const flattenedData = logs.map(log => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const caseData: any = log.customer_cases || {};

                // Helper to safely get nested values (case insensitive checks)
                const getValue = (keys: string[]) => {
                    for (const key of keys) {
                        // Check top level
                        if (caseData[key] !== undefined && caseData[key] !== null && caseData[key] !== '') return caseData[key];

                        // Check in case_data
                        if (caseData.case_data) {
                            if (caseData.case_data[key] !== undefined && caseData.case_data[key]) return caseData.case_data[key];
                            if (caseData.case_data[key.toLowerCase()] !== undefined && caseData.case_data[key.toLowerCase()]) return caseData.case_data[key.toLowerCase()];
                            if (caseData.case_data[key.toUpperCase()] !== undefined && caseData.case_data[key.toUpperCase()]) return caseData.case_data[key.toUpperCase()];
                        }
                    }
                    return 0; // Default to 0 for numbers
                };

                // Deep search for Employment Type
                let employmentType = '';
                if (caseData.loan_type) employmentType = caseData.loan_type;

                const empKeys = ['Employment Type', 'EMPLOYMENT TYPE', 'employment_type', 'employmentType'];
                for (const key of empKeys) {
                    if (caseData.custom_fields && caseData.custom_fields[key]) {
                        employmentType = caseData.custom_fields[key];
                        break;
                    }
                    if (caseData.case_data && caseData.case_data[key]) {
                        employmentType = caseData.case_data[key];
                        break;
                    }
                }

                // Deep search for Outstanding Amount
                const getOutstanding = () => {
                    const keys = ['outstanding_amount', 'total_outstanding', 'TOTAL OUTSTANDING', 'total_due', 'pending_dues', 'totalOutstanding'];
                    for (const key of keys) {
                        if (caseData[key]) return caseData[key];
                        if (caseData.case_data) {
                            if (caseData.case_data[key]) return caseData.case_data[key];
                        }
                    }
                    return 0;
                };

                // Format dates helper
                const formatDate = (dateStr: string) => {
                    if (!dateStr) return '';
                    return new Date(dateStr).toLocaleDateString('en-IN');
                };

                // Create custom row with EXACT columns from Telecaller Report
                return {
                    'EMPID': `${telecallerName} (${telecallerId})`,
                    'Customer Name': caseData.customer_name || '',
                    'Loan ID': caseData.loan_id || '',
                    'Mobile Number': caseData.mobile_no || '',
                    'Address': caseData.address || '',
                    'DPD': getValue(['dpd', 'DPD']),
                    'POS': getValue(['pos_amount', 'pos', 'POS']),
                    'EMI': getValue(['emi_amount', 'emi', 'EMI']),
                    'TOTAL OUTSTANDING': getOutstanding(),
                    'EMPLOYMENT TYPE': employmentType,
                    'Payment Link': caseData.payment_link || '',
                    'Loan Amount': caseData.loan_amount || 0,
                    'Last Payment Date': formatDate(caseData.last_paid_date),
                    'Last Payment Amount': caseData.last_paid_amount || 0,
                    'Loan Created At': formatDate(caseData.created_at),
                    'Call Status': log.call_status || '',
                    'Status Remarks': log.call_notes || '',
                    'PTP Date': log.ptp_datetime ? formatDate(log.ptp_datetime) : '',
                    'Total Collected Amount': log.amount_collected || 0
                };
            });

            const ws = XLSX.utils.json_to_sheet(flattenedData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `${telecallerName}_${fileNamePrefix}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Team Activity Reports</h2>
                        <p className="text-sm text-gray-600">Download activity logs by Team and Telecaller</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Select Team</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telecaller</label>
                        <select
                            value={selectedTelecallerId}
                            onChange={(e) => setSelectedTelecallerId(e.target.value)}
                            disabled={!selectedTeamId}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">Select Telecaller</option>
                            {telecallers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="p-6 bg-gray-50 rounded-b-xl border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Export</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => downloadActivityReport('daily')}
                            disabled={isLoading || !selectedTelecallerId}
                            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
                            Daily Report
                        </button>
                        <button
                            onClick={() => downloadActivityReport('weekly')}
                            disabled={isLoading || !selectedTelecallerId}
                            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-600" />
                            Weekly Summary
                        </button>
                        <button
                            onClick={() => downloadActivityReport('monthly')}
                            disabled={isLoading || !selectedTelecallerId}
                            className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FileSpreadsheet className="w-5 h-5 mr-2 text-purple-600" />
                            Monthly Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
