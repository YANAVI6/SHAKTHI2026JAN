import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, User, DollarSign, MapPin, FileText } from 'lucide-react';
import { customerCaseService } from '../../../services/customerCaseService';
import { TeamService } from '../../../services/teamService';
import { useNotification, notificationHelpers } from '../../shared/Notification';
import { useAuth } from '../../../contexts/AuthContext';
import type { TeamInchargeCase } from '../../../types/caseManagement';
import { ProgressModal } from '../../shared/ProgressModal';

interface AssignCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignCasesModal: React.FC<AssignCasesModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [isLoading, setIsLoading] = useState(false);
  const [allCases, setAllCases] = useState<TeamInchargeCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<TeamInchargeCase[]>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; team_incharge_id: string; status: string; telecallers?: Array<{ id: string; name: string; emp_id: string }> }>>([]);
  const [telecallers, setTelecallers] = useState<Array<{ id: string; name: string; emp_id: string }>>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedTelecallerId, setSelectedTelecallerId] = useState('');
  const [selectedTargetTeamId, setSelectedTargetTeamId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());


  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [actionType, setActionType] = useState<'assign' | 'unassign' | 'change_team' | 'view_only'>('assign');

  // Case View State
  const [selectedCaseForView, setSelectedCaseForView] = useState<TeamInchargeCase | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Progress tracking state
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

  // Load cases for a team
  const loadTeamCases = useCallback(async (teamId: string) => {
    if (!user?.tenantId) {
      console.error('No tenantId available');
      return;
    }

    try {
      setIsLoading(true);
      const cases = await customerCaseService.getTeamCases(user.tenantId, teamId);
      setAllCases(cases);
    } catch (error: unknown) {
      console.error('Error loading team cases:', error);
      showNotification(notificationHelpers.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to load team cases'
      ));
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId, showNotification]);

  const loadInitialData = useCallback(async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      setIsLoading(true);
      const teamData = await TeamService.getTeams(user.tenantId!);
      const userTeams = teamData.filter((team) =>
        team.team_incharge_id === user!.id && team.status === 'active'
      );

      setTeams(userTeams);

      if (userTeams.length > 0) {
        const firstTeam = userTeams[0];
        setSelectedTeam(firstTeam.id);
        setTelecallers(firstTeam.telecallers || []);
        await loadTeamCases(firstTeam.id);
      }
    } catch (error: unknown) {
      console.error('Error loading initial data:', error);
      showNotification(notificationHelpers.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to load initial data'
      ));
    } finally {
      setIsLoading(false);
    }
  }, [user, showNotification, loadTeamCases]);

  const applyFilters = useCallback(() => {
    let filtered = [...allCases];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(case_ =>
        case_.case_data?.customerName?.toString().toLowerCase().includes(searchLower) ||
        case_.case_data?.loanId?.toString().toLowerCase().includes(searchLower) ||
        case_.case_data?.mobileNo?.toString().includes(searchTerm)
      );
    }

    setFilteredCases(filtered);
    setSelectedCases(new Set()); // Clear selections when filters change
  }, [allCases, searchTerm]);

  useEffect(() => {
    if (isOpen && user?.tenantId && user?.id) {
      loadInitialData();
    }
  }, [isOpen, user?.tenantId, user?.id, loadInitialData]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedTelecallerId('');
    setSelectedTargetTeamId('');
    setSearchTerm('');
    setActionType('assign');

    const selectedTeamData = teams.find(t => t.id === teamId);
    setTelecallers(selectedTeamData?.telecallers || []);

    await loadTeamCases(teamId);
  };

  const handleCaseSelect = (caseId: string) => {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  };

  const handleSelectAll = () => {
    // Only select currently visible cases (limit to 500 as per slicing)
    const visibleCases = applicableCases.slice(0, 500);
    const visibleCaseIds = visibleCases.map(c => c.id);

    // Check if all visible cases are currently selected
    const allVisibleSelected = visibleCaseIds.length > 0 && visibleCaseIds.every(id => selectedCases.has(id));

    const newSelected = new Set(selectedCases);

    if (allVisibleSelected) {
      // Unselect all visible
      visibleCaseIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all visible
      visibleCaseIds.forEach(id => newSelected.add(id));
    }
    setSelectedCases(newSelected);
  };

  const handleBulkAssignment = async () => {
    if (actionType === 'assign' && (!selectedTelecallerId || selectedCases.size === 0)) {
      showNotification(notificationHelpers.error('Missing Data', 'Please select a telecaller and at least one case'));
      return;
    }
    if (actionType === 'unassign' && selectedCases.size === 0) {
      showNotification(notificationHelpers.error('Missing Data', 'Please select at least one case to unassign'));
      return;
    }
    if (actionType === 'change_team' && (!selectedTargetTeamId || selectedCases.size === 0)) {
      showNotification(notificationHelpers.error('Missing Data', 'Please select a new team and at least one case'));
      return;
    }

    const selectedCaseIds = Array.from(selectedCases);
    const casesList = allCases.filter(c => selectedCaseIds.includes(c.id));

    cancelOperationRef.current = false;
    setIsCancelling(false);
    setProgressData({
      total: selectedCaseIds.length,
      current: 0,
      successCount: 0,
      errorCount: 0,
      currentItemName: '',
      errors: [],
      isComplete: false
    });
    setShowProgress(true);

    try {
      setIsLoading(true);

      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (let i = 0; i < selectedCaseIds.length; i++) {
        if (cancelOperationRef.current) {
          errors.push({
            id: 'cancelled',
            name: 'Operation Cancelled',
            error: `Operation stopped by user. ${selectedCaseIds.length - i} cases remaining.`
          });
          break;
        }

        const caseId = selectedCaseIds[i];
        const currentCase = casesList[i];
        const caseName = String(currentCase?.case_data?.customerName || currentCase?.case_data?.loanId || `Case ${i + 1}`);

        setProgressData(prev => ({
          ...prev,
          current: i + 1,
          currentItemName: caseName
        }));

        try {
          if (actionType === 'assign') {
            await customerCaseService.assignCase(caseId, { caseId, telecallerId: selectedTelecallerId, assignedBy: user!.id });
          } else if (actionType === 'unassign') {
            await customerCaseService.assignCase(caseId, { caseId, telecallerId: null, assignedBy: user!.id });
          } else if (actionType === 'change_team') {
            await customerCaseService.updateCase(caseId, { team_id: selectedTargetTeamId });
          }
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
        await loadTeamCases(selectedTeam);
        onSuccess();
      }

      setTimeout(() => {
        if (errorCount === 0) {
          setShowProgress(false);
          showNotification(notificationHelpers.success('Operation Complete', `Successfully processed ${successCount} cases`));
        }
      }, 2000);
    } catch (error: unknown) {
      console.error('Bulk operation error:', error);
      showNotification(notificationHelpers.error('Operation Failed', error instanceof Error ? error.message : 'Failed to process cases'));
      setShowProgress(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to delete this case? This cannot be undone.')) return;
    try {
      setIsLoading(true);
      await customerCaseService.deleteCase(caseId);
      showNotification(notificationHelpers.success('Case Deleted', 'Case has been successfully deleted'));
      await loadTeamCases(selectedTeam);
      onSuccess();
    } catch (error: unknown) {
      console.error('Delete case error:', error);
      showNotification(notificationHelpers.error('Delete Failed', error instanceof Error ? error.message : 'Failed to delete case'));
    } finally {
      setIsLoading(false);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCaseDetails = () => {
    if (!selectedCaseForView) return null;
    const details = selectedCaseForView.case_data || {};

    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l border-gray-200 overflow-y-auto mt-16 sm:mt-0">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="text-xl font-bold text-gray-900">Case Details</h3>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Case ID</span>
                  <p className="font-semibold text-gray-900">{String(selectedCaseForView.loan_id || details.loanId || selectedCaseForView.case_data.loan_id || 'N/A')}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-2 ${(selectedCaseForView.case_status === 'closed' || selectedCaseForView.case_status === 'resolved') ? 'bg-green-100 text-green-800' :
                    selectedCaseForView.case_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedCaseForView.case_status?.replace('_', ' ') || 'New'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Product</span>
                  <p className="font-medium text-gray-900">{selectedCaseForView.product_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Date</span>
                  <p className="text-sm text-gray-900">{formatDate(selectedCaseForView.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" /> Customer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium text-gray-600">Name:</span> <span className="ml-1">{String(selectedCaseForView.customer_name || details.customerName || details.customer_name || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">Mobile:</span> <span className="ml-1">{String(selectedCaseForView.mobile_no || details.mobileNo || details.mobile_no || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">Email:</span> <span className="ml-1">{String(selectedCaseForView.email || details.email || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">Alt Mobile:</span> <span className="ml-1">{String(selectedCaseForView.alternate_number || details.alternateNo || details.alternate_number || 'N/A')}</span></div>
              </div>
            </div>

            {/* Financial Info */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" /> Financial Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50 p-4 rounded-lg">
                <div><span className="font-medium text-gray-600">Loan Amount:</span> <span className="ml-1">{String(selectedCaseForView.loan_amount || details.loanAmount || details.loan_amount || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">Outstanding:</span> <span className="ml-1">{String(selectedCaseForView.outstanding_amount || details.outstandingAmount || details.outstanding_amount || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">EMI Amount:</span> <span className="ml-1">{String(selectedCaseForView.emi_amount || details.emiAmount || details.emi_amount || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">DPD:</span> <span className="ml-1">{String(selectedCaseForView.dpd || details.dpd || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">POS:</span> <span className="ml-1">{String(selectedCaseForView.pos_amount || details.pos || details.pos_amount || 'N/A')}</span></div>
                <div><span className="font-medium text-gray-600">Paid Amount:</span> <span className="ml-1">{String(selectedCaseForView.last_paid_amount || details.lastPaidAmount || details.last_paid_amount || 'N/A')}</span></div>
              </div>
            </div>

            {/* Location Info */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> Location
              </h4>
              <div className="text-sm space-y-2">
                <p><span className="font-medium text-gray-600">Address:</span> {String(selectedCaseForView.address || details.address || 'N/A')}</p>
                <p><span className="font-medium text-gray-600">City/State:</span> {String(selectedCaseForView.city || details.city || 'N/A')}, {String(selectedCaseForView.state || details.state || 'N/A')} - {String(selectedCaseForView.pincode || details.pincode || 'N/A')}</p>
              </div>
            </div>

            {/* System/Meta Info */}
            <div>
              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" /> System Info
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Created: {formatDate(selectedCaseForView.created_at)}</div>
                <div>Last Updated: {formatDate(selectedCaseForView.updated_at)}</div>
                <div>Telecaller: {selectedCaseForView.telecaller?.name || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleBulkDelete = async () => {
    if (selectedCases.size === 0) return;

    setShowBulkDeleteConfirm(false);

    const selectedCaseIds = Array.from(selectedCases);
    const casesList = allCases.filter(c => selectedCaseIds.includes(c.id));

    cancelOperationRef.current = false;
    setIsCancelling(false);
    setProgressData({
      total: selectedCaseIds.length,
      current: 0,
      successCount: 0,
      errorCount: 0,
      currentItemName: '',
      errors: [],
      isComplete: false
    });
    setShowProgress(true);

    try {
      setIsLoading(true);

      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ id: string; name: string; error: string }> = [];

      for (let i = 0; i < selectedCaseIds.length; i++) {
        if (cancelOperationRef.current) {
          errors.push({
            id: 'cancelled',
            name: 'Operation Cancelled',
            error: `Operation stopped by user. ${selectedCaseIds.length - i} cases remaining.`
          });
          break;
        }

        const caseId = selectedCaseIds[i];
        const currentCase = casesList[i];
        const caseName = String(currentCase?.case_data?.customerName || currentCase?.case_data?.loanId || `Case ${i + 1}`);

        setProgressData(prev => ({
          ...prev,
          current: i + 1,
          currentItemName: caseName
        }));

        try {
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
        await loadTeamCases(selectedTeam);
        setSelectedCases(new Set());
        onSuccess();
      }

      setTimeout(() => {
        if (errorCount === 0) {
          setShowProgress(false);
          showNotification(notificationHelpers.success('Bulk Delete Complete', `Successfully deleted ${successCount} cases`));
        }
      }, 2000);
    } catch (error: unknown) {
      console.error('Bulk delete error:', error);
      showNotification(notificationHelpers.error('Bulk Delete Failed', error instanceof Error ? error.message : 'Failed to delete cases'));
      setShowProgress(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOperation = () => {
    cancelOperationRef.current = true;
    setIsCancelling(true);
  };

  const resetModal = () => {
    setAllCases([]);
    setFilteredCases([]);
    setTeams([]);
    setTelecallers([]);
    setSelectedTeam('');
    setSelectedTelecallerId('');
    setSelectedTargetTeamId('');
    setSearchTerm('');
    setSelectedCases(new Set());


    setShowBulkDeleteConfirm(false);
    setActionType('assign');
    setSelectedCaseForView(null);
    setIsDetailsOpen(false);
    cancelOperationRef.current = false;
    setIsCancelling(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Filter cases based on action type
  const getApplicableCases = () => {
    let result = filteredCases;
    if (actionType === 'assign') {
      result = filteredCases.filter(case_ => !case_.telecaller_id);
    } else if (actionType === 'unassign') {
      result = filteredCases.filter(case_ => case_.telecaller_id);
    } else if (actionType === 'view_only') {
      if (selectedTelecallerId) {
        result = filteredCases.filter(case_ => case_.telecaller_id === selectedTelecallerId);
      } else {
        // If no telecaller selected in view_only, showing all cases for the team is fine
        requestAnimationFrame(() => { }); // no-op
      }
    }
    return result;
  };

  const applicableCases = getApplicableCases();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden border-2 border-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Case Management Hub</h3>
            <p className="text-sm text-gray-500">
              {selectedTeam && teams.find(t => t.id === selectedTeam)?.name}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={selectedTeam}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="border p-2 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value as 'assign' | 'unassign' | 'change_team' | 'view_only');
                setSelectedTelecallerId('');
                setSelectedTargetTeamId('');
                setSelectedCases(new Set());
              }}
              className="border p-2 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="assign">Assign Cases</option>
              <option value="unassign">Unassign Cases</option>
              <option value="change_team">Change Team</option>
              <option value="view_only">View / Delete (Incharge)</option>
            </select>

            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border p-2 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 mt-1 ml-1">Changing filters clears current selections</span>
            </div>

            {actionType === 'change_team' ? (
              <select
                value={selectedTargetTeamId}
                onChange={(e) => setSelectedTargetTeamId(e.target.value)}
                className="border p-2 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Target Team</option>
                {teams.filter(t => t.id !== selectedTeam).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            ) : (
              <select
                value={selectedTelecallerId}
                onChange={(e) => setSelectedTelecallerId(e.target.value)}
                className="border p-2 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {actionType === 'view_only' ? 'Filter by Telecaller' : 'Select Target Telecaller'}
                </option>
                {telecallers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-700">
              Showing <b>{applicableCases.length}</b> cases
              {selectedCases.size > 0 && <span> | <b>{selectedCases.size}</b> selected</span>}
            </div>

            <div className="space-x-2">
              {actionType === 'view_only' && selectedTelecallerId && applicableCases.length > 0 && (
                <button
                  onClick={() => {
                    // Auto-select all applicable cases for bulk delete
                    setSelectedCases(new Set(applicableCases.map(c => c.id)));
                    setShowBulkDeleteConfirm(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium shadow-sm transition-colors"
                >
                  Delete All {applicableCases.length} Cases
                </button>
              )}

              {actionType !== 'view_only' && (
                <button
                  onClick={handleBulkAssignment}
                  disabled={selectedCases.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 shadow-sm transition-colors"
                >
                  Execute {actionType === 'assign' ? 'Assign' : actionType === 'unassign' ? 'Unassign' : 'Move'} ({selectedCases.size})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Delete Confirm Modal Overlay */}
        {showBulkDeleteConfirm && (
          <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl border border-red-200 max-w-sm text-center">
              <h4 className="text-xl font-bold text-red-600 mb-2">Confirm Bulk Delete</h4>
              <p className="mb-4 text-gray-700">Are you sure you want to delete {applicableCases.length} cases? This action CANNOT be undone.</p>
              <div className="flex justify-center space-x-3">
                <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                <button onClick={handleBulkDelete} disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  {isLoading ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          <div className="bg-white rounded border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        applicableCases.length > 0 &&
                        applicableCases.slice(0, 500).every(c => selectedCases.has(c.id))
                      }
                    />
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {applicableCases.slice(0, 500).map((case_) => {
                  const details = case_.case_data || {};
                  return (
                    <tr key={case_.id} className={`hover:bg-blue-50 transition-colors ${selectedCases.has(case_.id) ? 'bg-blue-50' : ''}`}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCases.has(case_.id)}
                          onChange={() => handleCaseSelect(case_.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-sm text-gray-900">{String(details.customerName || '-')}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{String(details.loanId)} | {String(details.mobileNo)}</div>
                        <div className="text-xs text-purple-600 mt-1">{case_.product_name}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {case_.telecaller ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {case_.telecaller.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(case_.case_status === 'closed' || case_.case_status === 'resolved') ? 'bg-green-100 text-green-800' :
                          case_.case_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            case_.telecaller_id ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {case_.case_status?.replace('_', ' ') || (case_.telecaller_id ? 'assigned' : 'new')}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <button
                          onClick={() => {
                            setSelectedCaseForView(case_);
                            setIsDetailsOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-xs font-medium border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors mr-2"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteCase(case_.id)}
                          className="text-red-600 hover:text-red-900 text-xs font-medium border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {applicableCases.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No cases found matching your criteria.</td></tr>
                )}
                {applicableCases.length > 500 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-gray-500 text-sm bg-gray-50">
                      Showing first 500 of {applicableCases.length} cases. Use filters to narrow down results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Detail View Slide-over */}
      {
        isDetailsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop for the details view */}
            <div
              className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm transition-opacity"
              onClick={() => setIsDetailsOpen(false)}
            />
            {renderCaseDetails()}
          </div>
        )
      }

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgress}
        title={
          actionType === 'assign' ? 'Assigning Cases' :
            actionType === 'unassign' ? 'Unassigning Cases' :
              actionType === 'change_team' ? 'Moving Cases to New Team' :
                'Processing Cases'
        }
        operationType={actionType === 'change_team' ? 'reassign' : actionType === 'view_only' ? 'processing' : actionType}
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
    </div >
  );
};