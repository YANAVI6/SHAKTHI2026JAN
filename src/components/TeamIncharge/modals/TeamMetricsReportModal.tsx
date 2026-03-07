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

    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

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
                const { data, error } = await supabase
                    .from('team_telecallers')
                    .select(`
                        employees:telecaller_id(id, name)
                    `)
                    .eq('team_id', selectedTeamId);

                if (error) {
                    console.error('Error loading team telecallers:', error);
                    setTelecallers([]);
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const employees = data?.map((tt: any) => tt.employees).filter(Boolean) || [];
                    setTelecallers(employees);
                }
                setSelectedTelecallerId(''); // Reset telecaller selection
            };
            loadTelecallers();
        } else {
            setTelecallers([]);
            setSelectedTelecallerId('');
        }
    }, [selectedTeamId]);

    const downloadActivityReport = async (period: 'daily' | 'custom') => {
        if (!selectedTeamId || !selectedTelecallerId) {
            alert('Please select both Team and Telecaller');
            return;
        }

        if (period === 'custom' && (!customStartDate || !customEndDate)) {
            alert('Please select both Start Date and End Date');
            return;
        }

        setIsLoading(true);
        try {
            let start = new Date();
            let end = new Date();
            let fileNamePrefix = 'Daily';

            if (period === 'daily') {
                start.setHours(0, 0, 0, 0);
                end = new Date();
            } else if (period === 'custom') {
                start = new Date(customStartDate);
                start.setHours(0, 0, 0, 0);
                end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
                fileNamePrefix = `Custom_${customStartDate}_to_${customEndDate}`;
            }

            let targetEmployeeIds: string[] = [];
            if (selectedTelecallerId === 'all') {
                fileNamePrefix = `WholeTeam_${fileNamePrefix}`;
                targetEmployeeIds = telecallers.map(t => t.id);
            } else {
                targetEmployeeIds = [selectedTelecallerId];
            }

            if (targetEmployeeIds.length === 0) {
                alert('No telecallers found to export');
                setIsLoading(false);
                return;
            }

            // ── Fetch all call logs with their case data ──────────────────────
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let allLogs: any[] = [];
            const CHUNK_SIZE = 10;
            for (let i = 0; i < targetEmployeeIds.length; i += CHUNK_SIZE) {
                const employeeChunk = targetEmployeeIds.slice(i, i + CHUNK_SIZE).filter(id => id && id.length > 10);
                if (employeeChunk.length === 0) continue;

                let page = 0;
                const pageSize = 1000;
                let hasMore = true;
                while (hasMore) {
                    const { data: logs, error } = await supabase
                        .from('case_call_logs')
                        .select('*, customer_cases (*)')
                        .in('employee_id', employeeChunk)
                        .gte('created_at', start.toISOString())
                        .lte('created_at', end.toISOString())
                        .order('created_at', { ascending: true })
                        .range(page * pageSize, (page + 1) * pageSize - 1);

                    if (error) throw error;
                    if (logs) {
                        allLogs = [...allLogs, ...logs];
                        hasMore = logs.length === pageSize;
                        page++;
                    } else {
                        hasMore = false;
                    }
                }
            }

            if (!allLogs || allLogs.length === 0) {
                alert('No data found for this report period');
                return;
            }

            // ── Report name ───────────────────────────────────────────────────
            let reportName = 'Report';
            if (selectedTelecallerId === 'all') {
                const team = teams.find(t => t.id === selectedTeamId);
                reportName = team?.name || 'Team';
            } else {
                const telecaller = telecallers.find(t => t.id === selectedTelecallerId);
                reportName = telecaller?.name || 'Telecaller';
            }

            // ── Helpers ───────────────────────────────────────────────────────
            const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '';
            const formatTime = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleTimeString('en-IN', { hour12: true }) : '';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getVal = (caseData: any, keys: string[]) => {
                for (const key of keys) {
                    if (caseData[key] != null && caseData[key] !== '') return caseData[key];
                    if (caseData.case_data?.[key] != null && caseData.case_data[key] !== '') return caseData.case_data[key];
                }
                return '';
            };

            // ── Collect all unique dates (as "DD-Mon-YYYY" labels) ────────────
            const dateLabels = Array.from(
                new Set(allLogs.map(log => {
                    const d = new Date(log.created_at);
                    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                }))
            ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            // ── Sub-column definition (7 per date) ───────────────────────────
            const subCols = ['Call Status', 'Status Remarks', 'PTP Date', 'PTP Remarks', 'Total Collected Amount', 'Call Date', 'Call Time'];

            // ── Base (static) columns ─────────────────────────────────────────
            const baseCols = [
                'EMPID', 'Customer Name', 'Loan ID', 'Mobile Number', 'Address',
                'DPD', 'POS', 'EMI', 'TOTAL OUTSTANDING', 'EMPLOYMENT TYPE',
                'Payment Link', 'Loan Amount', 'Last Payment Date', 'Last Payment Amount',
                'Loan Created At', 'Buckets'
            ];

            // ── Build pivot map: caseId → { baseData, callsByDate } ───────────
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pivotMap = new Map<string, { base: Record<string, any>; callsByDate: Map<string, any[]> }>();

            for (const log of allLogs) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const caseData: any = log.customer_cases || {};
                const caseId = caseData.id || log.case_id || `${log.employee_id}_${caseData.loan_id}`;

                const telecaller = telecallers.find(t => t.id === log.employee_id);
                const tName = telecaller?.name || 'Unknown';
                const tId = log.employee_id || '';

                let employmentType = caseData.loan_type || '';
                const empKeys = ['Employment Type', 'EMPLOYMENT TYPE', 'employment_type', 'employmentType'];
                for (const key of empKeys) {
                    if (caseData.custom_fields?.[key]) { employmentType = caseData.custom_fields[key]; break; }
                    if (caseData.case_data?.[key]) { employmentType = caseData.case_data[key]; break; }
                }

                const outstanding = getVal(caseData, ['outstanding_amount', 'total_outstanding', 'TOTAL OUTSTANDING', 'pending_dues', 'totalOutstanding']);

                if (!pivotMap.has(caseId)) {
                    pivotMap.set(caseId, {
                        base: {
                            'EMPID': `${tName} (${tId.slice(-6)})`,
                            'Customer Name': caseData.customer_name || '',
                            'Loan ID': caseData.loan_id || '',
                            'Mobile Number': caseData.mobile_no || '',
                            'Address': caseData.address || '',
                            'DPD': getVal(caseData, ['dpd', 'DPD']),
                            'POS': getVal(caseData, ['pos_amount', 'pos', 'POS']),
                            'EMI': getVal(caseData, ['emi_amount', 'emi', 'EMI']),
                            'TOTAL OUTSTANDING': outstanding,
                            'EMPLOYMENT TYPE': employmentType,
                            'Payment Link': caseData.payment_link || '',
                            'Loan Amount': caseData.loan_amount || '',
                            'Last Payment Date': formatDate(caseData.last_paid_date),
                            'Last Payment Amount': caseData.last_paid_amount || '',
                            'Loan Created At': formatDate(caseData.sanction_date || caseData.created_at),
                            'Buckets': getVal(caseData, ['buckets', 'bucket', 'Buckets'])
                        },
                        callsByDate: new Map()
                    });
                }

                const entry = pivotMap.get(caseId)!;
                const dateLabel = new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                const callEntry = {
                    'Call Status': log.call_status || '',
                    'Status Remarks': log.call_notes || '',
                    'PTP Date': log.ptp_datetime ? formatDate(log.ptp_datetime) : '',
                    'PTP Remarks': log.call_notes || '',
                    'Total Collected Amount': log.amount_collected || '',
                    'Call Date': formatDate(log.created_at),
                    'Call Time': formatTime(log.created_at)
                };

                const existing = entry.callsByDate.get(dateLabel) || [];
                existing.push(callEntry);
                entry.callsByDate.set(dateLabel, existing);
            }

            // ── Build Excel using XLSX ─────────────────────────────────────────
            const wb = XLSX.utils.book_new();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wsData: any[][] = [];

            // Row 1: date group headers (merged over 7 sub-cols each)
            const row1: string[] = baseCols.map(() => '');
            dateLabels.forEach(dl => {
                row1.push(dl);
                for (let i = 1; i < subCols.length; i++) row1.push(''); // blank placeholders for merge
            });
            wsData.push(row1);

            // Row 2: sub-column headers
            const row2: string[] = [...baseCols];
            dateLabels.forEach(() => subCols.forEach(s => row2.push(s)));
            wsData.push(row2);

            // Data rows
            for (const { base, callsByDate } of pivotMap.values()) {
                const dataRow: (string | number)[] = baseCols.map(c => base[c] ?? '');
                dateLabels.forEach(dl => {
                    const calls = callsByDate.get(dl) || [];
                    if (calls.length === 0) {
                        subCols.forEach(() => dataRow.push('—'));
                    } else {
                        // if multiple calls on same date, join them with ' | '
                        subCols.forEach(sc => {
                            dataRow.push(calls.map((c: Record<string, unknown>) => c[sc] ?? '').filter(Boolean).join(' | ') || '—');
                        });
                    }
                });
                wsData.push(dataRow);
            }

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Merge date header cells (row 1) across their 7 sub-columns
            if (!ws['!merges']) ws['!merges'] = [];
            dateLabels.forEach((_, di) => {
                const startCol = baseCols.length + di * subCols.length;
                const endCol = startCol + subCols.length - 1;
                ws['!merges']!.push({ s: { r: 0, c: startCol }, e: { r: 0, c: endCol } });
            });

            // Set column widths
            ws['!cols'] = [
                ...baseCols.map((_, i) => ({ wch: i < 5 ? 22 : 14 })),
                ...dateLabels.flatMap(() => subCols.map(s => ({ wch: s.length > 12 ? 18 : 14 })))
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Report');
            XLSX.writeFile(wb, `${reportName}_${fileNamePrefix}_DateWise_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error: unknown) {
            console.error('Error downloading report:', error);
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            alert(`Failed to download report: ${msg}`);
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
                            <option value="all" className="font-bold text-blue-600">Whole Team (All Telecallers)</option>
                            {telecallers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="p-6 bg-gray-50 rounded-b-xl border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Export</h3>
                    <div className="space-y-4">
                        {/* Daily Report Button */}
                        <div className="flex justify-start">
                            <button
                                onClick={() => downloadActivityReport('daily')}
                                disabled={isLoading || !selectedTelecallerId}
                                className="flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full md:w-auto"
                            >
                                <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
                                Today's Report
                            </button>
                        </div>

                        {/* Custom Date Range */}
                        <div className="p-4 bg-white border border-gray-200 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Custom Date Range</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => downloadActivityReport('custom')}
                                    disabled={isLoading || !selectedTelecallerId || !customStartDate || !customEndDate}
                                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-[38px]"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Download Report
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
