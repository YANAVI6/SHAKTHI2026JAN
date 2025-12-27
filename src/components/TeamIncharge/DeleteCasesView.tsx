import React, { useState, useEffect } from 'react';
import { Search, Trash2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { customerCaseService, CustomerCase } from '../../services/customerCaseService';
import { TeamService } from '../../services/teamService';
import { useNotification } from '../../contexts/NotificationContext';

interface CaseWithSelection extends CustomerCase {
  selected?: boolean;
  telecaller_name?: string;
  team_name?: string;
}

export const DeleteCasesView: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

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
    dateFrom: '',
    dateTo: ''
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [telecallers, setTelecallers] = useState<any[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');



  const loadData = React.useCallback(async () => {
    if (!user?.tenantId || (user.role !== 'CompanyAdmin' && user.role !== 'TeamIncharge')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const teamData = await TeamService.getTeams(user.tenantId);
      const userTeams = user.role === 'CompanyAdmin'
        ? teamData.filter(team => team.status === 'active')
        : teamData.filter(team => team.team_incharge_id === user.id && team.status === 'active');
      setTeams(userTeams);

      let allCases: CustomerCase[] = [];
      for (const team of userTeams) {
        const teamCases = await customerCaseService.getDeletedTeamCases(user.tenantId, team.id);
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

      // Cases are already filtered to deleted status by getDeletedTeamCases
      const deletableCases = allCases;

      const casesWithDetails = deletableCases.map(c => {
        const team = userTeams.find(t => t.id === c.team_id);
        const telecaller = allTelecallers.find(t => t.id === c.telecaller_id);

        return {
          ...c,
          team_name: team?.name || 'N/A',
          telecaller_name: telecaller?.name || 'Unassigned'
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

    if (filters.dateFrom) {
      filtered = filtered.filter(c => c.created_at && c.created_at >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(c => c.created_at && c.created_at <= filters.dateTo + 'T23:59:59');
    }

    setFilteredCases(filtered);
  }, [cases, filters]);

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

    if (selectedCases.length === currentPageIds.length && currentPageIds.length > 0) {
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
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleRestoreClick = () => {
    if (selectedCases.length === 0) {
      showNotification({ type: 'error', title: 'Please select cases to restore' });
      return;
    }
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    try {
      for (const caseId of selectedCases) {
        await customerCaseService.restoreCase(caseId);
      }

      showNotification({ type: 'success', title: `Successfully restored ${selectedCases.length} cases` });
      setShowRestoreModal(false);
      setSelectedCases([]);
      loadData();
    } catch (error) {
      console.error('Error restoring cases:', error);
      showNotification({ type: 'error', title: 'Failed to restore cases' });
    }
  };

  const handlePermanentDeleteClick = () => {
    if (selectedCases.length === 0) {
      showNotification({ type: 'error', title: 'Please select cases to permanently delete' });
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!deleteReason.trim()) {
      showNotification({ type: 'error', title: 'Please provide a reason for permanent deletion' });
      return;
    }

    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      showNotification({ type: 'error', title: 'Please type DELETE to confirm' });
      return;
    }

    try {
      for (const caseId of selectedCases) {
        await customerCaseService.permanentlyDeleteCase(caseId);
      }

      showNotification({ type: 'success', title: `Successfully permanently deleted ${selectedCases.length} cases` });
      setShowDeleteModal(false);
      setDeleteReason('');
      setDeleteConfirmText('');
      setSelectedCases([]);
      loadData();
    } catch (error) {
      console.error('Error permanently deleting cases:', error);
      showNotification({ type: 'error', title: 'Failed to permanently delete cases' });
    }
  };

  if (user?.role !== 'CompanyAdmin' && user?.role !== 'TeamIncharge') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">Only Company Admins and Team Incharge can view deleted cases</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Trash2 className="w-6 h-6 mr-2 text-red-600" />
              Deleted Cases (Recycle Bin)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              View and manage deleted cases. You can restore or permanently delete them.
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Recycle Bin Information</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Deleted cases are stored here temporarily</li>
                <li>You can restore cases back to active status</li>
                <li>Permanent deletion removes cases completely</li>
                <li>All actions are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Loan ID, Customer, Mobile"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={filters.teamId}
                onChange={(e) => setFilters({ ...filters, teamId: e.target.value, telecallerId: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Case Status</label>
              <select
                value={filters.caseStatus}
                onChange={(e) => setFilters({ ...filters, caseStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">All</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              <X className="w-4 h-4 inline mr-2" />
              Reset Filters
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {filteredCases.length} deletable cases | {selectedCases.length} selected
            </span>
            {selectedCases.length > 0 && (
              <button
                onClick={handleSelectAllFiltered}
                className="text-sm text-red-600 hover:underline"
              >
                Select all {filteredCases.length} filtered cases
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>

        {selectedCases.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedCases.length} cases selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRestoreClick}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Restore Selected
                </button>
                <button
                  onClick={handlePermanentDeleteClick}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telecaller</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCurrentPageCases().length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No deletable cases found
                  </td>
                </tr>
              ) : (
                getCurrentPageCases().map((caseItem) => (
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
                    <td className="px-4 py-3 text-sm text-gray-900">{caseItem.team_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{caseItem.telecaller_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${caseItem.case_status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {caseItem.case_status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
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

      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Confirm Restore</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Restore:</strong> You are about to restore {selectedCases.length} cases.
              </p>
              <p className="text-xs text-blue-700">
                These cases will be moved back to active status and will appear in the Assign Cases view.
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleConfirmRestore}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Confirm Restore
              </button>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
              <h3 className="text-lg font-bold text-gray-900">Confirm Permanent Deletion</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>Warning:</strong> You are about to permanently delete {selectedCases.length} cases.
              </p>
              <p className="text-xs text-red-700">
                This action cannot be undone. Cases will be completely removed from the system.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for permanent deletion (Required)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Enter detailed reason for permanently deleting these cases"
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
                onClick={handleConfirmPermanentDelete}
                disabled={!deleteReason.trim() || deleteConfirmText.toUpperCase() !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Permanent Delete
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
    </div>
  );
};
