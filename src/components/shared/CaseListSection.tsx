import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Download,
    Eye,
    AlertCircle,
    CheckCircle2,
    Target,
    User,
    PhoneCall
} from 'lucide-react';
import { customerCaseService } from '../../services/customerCaseService';
import { CustomerCase } from '../TelecallerDashboard/types';
import { mapServiceCaseToDashboardCase } from '../../utils/caseMapper';
import { TeamService, TeamWithDetails } from '../../services/teamService';
import { employeeService } from '../../services/employeeService';
import { Employee } from '../../types/employee';
import { Modal } from './Modal';
import { supabase } from '../../lib/supabase';

interface CaseListSectionProps {
    user: {
        id: string;
        role: string;
        tenantId?: string;
    };
    onCaseClick?: (caseItem: CustomerCase) => void;
}

export const CaseListSection: React.FC<CaseListSectionProps> = ({ user, onCaseClick }) => {
    const [cases, setCases] = useState<CustomerCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [teams, setTeams] = useState<TeamWithDetails[]>([]);
    const [telecallers, setTelecallers] = useState<Employee[]>([]);
    const [filteredTelecallers, setFilteredTelecallers] = useState<Employee[]>([]);
    const [filters, setFilters] = useState({
        teamId: 'all',
        telecallerId: 'all',
        callResponse: 'all'
    });

    // Simple Details State
    const [selectedCaseForDetails, setSelectedCaseForDetails] = useState<CustomerCase | null>(null);

    // Sort and Pagination state
    const [sortBy] = useState<'dpd' | 'customer_name' | 'outstanding_amount'>('dpd');
    const [sortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset to page 1 when filters or itemsPerPage change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters, itemsPerPage]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user.tenantId) return;
            try {
                setIsLoading(true);

                // Fetch cases
                const serviceCases = await customerCaseService.getAllCases(user.tenantId);
                const data = serviceCases.map(mapServiceCaseToDashboardCase);
                setCases(data);

                // Fetch teams and telecallers for filters
                const [teamsData, employeesData] = await Promise.all([
                    TeamService.getTeams(user.tenantId),
                    employeeService.getEmployees(user.tenantId, 'Telecaller')
                ]);
                setTeams(teamsData);
                setTelecallers(employeesData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user.tenantId, user.role]);

    useEffect(() => {
        const updateFilteredTelecallers = async () => {
            if (filters.teamId === 'all') {
                setFilteredTelecallers(telecallers);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('team_telecallers')
                    .select(`
                        employees:telecaller_id(*)
                    `)
                    .eq('team_id', filters.teamId);

                if (error) throw error;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const employees = (data || []).map((tt: any) => {
                    const emp = tt.employees;
                    if (!emp) return null;
                    return {
                        id: emp.id,
                        tenantId: emp.tenant_id,
                        name: emp.name,
                        mobile: emp.mobile,
                        empId: emp.emp_id,
                        role: emp.role,
                        status: emp.status,
                        createdAt: new Date(emp.created_at),
                        updatedAt: new Date(emp.updated_at),
                        createdBy: emp.created_by,
                        teamId: emp.team_id
                    };
                }).filter(Boolean) as Employee[];

                setFilteredTelecallers(employees);
            } catch (error) {
                console.error('Error filtering telecallers:', error);
                setFilteredTelecallers([]);
            }
        };

        updateFilteredTelecallers();
    }, [telecallers, filters.teamId]);

    const filteredCases = useMemo(() => {
        return cases.filter(c => {
            const customerName = c.customerName || '';
            const loanId = c.loanId || '';
            const mobileNo = c.mobileNo || '';

            const matchesSearch =
                customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                mobileNo.includes(searchTerm);

            const matchesTeam = filters.teamId === 'all' || c.team_id === filters.teamId;
            const matchesTelecaller = filters.telecallerId === 'all' || c.telecaller_id === filters.telecallerId || c.telecallerId === filters.telecallerId;
            const matchesCallResponse = filters.callResponse === 'all' ||
                (c.latest_call_status || '').toLowerCase() === filters.callResponse.toLowerCase();

            return matchesSearch && matchesTeam && matchesTelecaller && matchesCallResponse;
        }).sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';

            if (sortBy === 'customer_name') {
                aVal = a.customerName || '';
                bVal = b.customerName || '';
            } else if (sortBy === 'dpd') {
                aVal = a.dpd || 0;
                bVal = b.dpd || 0;
            } else if (sortBy === 'outstanding_amount') {
                aVal = Number(a.outstandingAmount) || 0;
                bVal = Number(b.outstandingAmount) || 0;
            }

            if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });
    }, [cases, searchTerm, filters, sortBy, sortOrder]);

    const paginatedCases = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCases.slice(start, start + itemsPerPage);
    }, [filteredCases, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);

    const formatKey = (key: string) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">All Recovery Cases</h2>
                            <p className="text-sm text-gray-500">Comprehensive view of all cases across the organization</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search cases..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                                />
                            </div>
                            <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100">
                                <Download className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                                <Target className="w-3 h-3" /> Team
                            </label>
                            <select
                                value={filters.teamId}
                                onChange={(e) => setFilters(prev => ({ ...prev, teamId: e.target.value }))}
                                className="w-full bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Teams</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                                <User className="w-3 h-3" /> Telecaller
                            </label>
                            <select
                                value={filters.telecallerId}
                                onChange={(e) => setFilters(prev => ({ ...prev, telecallerId: e.target.value }))}
                                className="w-full bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Telecallers</option>
                                {filteredTelecallers.map(tc => (
                                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                                <PhoneCall className="w-3 h-3" /> Call Response
                            </label>
                            <select
                                value={filters.callResponse}
                                onChange={(e) => setFilters(prev => ({ ...prev, callResponse: e.target.value }))}
                                className="w-full bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Responses</option>
                                <option value="PTP">PTP</option>
                                <option value="CALL_BACK">Callback</option>
                                <option value="BUSY">Busy</option>
                                <option value="SW">Switched Off</option>
                                <option value="RNR">Ringing No Response</option>
                                <option value="WN">Wrong Number</option>
                                <option value="CD">Disconnected</option>
                                <option value="RTP">Refuse to Pay</option>
                                <option value="NC">No Contact</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Customer / Loan ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Team Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Telecaller Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Assignment</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-10 bg-gray-100 rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedCases.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No cases found matching your criteria
                                    </td>
                                </tr>
                            ) : (
                                paginatedCases.map((c) => {
                                    const customerName = c.customerName || '';
                                    const loanId = c.loanId || '';
                                    const telecallerId = c.telecaller_id || c.telecallerId;

                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{customerName}</div>
                                                <div className="text-xs text-gray-500">{loanId}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-700 font-medium">
                                                    {c.teamName || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-medium">
                                                {c.telecallerName || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {telecallerId ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        <span>Assigned</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                                        <span>Unassigned</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => {
                                                        if (!onCaseClick) {
                                                            setSelectedCaseForDetails(c);
                                                        }
                                                        onCaseClick?.(c);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-500">
                            Showing <span className="font-semibold text-gray-900">
                                {filteredCases.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                                {Math.min(currentPage * itemsPerPage, filteredCases.length)}
                            </span> of <span className="font-semibold text-gray-900">{filteredCases.length}</span> cases
                        </p>
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                            <span className="text-xs font-medium text-gray-400 uppercase">Per Page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer p-0"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white disabled:opacity-50 transition-all shadow-sm"
                        >
                            Previous
                        </button>
                        <div className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm">
                            {currentPage} / {totalPages || 1}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-white disabled:opacity-50 transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Simple Case Details Modal */}
            <Modal
                isOpen={!!selectedCaseForDetails}
                onClose={() => setSelectedCaseForDetails(null)}
                title="Case Details"
                size="lg"
            >
                {selectedCaseForDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-h-[70vh] overflow-y-auto p-2">
                        {Object.entries(selectedCaseForDetails)
                            .filter(([key, value]) => {
                                // Filter out internal objects and empty values
                                if (key === 'custom_fields' || key === 'case_data' || key === 'id' || key === 'tenant_id') return false;
                                if (value === null || value === undefined || value === '') return false;
                                return typeof value !== 'object';
                            })
                            .map(([key, value]) => (
                                <div key={key} className="flex flex-col space-y-1 py-2 border-b border-gray-50">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {formatKey(key)}
                                    </span>
                                    <span className="text-sm text-gray-900 font-medium">
                                        {String(value)}
                                    </span>
                                </div>
                            ))
                        }

                        {/* Custom Fields as well */}
                        {selectedCaseForDetails.custom_fields && Object.entries(selectedCaseForDetails.custom_fields as Record<string, unknown>).map(([key, value]) => (
                            <div key={`custom-${key}`} className="flex flex-col space-y-1 py-2 border-b border-gray-50">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                    {formatKey(key)}
                                </span>
                                <span className="text-sm text-gray-900 font-medium">
                                    {String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
};
