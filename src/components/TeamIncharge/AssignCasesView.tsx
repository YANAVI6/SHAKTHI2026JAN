import React, { useState, useEffect, useRef } from 'react';
import { Search, X, UserCheck, Users, User, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { customerCaseService, CustomerCase } from '../../services/customerCaseService';
import { TeamService } from '../../services/teamService';
import { useNotification } from '../../contexts/NotificationContext';
import { ProgressModal } from '../shared/ProgressModal';
import { supabase } from '../../lib/supabase';

type ViewMode = 'all' | 'team' | 'telecaller';

interface CaseWithSelection extends CustomerCase {
  selected?: boolean;
  telecaller_name?: string;
  team_name?: string;
  last_call_status?: string;
}

interface BulkAssignData {
  teamId: string;
  telecallerId: string;
  priority: string;
}

interface BulkReassignData {
  fromTeamId?: string;
  fromTelecallerId?: string;
  toTeamId: string;
  toTelecallerId: string;
  reason: string;
}

interface Team {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface Telecaller {
  id: string;
  name: string;
  team_id?: string;
  [key: string]: unknown;
}

interface CaseFilters {
  search: string;
  teamId: string;
  telecallerId: string;
  caseStatus: string;
  assignmentStatus: string;
  callResponse: string;
  dpdMin: string;
  dpdMax: string;
  dateFrom: string;
  dateTo: string;
  priority: string;
}

// Sub-components
const FiltersSection: React.FC<{
  filters: CaseFilters;
  setFilters: (f: CaseFilters) => void;
  resetFilters: () => void;
  teams: Team[];
  telecallers: Telecaller[];
  viewMode: ViewMode;
}> = ({ filters, setFilters, resetFilters, teams, telecallers, viewMode }) => (
  <div className="space-y-4 mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Loan ID, Customer, Mobile"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
        <select
          value={filters.teamId}
          onChange={(e) => setFilters({ ...filters, teamId: e.target.value, telecallerId: '' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telecaller</label>
        <select
          value={filters.telecallerId}
          onChange={(e) => setFilters({ ...filters, telecallerId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={!filters.teamId && viewMode !== 'all'}
        >
          <option value="">All Telecallers</option>
          {telecallers
            .filter(t => !filters.teamId || t.team_id === filters.teamId)
            .map(telecaller => (
              <option key={telecaller.id} value={telecaller.id}>
                {telecaller.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Status</label>
        <select
          value={filters.assignmentStatus}
          onChange={(e) => setFilters({ ...filters, assignmentStatus: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Case Status</label>
        <select
          value={filters.caseStatus}
          onChange={(e) => setFilters({ ...filters, caseStatus: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">New</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Call Response</label>
        <select
          value={filters.callResponse}
          onChange={(e) => setFilters({ ...filters, callResponse: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Responses</option>
          <option value="WN">Wrong Number</option>
          <option value="SW">Switched Off</option>
          <option value="RNR">Ringing No Response</option>
          <option value="BUSY">Busy</option>
          <option value="CALL_BACK">Call Back</option>
          <option value="PTP">Promise to Pay</option>
          <option value="FUTURE_PTP">Future PTP</option>
          <option value="BPTP">Broken PTP</option>
          <option value="RTP">Refused to Pay</option>
          <option value="NC">Not Connected</option>
          <option value="CD">Call Disconnected</option>
          <option value="INC">Incomplete</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">DPD Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={filters.dpdMin}
            onChange={(e) => setFilters({ ...filters, dpdMin: e.target.value })}
            placeholder="Min"
            className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={filters.dpdMax}
            onChange={(e) => setFilters({ ...filters, dpdMax: e.target.value })}
            placeholder="Max"
            className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-end">
        <button
          onClick={resetFilters}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
        >
          <X className="w-4 h-4 inline mr-2" />
          Reset Filters
        </button>
      </div>
    </div>
  </div>
);

const BulkActionToolbar: React.FC<{
  selectedCount: number;
  onAssign: () => void;
  onUnassign: () => void;
  onReassign: () => void;
  onDelete: () => void;
}> = ({ selectedCount, onAssign, onUnassign, onReassign, onDelete }) => (
  <div className="sticky bottom-6 left-0 right-0 bg-white shadow-2xl border border-blue-200 rounded-2xl p-4 animate-in slide-in-from-bottom-4 duration-300 z-40">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-700 font-bold">{selectedCount}</span>
        </div>
        <div>
          <h4 className="font-bold text-gray-900">Cases Selected</h4>
          <p className="text-xs text-gray-500">Choose an action for the selected cases</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAssign}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all shadow-lg shadow-green-200 flex items-center gap-2"
        >
          <UserCheck className="w-4 h-4" />
          Assign
        </button>
        <button
          onClick={onUnassign}
          className="px-6 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold transition-all shadow-lg shadow-orange-200 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Unassign
        </button>
        <button
          onClick={onReassign}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Reassign
        </button>
        <button
          onClick={onDelete}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-all shadow-lg shadow-red-200 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  </div>
);

export const AssignCasesView: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [cases, setCases] = useState<CaseWithSelection[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    teamId: '',
    telecallerId: '',
    caseStatus: '',
    assignmentStatus: '',
    callResponse: '',
    dpdMin: '',
    dpdMax: '',
    dateFrom: '',
    dateTo: '',
    priority: ''
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [telecallers, setTelecallers] = useState<any[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [bulkAssignData, setBulkAssignData] = useState<BulkAssignData>({
    teamId: '',
    telecallerId: '',
    priority: 'medium'
  });

  const [bulkReassignData, setBulkReassignData] = useState<BulkReassignData>({
    toTeamId: '',
    toTelecallerId: '',
    reason: ''
  });

  const [unassignReason, setUnassignReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [showProgress, setShowProgress] = useState(false);
  const [progressData, setProgressData] = useState({
    total: 0,
    current: 0,
    successCount: 0,
    errorCount: 0,
    currentItemName: '',
    errors: [] as Array<{ id: string; name: string; error: string }>,
    isComplete: false
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelOperationRef = useRef(false);



  const getLatestCallStatuses = async (caseIds: string[]) => {
    if (caseIds.length === 0) return {};

    try {
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < caseIds.length; i += chunkSize) {
        chunks.push(caseIds.slice(i, i + chunkSize));
      }

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const { data, error } = await supabase
            .from('case_call_logs')
            .select('case_id, call_status, created_at')
            .in('case_id', chunk)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data || [];
        })
      );

      const allLogs = results.flat();
      const latestStatuses: Record<string, string> = {};

      allLogs.forEach(log => {
        // Since we order by created_at desc, the first one we see for a case is the latest
        // But since we are concatenating chunks, we need to be careful if we didn't sort globally?
        // Actually, for each chunk we get ordered results.
        // But we might have logs for same case in different chunks? 
        // No, caseIds are unique in the input array usually, but let's double check.
        // Yes, allCases.map(c => c.id) should be unique cases.
        if (!latestStatuses[log.case_id]) {
          latestStatuses[log.case_id] = log.call_status;
        }
      });

      return latestStatuses;
    } catch (error) {
      console.error('Error fetching call statuses:', error);
      return {};
    }
  };

  const loadData = React.useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);

      const teamData = await TeamService.getTeams(user.tenantId);
      const userTeams = teamData.filter(
        team => team.team_incharge_id === user.id && team.status === 'active'
      );
      setTeams(userTeams);

      let allCases: CustomerCase[] = [];
      for (const team of userTeams) {
        const teamCases = await customerCaseService.getTeamCases(user.tenantId, team.id);
        allCases = [...allCases, ...teamCases];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allTelecallers: any[] = [];
      for (const team of userTeams) {
        if (team.telecallers && Array.isArray(team.telecallers)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allTelecallers.push(...team.telecallers.map((t: any) => ({
            ...t,
            team_id: team.id,
            team_name: team.name
          })));
        }
      }
      setTelecallers(allTelecallers);

      const caseIds = allCases.map(c => c.id).filter((id): id is string => !!id);
      const latestCallStatuses = await getLatestCallStatuses(caseIds);

      const casesWithDetails = allCases.map(c => {
        const team = userTeams.find(t => t.id === c.team_id);
        const telecaller = allTelecallers.find(t => t.id === c.telecaller_id);

        return {
          ...c,
          team_name: team?.name || 'N/A',
          telecaller_name: telecaller?.name || '—',
          last_call_status: c.id ? latestCallStatuses[c.id] : undefined
        };
      });

      setCases(casesWithDetails);
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification({ type: 'error', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [user, showNotification]);

  const applyFilters = React.useCallback(() => {
    let filtered = [...cases];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.loan_id?.toLowerCase().includes(searchLower) ||
        c.customer_name?.toLowerCase().includes(searchLower) ||
        c.mobile_no?.includes(searchLower)
      );
    }

    if (filters.teamId) {
      filtered = filtered.filter(c => c.team_id === filters.teamId);
    }

    if (filters.telecallerId) {
      filtered = filtered.filter(c => c.telecaller_id === filters.telecallerId);
    }

    if (filters.caseStatus) {
      filtered = filtered.filter(c => c.case_status === filters.caseStatus);
    }

    if (filters.assignmentStatus === 'assigned') {
      filtered = filtered.filter(c => c.telecaller_id);
    } else if (filters.assignmentStatus === 'unassigned') {
      filtered = filtered.filter(c => !c.telecaller_id);
    }

    if (filters.callResponse) {
      filtered = filtered.filter(c => c.last_call_status === filters.callResponse);
    }

    if (filters.dpdMin) {
      const min = parseInt(filters.dpdMin);
      filtered = filtered.filter(c => (c.dpd || 0) >= min);
    }

    if (filters.dpdMax) {
      const max = parseInt(filters.dpdMax);
      filtered = filtered.filter(c => (c.dpd || 0) <= max);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(c => c.created_at && c.created_at >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(c => c.created_at && c.created_at <= filters.dateTo + 'T23:59:59');
    }

    if (filters.priority) {
      filtered = filtered.filter(c => c.priority === filters.priority);
    }

    if (viewMode === 'team' && filters.teamId) {
      filtered = filtered.filter(c => c.team_id === filters.teamId);
    }

    if (viewMode === 'telecaller' && filters.telecallerId) {
      filtered = filtered.filter(c => c.telecaller_id === filters.telecallerId);
    }

    setFilteredCases(filtered);
  }, [cases, filters, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, filters]);

  const handleSelectCase = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const handleSelectAll = () => {
    const currentPageCases = getCurrentPageCases();
    const currentPageIds = currentPageCases.map(c => c.id).filter((id): id is string => !!id);

    if (selectedCases.length === currentPageIds.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(currentPageIds);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredCases.map(c => c.id).filter((id): id is string => !!id);
    setSelectedCases(allFilteredIds);
  };

  const getCurrentPageCases = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCases.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCases.length / pageSize);

  const resetFilters = () => {
    setFilters({
      search: '',
      teamId: '',
      telecallerId: '',
      caseStatus: '',
      assignmentStatus: '',
      callResponse: '',
      dpdMin: '',
      dpdMax: '',
      dateFrom: '',
      dateTo: '',
      priority: ''
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignData.teamId || !bulkAssignData.telecallerId) {
      showNotification({ type: 'error', title: 'Please select team and telecaller' });
      return;
    }

    const selectedCasesList = cases.filter(c => c.id && selectedCases.includes(c.id));

    cancelOperationRef.current = false;
    setIsCancelling(false);
    setProgressData({
      total: selectedCases.length,
      current: 0,
      successCount: 0,
      errorCount: 0,
      currentItemName: '',
      errors: [],
      isComplete: false
    });
    setShowProgress(true);
    setShowAssignModal(false);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (let i = 0; i < selectedCases.length; i++) {
        if (cancelOperationRef.current) {
          errors.push({
            id: 'cancelled',
            name: 'Operation Cancelled',
            error: `Operation stopped by user. ${selectedCases.length - i} cases remaining.`
          });
          break;
        }

        const caseId = selectedCases[i];
        const currentCase = selectedCasesList[i];
        const caseName = String(currentCase?.customer_name || currentCase?.loan_id || `Case ${i + 1}`);

        setProgressData(prev => ({
          ...prev,
          current: i + 1,
          currentItemName: caseName
        }));

        try {
          await customerCaseService.assignCase(caseId, {
            caseId,
            telecallerId: bulkAssignData.telecallerId,
            assignedBy: user?.id || ''
          });
          successCount++;
          setProgressData(prev => ({ ...prev, successCount: successCount }));
        } catch (error) {
          errorCount++;
          errors.push({
            id: caseId,
            name: caseName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          setProgressData(prev => ({ ...prev, errorCount: errorCount, errors }));
        }
      }

      setProgressData(prev => ({ ...prev, isComplete: true }));

      if (successCount > 0) {
        setSelectedCases([]);
        setBulkAssignData({ teamId: '', telecallerId: '', priority: 'medium' });
        loadData();
      }

      setTimeout(() => {
        if (errorCount === 0) {
          setShowProgress(false);
          showNotification({ type: 'success', title: `Successfully assigned ${successCount} cases` });
        }
      }, 2000);
    } catch (error) {
      console.error('Error assigning cases:', error);
      showNotification({ type: 'error', title: 'Failed to assign cases' });
      setShowProgress(false);
    }
  };

  const handleBulkUnassign = async () => {
    if (!unassignReason.trim()) {
      showNotification({ type: 'error', title: 'Please provide a reason' });
      return;
    }

    const selectedCasesList = cases.filter(c => c.id && selectedCases.includes(c.id));

    cancelOperationRef.current = false;
    setIsCancelling(false);
    setProgressData({
      total: selectedCases.length,
      current: 0,
      successCount: 0,
      errorCount: 0,
      currentItemName: '',
      errors: [],
      isComplete: false
    });
    setShowProgress(true);
    setShowUnassignModal(false);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (let i = 0; i < selectedCases.length; i++) {
        if (cancelOperationRef.current) {
          errors.push({
            id: 'cancelled',
            name: 'Operation Cancelled',
            error: `Operation stopped by user. ${selectedCases.length - i} cases remaining.`
          });
          break;
        }

        const caseId = selectedCases[i];
        const currentCase = selectedCasesList[i];
        const caseName = String(currentCase?.customer_name || currentCase?.loan_id || `Case ${i + 1}`);

        setProgressData(prev => ({
          ...prev,
          current: i + 1,
          currentItemName: caseName
        }));

        try {
          await customerCaseService.assignCase(caseId, {
            caseId,
            telecallerId: null,
            assignedBy: user?.id || ''
          });
          successCount++;
          setProgressData(prev => ({ ...prev, successCount: successCount }));
        } catch (error) {
          errorCount++;
          errors.push({
            id: caseId,
            name: caseName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          setProgressData(prev => ({ ...prev, errorCount: errorCount, errors }));
        }
      }

      setProgressData(prev => ({ ...prev, isComplete: true }));

      if (successCount > 0) {
        setSelectedCases([]);
        setUnassignReason('');
        loadData();
      }

      setTimeout(() => {
        if (errorCount === 0) {
          setShowProgress(false);
          showNotification({ type: 'success', title: `Successfully unassigned ${successCount} cases` });
        }
      }, 2000);
    } catch (error) {
      console.error('Error unassigning cases:', error);
      showNotification({ type: 'error', title: 'Failed to unassign cases' });
      setShowProgress(false);
    }
  };

  const handleBulkReassign = async () => {
    if (!bulkReassignData.toTeamId || !bulkReassignData.toTelecallerId) {
      showNotification({ type: 'error', title: 'Please select destination team and telecaller' });
      return;
    }

    if (!bulkReassignData.reason.trim()) {
      showNotification({ type: 'error', title: 'Please provide a reason' });
      return;
    }

    const selectedCasesList = cases.filter(c => c.id && selectedCases.includes(c.id));

    cancelOperationRef.current = false;
    setIsCancelling(false);
    setProgressData({
      total: selectedCases.length,
      current: 0,
      successCount: 0,
      errorCount: 0,
      currentItemName: '',
      errors: [],
      isComplete: false
    });
    setShowProgress(true);
    setShowReassignModal(false);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (let i = 0; i < selectedCases.length; i++) {
        if (cancelOperationRef.current) {
          errors.push({
            id: 'cancelled',
            name: 'Operation Cancelled',
            error: `Operation stopped by user. ${selectedCases.length - i} cases remaining.`
          });
          break;
        }

        const caseId = selectedCases[i];
        const currentCase = selectedCasesList[i];
        const caseName = String(currentCase?.customer_name || currentCase?.loan_id || `Case ${i + 1}`);

        setProgressData(prev => ({
          ...prev,
          current: i + 1,
          currentItemName: caseName
        }));

        try {
          await customerCaseService.assignCase(caseId, {
            caseId,
            telecallerId: bulkReassignData.toTelecallerId,
            assignedBy: user?.id || ''
          });
          successCount++;
          setProgressData(prev => ({ ...prev, successCount: successCount }));
        } catch (error) {
          errorCount++;
          errors.push({
            id: caseId,
            name: caseName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          setProgressData(prev => ({ ...prev, errorCount: errorCount, errors }));
        }
      }

      setProgressData(prev => ({ ...prev, isComplete: true }));

      if (successCount > 0) {
        setSelectedCases([]);
        setBulkReassignData({ toTeamId: '', toTelecallerId: '', reason: '' });
        loadData();
      }

      setTimeout(() => {
        if (errorCount === 0) {
          setShowProgress(false);
          showNotification({ type: 'success', title: `Successfully reassigned ${successCount} cases` });
        }
      }, 2000);
    } catch (error) {
      console.error('Error reassigning cases:', error);
      showNotification({ type: 'error', title: 'Failed to reassign cases' });
      setShowProgress(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!deleteReason.trim()) {
      showNotification({ type: 'error', title: 'Please provide a reason' });
      return;
    }

    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      showNotification({ type: 'error', title: 'Please type DELETE to confirm' });
      return;
    }

    const selectedCasesList = cases.filter(c => c.id && selectedCases.includes(c.id));

    cancelOperationRef.current = false;
    setIsCancelling(false);
    setProgressData({
      total: selectedCases.length,
      current: 0,
      successCount: 0,
      errorCount: 0,
      currentItemName: '',
      errors: [],
      isComplete: false
    });
    setShowProgress(true);
    setShowDeleteModal(false);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (let i = 0; i < selectedCases.length; i++) {
        if (cancelOperationRef.current) {
          errors.push({
            id: 'cancelled',
            name: 'Operation Cancelled',
            error: `Operation stopped by user. ${selectedCases.length - i} cases remaining.`
          });
          break;
        }

        const caseId = selectedCases[i];
        const currentCase = selectedCasesList[i];
        const caseName = String(currentCase?.customer_name || currentCase?.loan_id || `Case ${i + 1}`);

        setProgressData(prev => ({
          ...prev,
          current: i + 1,
          currentItemName: caseName
        }));

        try {
          // Check if case is deletable (unassigned or closed)
          // For Team Incharge, we should probably allow deleting their own cases
          // if they are not in progress, but we'll follow simple rules for now.
          if (currentCase?.telecaller_id && currentCase?.case_status !== 'closed' && currentCase?.case_status !== 'resolved') {
            throw new Error('Active cases cannot be deleted');
          }

          await customerCaseService.deleteCase(caseId);
          successCount++;
          setProgressData(prev => ({ ...prev, successCount: successCount }));
        } catch (error) {
          errorCount++;
          errors.push({
            id: caseId,
            name: caseName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          setProgressData(prev => ({ ...prev, errorCount: errorCount, errors }));
        }
      }

      setProgressData(prev => ({ ...prev, isComplete: true }));

      if (successCount > 0) {
        setSelectedCases([]);
        setDeleteReason('');
        setDeleteConfirmText('');
        loadData();
      }

      setTimeout(() => {
        if (errorCount === 0) {
          setShowProgress(false);
          showNotification({ type: 'success', title: `Successfully deleted ${successCount} cases` });
        }
      }, 2000);
    } catch (error) {
      console.error('Error deleting cases:', error);
      showNotification({ type: 'error', title: 'Failed to delete cases' });
      setShowProgress(false);
    }
  };

  const handleCancelOperation = () => {
    cancelOperationRef.current = true;
    setIsCancelling(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Assign Cases</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              All Cases
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'team'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Team View
            </button>
            <button
              onClick={() => setViewMode('telecaller')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'telecaller'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <UserCheck className="w-4 h-4 inline mr-2" />
              Telecaller View
            </button>
          </div>
        </div>

        <FiltersSection
          filters={filters}
          setFilters={setFilters}
          resetFilters={resetFilters}
          teams={teams}
          telecallers={telecallers}
          viewMode={viewMode}
        />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Total Found: <strong>{filteredCases.length}</strong>
            </span>
            {filteredCases.length > 0 && (
              <button
                onClick={handleSelectAllFiltered}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All {filteredCases.length} Cases
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl mb-24">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCases.length === getCurrentPageCases().length && getCurrentPageCases().length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telecaller</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DPD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCurrentPageCases().map((caseItem) => (
                <tr key={caseItem.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(caseItem.id!)}
                      onChange={() => handleSelectCase(caseItem.id!)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{caseItem.loan_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{caseItem.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{caseItem.mobile_no}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{caseItem.team_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{caseItem.telecaller_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${caseItem.case_status === 'closed' ? 'bg-green-100 text-green-800' :
                      caseItem.case_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {caseItem.case_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{caseItem.dpd || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{caseItem.outstanding_amount || '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Cases</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <select
                  value={bulkAssignData.teamId}
                  onChange={(e) => setBulkAssignData({ ...bulkAssignData, teamId: e.target.value, telecallerId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telecaller</label>
                <select
                  value={bulkAssignData.telecallerId}
                  onChange={(e) => setBulkAssignData({ ...bulkAssignData, telecallerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!bulkAssignData.teamId}
                >
                  <option value="">Select Telecaller</option>
                  {telecallers
                    .filter(t => t.team_id === bulkAssignData.teamId)
                    .map(telecaller => (
                      <option key={telecaller.id} value={telecaller.id}>{telecaller.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={bulkAssignData.priority}
                  onChange={(e) => setBulkAssignData({ ...bulkAssignData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkAssign}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Confirm Assign
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Unassign Cases</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Required)</label>
              <textarea
                value={unassignReason}
                onChange={(e) => setUnassignReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter reason for unassigning"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkUnassign}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                Confirm Unassign
              </button>
              <button
                onClick={() => setShowUnassignModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reassign Cases</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Team</label>
                <select
                  value={bulkReassignData.toTeamId}
                  onChange={(e) => setBulkReassignData({ ...bulkReassignData, toTeamId: e.target.value, toTelecallerId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Telecaller</label>
                <select
                  value={bulkReassignData.toTelecallerId}
                  onChange={(e) => setBulkReassignData({ ...bulkReassignData, toTelecallerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!bulkReassignData.toTeamId}
                >
                  <option value="">Select Telecaller</option>
                  {telecallers
                    .filter(t => t.team_id === bulkReassignData.toTeamId)
                    .map(telecaller => (
                      <option key={telecaller.id} value={telecaller.id}>{telecaller.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Required)</label>
                <textarea
                  value={bulkReassignData.reason}
                  onChange={(e) => setBulkReassignData({ ...bulkReassignData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason for reassigning"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkReassign}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Confirm Reassign
              </button>
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCases.length > 0 && (
        <BulkActionToolbar
          selectedCount={selectedCases.length}
          onAssign={() => setShowAssignModal(true)}
          onUnassign={() => setShowUnassignModal(true)}
          onReassign={() => setShowReassignModal(true)}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>Warning:</strong> You are about to delete {selectedCases.length} cases.
              </p>
              <p className="text-xs text-red-700">
                Only unassigned or closed/resolved cases will be deleted. Active in-progress cases will be skipped.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for deletion (Required)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Enter reason for deleting these cases"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Type DELETE in capital letters"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkDelete}
                disabled={!deleteReason.trim() || deleteConfirmText.toUpperCase() !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ProgressModal
        isOpen={showProgress}
        title={
          showAssignModal || bulkAssignData.telecallerId ? 'Assigning Cases' :
            showUnassignModal || unassignReason ? 'Unassigning Cases' :
              'Reassigning Cases'
        }
        operationType={
          showAssignModal || bulkAssignData.telecallerId ? 'assign' :
            showUnassignModal || unassignReason ? 'unassign' :
              showDeleteModal || deleteReason ? 'processing' :
                'reassign'
        }
        totalItems={progressData.total}
        currentItem={progressData.current}
        successCount={progressData.successCount}
        errorCount={progressData.errorCount}
        currentItemName={progressData.currentItemName}
        errors={progressData.errors}
        isComplete={progressData.isComplete}
        isCancelling={isCancelling}
        onCancel={handleCancelOperation}
        onClose={() => setShowProgress(false)}
      />
    </div>
  );
};
