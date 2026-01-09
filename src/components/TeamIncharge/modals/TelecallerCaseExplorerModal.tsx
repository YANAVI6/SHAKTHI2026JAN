import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, FileSpreadsheet, Filter, CheckCircle, Clock, XCircle, AlertCircle, Phone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { customerCaseService } from '../../../services/customerCaseService';
import { TeamInchargeCase } from '../../../types/caseManagement';
import * as XLSX from 'xlsx';

interface TelecallerCaseExplorerModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    initialTeamId?: string;
    initialTelecallerId?: string;
}

interface Team {
    id: string;
    name: string;
}

interface Telecaller {
    id: string;
    name: string;
}

export const TelecallerCaseExplorerModal: React.FC<TelecallerCaseExplorerModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    initialTeamId,
    initialTelecallerId,
}) => {
    // --- State ---
    const [teams, setTeams] = useState<Team[]>([]);
    const [telecallers, setTelecallers] = useState<Telecaller[]>([]);

    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [selectedTelecallerId, setSelectedTelecallerId] = useState<string>('');
    const [selectedCallResponse, setSelectedCallResponse] = useState<string>('all');
    const [searchText, setSearchText] = useState<string>('');
    const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');

    // Pagination State
    const [cases, setCases] = useState<TeamInchargeCase[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [page, setPage] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [totalCount, setTotalCount] = useState<number>(0);

    // Observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastCaseElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                // Load more
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, loadingMore, hasMore]);

    const [selectedCase, setSelectedCase] = useState<TeamInchargeCase | null>(null);

    const ITEM_PER_PAGE = 50;

    // --- Initial Load ---
    useEffect(() => {
        if (isOpen) {
            if (initialTeamId !== undefined) setSelectedTeamId(initialTeamId);
            if (initialTelecallerId !== undefined) setSelectedTelecallerId(initialTelecallerId);
        }
    }, [isOpen, initialTeamId, initialTelecallerId]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText]);

    // Load Teams
    useEffect(() => {
        if (isOpen && tenantId) {
            const loadTeams = async () => {
                const { data } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'active')
                    .order('name');
                setTeams(data || []);
            };
            loadTeams();
        }
    }, [isOpen, tenantId]);

    // Load Telecallers
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
            };
            loadTelecallers();
        } else {
            setTelecallers([]);
        }
    }, [selectedTeamId]);

    // --- Reset Cases on Filter Change ---
    useEffect(() => {
        if (selectedTeamId) {
            setCases([]);
            setPage(0);
            setHasMore(true);
            setTotalCount(0);
            setLoading(true);

            fetchCases(0, true);
        } else {
            setCases([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTeamId, selectedTelecallerId, selectedCallResponse, debouncedSearchText]);

    const fetchCases = async (pageToLoad: number, isReset: boolean) => {
        if (!selectedTeamId) return;

        try {
            if (!isReset) setLoadingMore(true);

            // Fetch explicitly
            const result = await customerCaseService.getExplorerCases(
                tenantId,
                selectedTeamId,
                {
                    telecallerId: selectedTelecallerId || undefined,
                    status: selectedCallResponse,
                    search: debouncedSearchText
                },
                pageToLoad,
                ITEM_PER_PAGE
            );

            if (isReset) {
                setCases(result.cases);
                setLoading(false);
            } else {
                setCases(prev => [...prev, ...result.cases]);
                setLoadingMore(false);
            }

            setTotalCount(result.count);
            // If we got fewer items than requested, we've reached the end
            setHasMore(result.cases.length === ITEM_PER_PAGE);

        } catch (error) {
            console.error("Failed to fetch cases", error);
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        // Use functional state update to ensure correctness in callbacks if needed
        // But here we rely on 'page' state
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCases(nextPage, false);
    };

    // --- Export Excel ---
    const handleExport = () => {
        if (cases.length === 0) return;

        // Note: This exports only LOADED cases. 
        // For full export we might need a separate service call.
        const exportData = cases.map(c => ({
            'Loan ID': c.loan_id || c.case_data?.loan_id || '',
            'Customer Name': c.customer_name || c.case_data?.customer_name || '',
            'Mobile': c.mobile_no || (c.case_data?.mobile_no as string) || '',
            'Status': c.latest_call_status || c.case_status || '',
            'Telecaller': c.telecaller?.name || '',
            'Allocation Date': c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
            'Loan Amount': c.loan_amount || c.case_data?.loan_amount || '',
            'Outstanding': c.outstanding_amount || c.case_data?.outstanding_amount || '',
            'DPD': c.dpd || c.case_data?.dpd || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Explorer Cases");
        XLSX.writeFile(wb, `Explorer_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-hidden">
            <div className="bg-white w-full h-full md:w-[95vw] md:h-[90vh] md:rounded-xl shadow-2xl flex flex-col overflow-hidden">

                {/* --- Header --- */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Telecaller Case Explorer</h2>
                            <p className="text-xs text-gray-500">Explore, Filter, and Export cases instantly</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* --- Filter Bar --- */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white grid grid-cols-1 md:grid-cols-5 gap-4 flex-shrink-0">
                    {/* Team Select */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Team</label>
                        <select
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedTeamId}
                            onChange={(e) => {
                                setSelectedTeamId(e.target.value);
                                setSelectedTelecallerId(''); // Reset telecaller when team changes manually
                            }}
                        >
                            <option value="">Select Team...</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Telecaller Select */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Telecaller</label>
                        <select
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                            value={selectedTelecallerId}
                            onChange={(e) => setSelectedTelecallerId(e.target.value)}
                            disabled={!selectedTeamId}
                        >
                            <option value="">All Telecallers</option>
                            {telecallers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Call Response Select */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Call Response</label>
                        <select
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            value={selectedCallResponse}
                            onChange={(e) => setSelectedCallResponse(e.target.value)}
                        >
                            <option value="all">All Responses</option>
                            <option value="PTP">PTP (Promised to Pay)</option>
                            <option value="RNR">RNR (Ringing No Response)</option>
                            <option value="NC">NC (Not Connected)</option>
                            <option value="WN">WN (Wrong Number)</option>
                            <option value="cb">CB (Callback)</option>
                            <option value="sw">SW (Switch Off)</option>
                            <option value="busy">Busy</option>
                            <option value="dispute">Dispute</option>
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Search</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Loan ID / Name / Mobile"
                                className="w-full text-sm pl-8 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        </div>
                    </div>

                    {/* Export Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleExport}
                            disabled={cases.length === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Export Excel
                        </button>
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left: Case List */}
                    <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                        <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 flex justify-between">
                            <span>Showing {cases.length} loaded</span>
                            {selectedTeamId && <span>{totalCount} total found (approx)</span>}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    Loading cases...
                                </div>
                            ) : !selectedTeamId ? (
                                <div className="p-8 text-center text-gray-400">
                                    Select a team to view cases
                                </div>
                            ) : cases.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No cases match current filters
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {cases.map((c, index) => {
                                        const isLast = index === cases.length - 1;
                                        return (
                                            <div
                                                key={c.id}
                                                ref={isLast ? lastCaseElementRef : null}
                                                onClick={() => setSelectedCase(c)}
                                                className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedCase?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-bold text-gray-900 truncate pr-2">
                                                        {c.customer_name || (c.case_data?.customer_name as string) || 'Unknown Name'}
                                                    </div>
                                                    <FilterBadge status={c.latest_call_status || c.case_status} />
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mb-1">
                                                    {c.loan_id || (c.case_data?.loan_id as string)}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Phone className="w-3 h-3 mr-1" />
                                                    {c.mobile_no || (c.case_data?.mobile_no as string) || 'N/A'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {loadingMore && (
                                        <div className="p-4 text-center text-gray-400 text-xs">
                                            Loading more data...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Case Details */}
                    <div className="w-2/3 bg-gray-50 flex flex-col overflow-y-auto p-6">
                        {selectedCase ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl mx-auto w-full">
                                {/* Detail Header */}
                                <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                                            {selectedCase.customer_name || (selectedCase.case_data?.customer_name as string)}
                                        </h2>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                                {selectedCase.loan_id || (selectedCase.case_data?.loan_id as string)}
                                            </span>
                                            <span>•</span>
                                            <span>{selectedCase.mobile_no || (selectedCase.case_data?.mobile_no as string)}</span>
                                        </div>
                                    </div>
                                    <FilterBadge status={selectedCase.latest_call_status || selectedCase.case_status} size="lg" />
                                </div>

                                {/* Detail Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Customer Details</h4>
                                        <DetailRow label="Name" value={selectedCase.customer_name || selectedCase.case_data?.customer_name} />
                                        <DetailRow label="Mobile" value={selectedCase.mobile_no || selectedCase.case_data?.mobile_no} />
                                        <DetailRow label="Alt Mobile" value={selectedCase.alternate_number || selectedCase.case_data?.alternate_number} />
                                        <DetailRow label="Email" value={selectedCase.email || selectedCase.case_data?.email} />
                                        <DetailRow label="Address" value={selectedCase.address || selectedCase.case_data?.address} />
                                        <DetailRow label="Location" value={`${selectedCase.city || selectedCase.case_data?.city || ''} ${selectedCase.pincode || selectedCase.case_data?.pincode || ''}`} />
                                        <DetailRow label="Employment" value={selectedCase.case_data?.employmentType || selectedCase.case_data?.employment_type || 'N/A'} />
                                    </section>

                                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Financial Details</h4>
                                        <DetailRow label="Loan Amount" value={selectedCase.loan_amount || selectedCase.case_data?.loan_amount} isCurrency />
                                        <DetailRow label="Outstanding" value={selectedCase.outstanding_amount || selectedCase.case_data?.outstanding_amount || selectedCase.case_data?.totalOutstanding} isCurrency highlight />
                                        <DetailRow label="EMI Amount" value={selectedCase.emi_amount || selectedCase.case_data?.emi_amount || selectedCase.case_data?.emi} isCurrency />
                                        <DetailRow label="POS" value={selectedCase.pos_amount || selectedCase.case_data?.pos_amount || selectedCase.case_data?.pos} isCurrency />
                                        <DetailRow label="DPD" value={selectedCase.dpd || selectedCase.case_data?.dpd} />
                                        <DetailRow label="Pending Dues" value={selectedCase.pending_dues || selectedCase.case_data?.pending_dues} isCurrency />
                                    </section>

                                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Payment & Status</h4>
                                        <DetailRow label="Last Paid Date" value={selectedCase.last_paid_date || selectedCase.case_data?.last_paid_date} />
                                        <DetailRow label="Last Paid Amt" value={selectedCase.last_paid_amount || selectedCase.case_data?.last_paid_amount} isCurrency />
                                        <DetailRow label="Sanction Date" value={selectedCase.sanction_date || selectedCase.case_data?.sanction_date} />
                                        <DetailRow label="Telecaller" value={selectedCase.telecaller?.name || 'Unassigned'} />
                                        <DetailRow label="PTP Date" value={selectedCase.latest_ptp_date ? new Date(selectedCase.latest_ptp_date).toLocaleDateString() : 'N/A'} />
                                        <DetailRow label="Allocation Date" value={selectedCase.created_at ? new Date(selectedCase.created_at).toLocaleDateString() : ''} />
                                        <DetailRow label="Payment Link" value={selectedCase.payment_link || selectedCase.case_data?.payment_link} isLink />
                                    </section>

                                    {selectedCase.remarks && (
                                        <section className="col-span-full mt-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                            <span className="text-xs font-bold text-yellow-700 block mb-1 uppercase tracking-wider">Remarks</span>
                                            <p className="text-sm text-yellow-900">{selectedCase.remarks}</p>
                                        </section>
                                    )}

                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                                <Filter className="w-16 h-16 mb-4" />
                                <p className="text-lg font-medium">Select a case to view details</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- Helpers ---

const FilterBadge = ({ status, size = 'sm' }: { status?: string, size?: 'sm' | 'lg' }) => {
    const s = (status || 'pending').toLowerCase();

    let colorClass = 'bg-gray-100 text-gray-600';
    let Icon = AlertCircle;

    if (s === 'resolved') {
        colorClass = 'bg-green-100 text-green-700';
        Icon = CheckCircle;
    } else if (s === 'in_progress') {
        colorClass = 'bg-blue-100 text-blue-700';
        Icon = Clock;
    } else if (s === 'closed') {
        colorClass = 'bg-gray-100 text-gray-500 line-through';
        Icon = XCircle;

    } else if (['ptp', 'promised to pay'].includes(s)) {
        colorClass = 'bg-teal-100 text-teal-700';
        Icon = CheckCircle;
    } else if (['rnr', 'ringing'].includes(s)) {
        colorClass = 'bg-orange-100 text-orange-700';
        Icon = Phone;
    } else if (['nc', 'not connected', 'wn', 'wrong number', 'sw', 'switch off', 'busy'].includes(s)) {
        colorClass = 'bg-red-50 text-red-600';
        Icon = XCircle;
    } else if (['cb', 'callback'].includes(s)) {
        colorClass = 'bg-indigo-100 text-indigo-700';
        Icon = Clock;
    }

    const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[10px]';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wide ${colorClass} ${sizeClass}`}>
            {size === 'lg' && <Icon className="w-4 h-4" />}
            {s.replace('_', ' ')}
        </span>
    );
};

interface DetailRowProps {
    label: string;
    value: unknown;
    isCurrency?: boolean;
    highlight?: boolean;
    isLink?: boolean;
}

const DetailRow = ({ label, value, isCurrency = false, highlight = false, isLink = false }: DetailRowProps) => {
    if (!value) return null;

    let displayValue: React.ReactNode = value as React.ReactNode;

    if (isCurrency) {
        const num = parseFloat(String(value).replace(/,/g, ''));
        if (!isNaN(num)) {
            displayValue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
        }
    }

    if (isLink) {
        return (
            <div className="mb-2">
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <a
                    href={String(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800 underline truncate block"
                >
                    {String(value)}
                </a>
            </div>
        );
    }

    return (
        <div className="mb-2">
            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
            <div className={`font-medium text-gray-900 ${highlight ? 'text-red-600 font-bold' : ''}`}>
                {displayValue}
            </div>
        </div>
    );
};
