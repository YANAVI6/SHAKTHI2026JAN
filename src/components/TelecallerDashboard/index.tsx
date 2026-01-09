import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Settings,
  Phone,
  PhoneCall,
  MapPin,
  User as UserIcon,
  Briefcase,
  FileText,
  BarChart3,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';

// Services & Global State
import { User } from '../../contexts/AuthContext';
import { useChannels } from '../../hooks/useChannels';
import { useTenantName } from '../../hooks/useTenantName';
import { customerCaseService, CustomerCase as ServiceCustomerCase } from '../../services/customerCaseService';
import { TelecallerTargetService } from '../../services/telecallerTargetService';
import { DashboardNotification } from '../../services/notificationService';
import { TeamService } from '../../services/teamService';
import { employeeService } from '../../services/employeeService';
import { AlertCase } from '../../services/alertService';
import { useNotification, notificationHelpers } from '../shared/Notification';
import { CelebrationProvider } from '../../contexts/CelebrationContext';

// Components & UI
import Layout from '../Layout';
import { ChatPanel } from '../Chat/ChatPanel';
import CustomerCaseTable from './CustomerCaseTable';
import { ReportsDashboard } from './ReportsDashboard';
import { NotificationsDrawer } from './NotificationsDrawer';
import { EditProfileModal } from './EditProfileModal';
import { CaseDetailsModal } from './CaseDetailsModal';
import { CallLogModal, CallLogData } from './CallLogModal';
import { StatusUpdateModal } from './StatusUpdateModal';
import { PaymentCelebration } from './PaymentCelebration';
import { CaseFieldModal } from './CaseFieldModal';
import { AlertButton } from './AlertButton';
import { AlertsDrawer } from './AlertsDrawer';
import { TelecallerNotificationView } from './TelecallerNotificationView';
import { PTPAlertSection } from '../shared/reports/PTPAlertSection';
import { CallbackAlertSection } from '../shared/reports/CallbackAlertSection';
import { CallsPerformanceCard } from './CallsPerformanceCard';
import { CollectionsSummaryCard } from './CollectionsSummaryCard';
import { CasesStatusOverviewCard } from './CasesStatusOverviewCard';
import { TeamToppersCard } from './TeamToppersCard';
import { TeamSelector } from './TeamSelector';
import { PTPNotificationManager } from './PTPNotificationManager';
import ToastContainer from './ToastContainer';
import { useToast } from './hooks';
import { PerformanceMetrics, TelecallerTarget } from '../../services/telecallerTargetService';
import { BreakManager } from './BreakManager';
import { CallResponseUploadModal } from './CallResponseUploadModal';

// Types & Utilities
import { CustomerCase as DashboardCustomerCase } from './types';
import { mapServiceCaseToDashboardCase } from '../../utils/caseMapper';
import type { TeamInchargeCase } from '../../types/caseManagement';

interface TelecallerDashboardProps {
  user: User & { empId: string };
  onLogout: () => void;
}

export const TelecallerDashboard: React.FC<TelecallerDashboardProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    dob: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    avatarUrl: ''
  });

  // Load profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (user.id) {
        try {
          const emp = await employeeService.getEmployeeById(user.id);
          if (emp) {
            setProfileData({
              name: emp.name,
              email: emp.email || '',
              phone: emp.mobile,
              dob: emp.dob || '',
              gender: emp.gender || '',
              address: emp.address || '',
              city: emp.city || '',
              state: emp.state || '',
              avatarUrl: emp.avatarUrl || ''
            });
          }
        } catch (err) {
          console.error('Failed to fetch profile', err);
        }
      }
    };
    fetchProfile();
  }, [user.id]);

  /* Pagination & Filter State */
  const [currPage, setCurrPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCases, setTotalCases] = useState(0);
  const [filters, setFilters] = useState<{ searchTerm: string; dpd: string; callResponse: string; sortBy: string; sortOrder: 'asc' | 'desc' }>({
    searchTerm: '',
    dpd: 'all',
    callResponse: 'all',
    sortBy: 'dpd',
    sortOrder: 'desc'
  });

  const [customerCases, setCustomerCases] = useState<ServiceCustomerCase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    assignedCases: 0,
    callsToday: 0,
    recoveryToday: 0,
    pendingFollowups: 0
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  // ... (Keep existing state for modals, etc.)
  const [selectedCase, setSelectedCase] = useState<DashboardCustomerCase | null>(null);
  const [isCaseDetailsOpen, setIsCaseDetailsOpen] = useState(false);
  const [isCallLogOpen, setIsCallLogOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [currentAlerts, setCurrentAlerts] = useState<AlertCase[]>([]);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isCaseFieldModalOpen, setIsCaseFieldModalOpen] = useState(false);
  const [casesWithPendingFollowups, setCasesWithPendingFollowups] = useState<string[]>([]);
  const [showPendingFollowupsOnly, setShowPendingFollowupsOnly] = useState(false);
  const [viewedCases, setViewedCases] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [lastUpdateTimestamp] = useState(Date.now());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    dailyCalls: 0,
    weeklyCalls: 0,
    monthlyCalls: 0,
    dailyCollections: 0,
    weeklyCollections: 0,
    monthlyCollections: 0
  });
  const [targets, setTargets] = useState<TelecallerTarget | null>(null);
  const [teamToppers, setTeamToppers] = useState<{ name: string; callsDoneToday: number; collectionAmount: number; ptpSuccessPercent: number }[]>([]);
  const [caseStatusMetrics, setCaseStatusMetrics] = useState({
    total: 0,
    new: 0,
    assigned: 0,
    inProgress: 0,
    closed: 0
  });

  const { showNotification } = useNotification();
  const { tenantName } = useTenantName(user.tenantId || '');
  const { unreadCounts } = useChannels(user.id, user.tenantId || '');
  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  const toast = useToast();

  const handleOpenAlerts = () => {
    setActiveSection('ptp-alerts');
  };
  // ... (Other hooks)

  const loadTargetsAndPerformance = useCallback(async () => {
    try {
      if (!user.id) return;
      const [target, performance] = await Promise.all([
        TelecallerTargetService.getTargetByTelecallerId(user.id),
        TelecallerTargetService.getPerformanceMetrics(user.id)
      ]);

      if (target) {
        setTargets(target);
      }

      setPerformanceMetrics(performance);

      // Update metrics with daily calls
      setMetrics(prev => ({
        ...prev,
        callsToday: performance.dailyCalls
      }));
    } catch (error) {
      console.error('Error loading targets and performance:', error);
    }
  }, [user.id]);

  const loadDashboardStats = useCallback(async () => {
    try {
      if (!user.tenantId || !user.empId || !selectedTeamId) return;

      // OPTIMIZED: Get accurate counts separately
      const stats = await customerCaseService.getTelecallerDashboardStats(user.tenantId, user.empId, selectedTeamId);
      const dashboardMetrics = await customerCaseService.getDashboardMetrics(user.tenantId, user.empId, selectedTeamId);

      setCaseStatusMetrics(dashboardMetrics.caseStatus);

      // Fetch IDs of pending followups to know count and for filtering
      const casesWithFollowups = await customerCaseService.getCasesWithPendingFollowups(user.tenantId, user.empId, selectedTeamId);
      setCasesWithPendingFollowups(casesWithFollowups);
      const pendingFollowupsCount = casesWithFollowups.length; // accurate count

      setMetrics({
        assignedCases: stats.assignedCases, // Correct total assigned
        callsToday: stats.callsToday,
        recoveryToday: stats.recoveryToday,
        pendingFollowups: pendingFollowupsCount
      });

      // Fetch team toppers
      const toppers = await TeamService.getTeamToppers(selectedTeamId);
      setTeamToppers(toppers);

      await loadTargetsAndPerformance();
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }, [user.tenantId, user.empId, selectedTeamId, loadTargetsAndPerformance]);

  const loadCases = useCallback(async (silent: boolean = false) => {
    try {
      if (!user.tenantId || !user.empId || !selectedTeamId) return;
      if (!silent) setIsLoading(true);

      // Prepare filters
      const serviceFilters: Record<string, unknown> = {
        search: filters.searchTerm,
        dpd: filters.dpd,
        callStatus: filters.callResponse, // Note: server uses 'callStatus'
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        allowedIds: showPendingFollowupsOnly ? casesWithPendingFollowups : undefined
      };

      const result = await customerCaseService.getTelecallerCasesPaginated(
        user.tenantId,
        user.empId,
        selectedTeamId,
        currPage,
        itemsPerPage,
        serviceFilters
      );

      setCustomerCases(result.cases);
      setTotalCases(result.total);

      // Load viewed status for these cases
      // Optimization: fetch viewed status only for visible ids? Currently `getViewedCaseIds` fetches all.
      // For now keep fetching all or optimize later.
      const viewed = await customerCaseService.getViewedCaseIds(user.id);
      setViewedCases(viewed);

    } catch (error) {
      console.error('Error loading cases:', error);
      showNotification(notificationHelpers.error('Error', 'Failed to load cases'));
    } finally {
      setIsLoading(false);
    }
  }, [user.tenantId, user.empId, selectedTeamId, currPage, itemsPerPage, filters, showPendingFollowupsOnly, casesWithPendingFollowups, showNotification, user.id]);

  // Load teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user.tenantId) return;
      try {
        setIsLoadingTeams(true);
        const fetchedTeams = await TeamService.getTeams(user.tenantId);
        setTeams(fetchedTeams);
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setIsLoadingTeams(false);
      }
    };
    fetchTeams();
  }, [user.tenantId]);

  // Initial Load (Teams -> Stats -> Cases)
  useEffect(() => {
    if (user.id && !selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, user.id, selectedTeamId]);

  // When team changes or user loads, fetch Stats
  useEffect(() => {
    if (selectedTeamId) {
      loadDashboardStats();
    }
  }, [selectedTeamId, loadDashboardStats]);

  // When filters/page change, fetch Cases
  useEffect(() => {
    if (selectedTeamId) {
      loadCases();
    }
  }, [loadCases, selectedTeamId]); // Dependencies are included in loadCases definition logic

  // ... (Handlers)

  const handleStatusUpdate = async (caseId: string, newStatus: string, notes?: string) => {
    // ... same logic ...
    await customerCaseService.updateCase(caseId, { case_status: newStatus, ...(notes && { notes }) });
    // Refresh
    loadCases(true);
    loadDashboardStats();
  };

  const menuItems = [
    { name: 'My Workboard', icon: Briefcase, active: activeSection === 'dashboard', onClick: () => setActiveSection('dashboard') },
    { name: 'My Cases', icon: FileText, active: activeSection === 'cases', onClick: () => setActiveSection('cases') },
    { name: 'Bulk Call Update', icon: FileSpreadsheet, active: activeSection === 'bulk-upload', onClick: () => setActiveSection('bulk-upload') },
    { name: 'Reports', icon: BarChart3, active: activeSection === 'reports', onClick: () => setActiveSection('reports') },
    { name: 'PTP Alerts', icon: Bell, active: activeSection === 'ptp-alerts', onClick: () => setActiveSection('ptp-alerts') },
    { name: 'Callback Alerts', icon: PhoneCall, active: activeSection === 'callback-alerts', onClick: () => setActiveSection('callback-alerts') },
    { name: 'Profile', icon: Settings, active: activeSection === 'profile', onClick: () => setActiveSection('profile') },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Dashboard content with metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-600">Assigned Cases</h4>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.assignedCases}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-600">Calls Today</h4>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.callsToday}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-600">Recovery Today</h4>
                <p className="text-3xl font-bold text-gray-900 mt-2">₹{metrics.recoveryToday.toLocaleString()}</p>
              </div>
              <div
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 cursor-pointer hover:shadow-md transition"
                onClick={() => {
                  setShowPendingFollowupsOnly(true);
                  setActiveSection('cases');
                }}
              >
                <h4 className="text-sm font-medium text-gray-600">Pending Followups</h4>
                <p className="text-3xl font-bold text-orange-600 mt-2">{metrics.pendingFollowups}</p>
              </div>
            </div>

            {/* Performance Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <CallsPerformanceCard
                  performanceData={{
                    dailyCalls: { current: performanceMetrics.dailyCalls, target: targets?.daily_calls_target || 0 },
                    weeklyCalls: { current: performanceMetrics.weeklyCalls, target: targets?.weekly_calls_target || 0 },
                    monthlyCalls: { current: performanceMetrics.monthlyCalls, target: targets?.monthly_calls_target || 0 }
                  }}
                />
              </div>
              <div className="lg:col-span-1">
                <CollectionsSummaryCard
                  performanceData={{
                    dailyCollections: {
                      collected: performanceMetrics.dailyCollections,
                      target: targets?.daily_collections_target || 0,
                      progress: targets?.daily_collections_target ? Math.round((performanceMetrics.dailyCollections / targets.daily_collections_target) * 100) : 0
                    },
                    weeklyCollections: {
                      collected: performanceMetrics.weeklyCollections,
                      target: targets?.weekly_collections_target || 0,
                      progress: targets?.weekly_collections_target ? Math.round((performanceMetrics.weeklyCollections / targets.weekly_collections_target) * 100) : 0
                    },
                    monthlyCollections: {
                      collected: performanceMetrics.monthlyCollections,
                      target: targets?.monthly_collections_target || 0,
                      progress: targets?.monthly_collections_target ? Math.round((performanceMetrics.monthlyCollections / targets.monthly_collections_target) * 100) : 0
                    }
                  }}
                />
              </div>
              <div className="lg:col-span-1">
                <CasesStatusOverviewCard
                  customerCases={customerCases}
                  caseStatusMetrics={caseStatusMetrics}
                />
              </div>
              <div className="lg:col-span-1">
                <TeamToppersCard
                  toppers={teamToppers}
                />
              </div>
            </div>
          </div>
        );
      case 'cases':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">My Cases</h3>
                <p className="text-sm text-gray-600 mt-1">Manage and track your assigned loan recovery cases</p>
              </div>
            </div>

            <CustomerCaseTable
              filters={filters}
              onFilterChange={(newFilters) => setFilters(newFilters)}
              totalCount={totalCases}
              currentPage={currPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrPage}
              onPageSizeChange={setItemsPerPage}

              showPendingFollowupsOnly={showPendingFollowupsOnly}
              onClearFollowupFilter={() => {
                setShowPendingFollowupsOnly(false);
                setCurrPage(1);
              }}
              viewedCases={viewedCases}
              customerCases={customerCases.map(mapServiceCaseToDashboardCase)} // Map server data to UI model
              columnConfigs={[
                { id: 1, columnName: 'customerName', displayName: 'Customer Name', isActive: true },
                { id: 2, columnName: 'loanId', displayName: 'Loan ID', isActive: true },
                { id: 3, columnName: 'mobileNo', displayName: 'Mobile', isActive: true },
                { id: 4, columnName: 'dpd', displayName: 'DPD', isActive: true },
                { id: 5, columnName: 'outstandingAmount', displayName: 'Outstanding', isActive: true },
                { id: 6, columnName: 'emiAmount', displayName: 'EMI Amount', isActive: true },
                { id: 7, columnName: 'lastPaidDate', displayName: 'Last Paid', isActive: true },
                { id: 8, columnName: 'latestCallStatus', displayName: 'Call Response', isActive: true }
              ]}
              isLoading={isLoading}
              tenantId={user.tenantId!}
              empId={user.empId!}
              onViewDetails={(caseData) => {
                setSelectedCase(caseData);
                setIsCaseDetailsOpen(true);
                if (caseData.id) {
                  customerCaseService.markCaseAsViewed(caseData.id, user.id);
                  setViewedCases(prev => new Set(prev).add(caseData.id));
                }
              }}
              onCallCustomer={(caseData) => {
                setSelectedCase(caseData);
                setIsCallLogOpen(true);
                if (caseData.id) {
                  customerCaseService.markCaseAsViewed(caseData.id, user.id);
                  setViewedCases(prev => new Set(prev).add(caseData.id));
                }
              }}
            />
          </div>
        );

      case 'bulk-upload':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
              <div className="flex items-center gap-6 mb-8">
                <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Bulk Call Updates</h3>
                  <p className="text-gray-600 mt-1">Efficiency boost! Update multiple call records at once using Excel.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-900 mb-2">Step 1: Get Demo File</h4>
                  <p className="text-sm text-gray-600 mb-4">Ensure your data matches our format for seamless updates.</p>
                  <button
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Open Upload Wizard
                  </button>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-gray-900 mb-2">Step 2: Upload & Verify</h4>
                  <p className="text-sm text-gray-600 mb-4">Our system will verify Loan IDs before applying any changes.</p>
                  <button
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    <Upload className="w-4 h-4" />
                    Start Bulk Update
                  </button>
                </div>
              </div>

              <div className="p-6 border border-amber-100 bg-amber-50 rounded-2xl">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-900">Important Note</h5>
                    <p className="text-sm text-amber-800 mt-1">
                      You can only update cases that are currently assigned to you. Loan IDs belonging to other telecallers will be skipped for security.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'reports':
        return <ReportsDashboard />;
      case 'notifications':
        return (
          <TelecallerNotificationView
            notifications={notifications}
            setNotifications={setNotifications}
            onOpenAlerts={handleOpenAlerts}
          />
        );
      case 'ptp-alerts':
        return (
          <PTPAlertSection
            user={user}
            teamId={selectedTeamId}
            onCaseClick={(caseItem) => {
              const details = (caseItem.case_data as Record<string, unknown>) || {};
              const getValue = (keys: string[]) => {
                for (const key of keys) {
                  const val = details[key] || caseItem[key as keyof typeof caseItem];
                  if (val !== undefined && val !== null && val !== '') return String(val);
                }
                return '';
              };

              const mappedCase: DashboardCustomerCase = {
                id: caseItem.id || '',
                tenant_id: user.tenantId || '',
                customerName: caseItem.customer_name || getValue(['customerName', 'Customer Name']) || '',
                loanId: caseItem.loan_id || getValue(['loanId', 'loanNumber', 'Loan ID']) || '',
                mobileNo: caseItem.mobile_no || getValue(['mobileNo', 'mobileNumber', 'Mobile Number']) || '',
                dpd: caseItem.dpd || Number(getValue(['dpd', 'DPD'])) || 0,
                outstandingAmount: caseItem.outstanding_amount || getValue(['totalOutstanding', 'outstandingAmount', 'TOTAL OUTSTANDING', 'Total Outstanding', 'pos', 'posAmount']) || '',
                emiAmount: caseItem.emi_amount || getValue(['emi', 'emiAmount', 'EMI']) || '',
                lastPaidDate: caseItem.last_paid_date || getValue(['lastPaymentDate', 'lastPaidDate', 'LAST PAYMENT DATE']) || '',
                loanAmount: caseItem.loan_amount || getValue(['loanAmount', 'Loan Amount']) || '',
                posAmount: caseItem.pos_amount || getValue(['pos', 'posAmount', 'POS']) || '',
                pendingDues: caseItem.pending_dues || '',
                paymentLink: caseItem.payment_link || getValue(['paymentLink', 'Payment Link']) || '',
                alternateNumber: caseItem.alternate_number || getValue(['alternateNumber', 'Alternate Number']) || '',
                sanctionDate: caseItem.sanction_date || getValue(['loanCreatedAt', 'sanctionDate', 'LOAN CREATED AT']) || '',
                lastPaidAmount: caseItem.last_paid_amount || getValue(['lastPaymentAmount', 'lastPaidAmount', 'LAST PAYMENT AMOUNT']) || '',
                branchName: caseItem.branch_name || '',
                loanType: caseItem.loan_type || getValue(['loanType', 'Loan Type']) || '',
                caseStatus: caseItem.case_status || '',
                address: caseItem.address || getValue(['address', 'Address']) || '',
                email: caseItem.email || getValue(['email', 'Email']) || '',
                latest_call_status: caseItem.latest_call_status,
                latest_ptp_date: caseItem.latest_ptp_date,
                remarks: caseItem.remarks || '',
                total_collected_amount: caseItem.total_collected_amount || 0,
              };

              setSelectedCase(mappedCase);
              setIsCaseDetailsOpen(true);

              if (caseItem.id && user.id) {
                customerCaseService.markCaseAsViewed(caseItem.id, user.id);
                setViewedCases(prev => new Set(prev).add(caseItem.id!));
              }
            }}
          />
        );
      case 'callback-alerts':
        return (
          <CallbackAlertSection
            user={user}
            teamId={selectedTeamId}
            onCaseClick={(caseItem) => {
              const details = (caseItem.case_data as Record<string, unknown>) || {};
              const getValue = (keys: string[]) => {
                for (const key of keys) {
                  const val = details[key] || (caseItem as unknown as Record<string, unknown>)[key];
                  if (val !== undefined && val !== null && val !== '') return String(val);
                }
                return '';
              };

              const mappedCase: DashboardCustomerCase = {
                id: caseItem.id || '',
                tenant_id: user.tenantId || '',
                customerName: caseItem.customer_name || getValue(['customerName', 'Customer Name']) || '',
                loanId: caseItem.loan_id || getValue(['loanId', 'loanNumber', 'Loan ID']) || '',
                mobileNo: caseItem.mobile_no || getValue(['mobileNo', 'mobileNumber', 'Mobile Number']) || '',
                dpd: caseItem.dpd || Number(getValue(['dpd', 'DPD'])) || 0,
                outstandingAmount: caseItem.outstanding_amount || getValue(['totalOutstanding', 'outstandingAmount', 'TOTAL OUTSTANDING', 'Total Outstanding', 'pos', 'posAmount']) || '',
                emiAmount: caseItem.emi_amount || getValue(['emi', 'emiAmount', 'EMI']) || '',
                lastPaidDate: caseItem.last_paid_date || getValue(['lastPaymentDate', 'lastPaidDate', 'LAST PAYMENT DATE']) || '',
                loanAmount: caseItem.loan_amount || getValue(['loanAmount', 'Loan Amount']) || '',
                posAmount: caseItem.pos_amount || getValue(['pos', 'posAmount', 'POS']) || '',
                pendingDues: caseItem.pending_dues || '',
                paymentLink: caseItem.payment_link || getValue(['paymentLink', 'Payment Link']) || '',
                alternateNumber: caseItem.alternate_number || getValue(['alternateNumber', 'Alternate Number']) || '',
                sanctionDate: caseItem.sanction_date || getValue(['loanCreatedAt', 'sanctionDate', 'LOAN CREATED AT']) || '',
                lastPaidAmount: caseItem.last_paid_amount || getValue(['lastPaymentAmount', 'lastPaidAmount', 'LAST PAYMENT AMOUNT']) || '',
                branchName: caseItem.branch_name || '',
                loanType: caseItem.loan_type || getValue(['loanType', 'Loan Type']) || '',
                caseStatus: caseItem.case_status || '',
                address: caseItem.address || getValue(['address', 'Address']) || '',
                email: caseItem.email || getValue(['email', 'Email']) || '',
                latest_call_status: caseItem.latest_call_status,
                latest_ptp_date: caseItem.latest_ptp_date,
                remarks: caseItem.remarks || '',
                total_collected_amount: caseItem.total_collected_amount || 0,
              };

              setSelectedCase(mappedCase);
              setIsCaseDetailsOpen(true);

              if (caseItem.id && user.id) {
                customerCaseService.markCaseAsViewed(caseItem.id, user.id);
                setViewedCases(prev => new Set(prev).add(caseItem.id!));
              }
            }}
          />
        );
      case 'profile':
        return (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="relative h-48 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full hover:bg-white/30 transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="px-8 pb-8">
              <div className="relative flex flex-col items-center -mt-20 mb-8">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full border-4 border-white bg-white shadow-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
                    {profileData.avatarUrl ? (
                      <img src={profileData.avatarUrl} alt={profileData.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl font-bold text-indigo-600 uppercase">
                        {profileData.name.charAt(0) || user.name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-4 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-md" title="Online"></div>
                </div>

                <div className="text-center mt-4">
                  <h2 className="text-3xl font-bold text-gray-900 mb-1">{profileData.name}</h2>
                  <div className="flex items-center justify-center gap-2 text-gray-500 font-medium">
                    <Briefcase className="w-4 h-4" />
                    <span>{user.role}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    <span>{profileData.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Contact Card */}
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow duration-300 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
                      <Phone className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Contact Details</h4>
                  </div>
                  <div className="space-y-3 pl-1">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Mobile</p>
                      <p className="text-gray-900 font-medium">{profileData.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Email</p>
                      <p className="text-gray-900 font-medium truncate" title={profileData.email}>{profileData.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Personal Info Card */}
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow duration-300 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-lg bg-purple-100 text-purple-600">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Personal Info</h4>
                  </div>
                  <div className="space-y-3 pl-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Gender</p>
                        <p className="text-gray-900 font-medium capitalize">{profileData.gender || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">DOB</p>
                        <p className="text-gray-900 font-medium">{profileData.dob || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Employee ID</p>
                      <p className="text-gray-900 font-medium">{user.empId || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Address Card */}
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow duration-300 space-y-4 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Location</h4>
                  </div>
                  <div className="space-y-3 pl-1">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Full Address</p>
                      <p className="text-gray-900 font-medium leading-relaxed">
                        {profileData.address ? (
                          <>
                            {profileData.address}
                            {profileData.city && profileData.state && <br />}
                            {profileData.city && profileData.state ? <span className="text-gray-600 mt-1 block text-sm">{profileData.city}, {profileData.state}</span> : ''}
                          </>
                        ) : <span className="text-gray-400 italic">No address provided</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <CelebrationProvider tenantId={user.tenantId} teamId={user.teamId as string}>
      <PaymentCelebration />
      <Layout
        user={user}
        onLogout={onLogout}
        menuItems={menuItems}
        title="Shakthi - Telecaller"
        roleColor="bg-purple-500"
        tenantName={tenantName}
        chatPanel={<ChatPanel onClose={() => setIsChatOpen(false)} />}
        isChatOpen={isChatOpen}
        onChatToggle={() => setIsChatOpen(!isChatOpen)}
        unreadChatCount={totalUnreadMessages}
        onNotificationClick={() => setActiveSection('notifications')}
        headerActions={
          <div className="flex items-center space-x-4">
            <BreakManager />
            <div className="w-48">
              <TeamSelector
                teams={teams}
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
                isLoading={isLoadingTeams}
              />
            </div>
            <AlertButton
              userId={user.id}
              teamId={selectedTeamId}
              onClick={(alerts: AlertCase[]) => {
                setCurrentAlerts(alerts);
                setIsAlertsDrawerOpen(true);
              }}
            />
          </div>
        }
      >
        {renderContent()}
        <PTPNotificationManager
          user={user}
          lastUpdate={lastUpdateTimestamp}
          selectedTeamId={selectedTeamId}
          onOpenCase={(caseItem: TeamInchargeCase) => {
            const details = (caseItem.case_data as Record<string, unknown>) || {};
            const getValue = (keys: string[]) => {
              for (const key of keys) {
                const val = details[key] || (caseItem as unknown as Record<string, unknown>)[key];
                if (val !== undefined && val !== null && val !== '') return String(val);
              }
              return '';
            };

            const mappedCase: DashboardCustomerCase = {
              id: caseItem.id || '',
              tenant_id: user.tenantId || '',
              customerName: caseItem.customer_name || getValue(['customerName', 'Customer Name']) || '',
              loanId: caseItem.loan_id || getValue(['loanId', 'loanNumber', 'Loan ID']) || '',
              mobileNo: caseItem.mobile_no || getValue(['mobileNo', 'mobileNumber', 'Mobile Number', 'mobile_no']),
              dpd: caseItem.dpd || Number(getValue(['dpd', 'DPD'])) || 0,
              outstandingAmount: caseItem.outstanding_amount || getValue(['totalOutstanding', 'outstandingAmount', 'TOTAL OUTSTANDING', 'Total Outstanding', 'pos', 'posAmount', 'outstanding_amount']) || '',
              emiAmount: caseItem.emi_amount || getValue(['emi', 'emiAmount', 'EMI', 'emi_amount']) || '',
              lastPaidDate: caseItem.last_paid_date || getValue(['lastPaymentDate', 'lastPaidDate', 'LAST PAYMENT DATE', 'last_paid_date']) || '',
              loanAmount: caseItem.loan_amount || getValue(['loanAmount', 'Loan Amount', 'loan_amount']) || '',
              posAmount: caseItem.pos_amount || getValue(['pos', 'posAmount', 'POS', 'pos_amount']) || '',
              pendingDues: caseItem.pending_dues || '',
              paymentLink: caseItem.payment_link || getValue(['paymentLink', 'Payment Link', 'payment_link']) || '',
              alternateNumber: caseItem.alternate_number || getValue(['alternateNumber', 'Alternate Number', 'alternate_number']) || '',
              sanctionDate: caseItem.sanction_date || getValue(['loanCreatedAt', 'sanctionDate', 'LOAN CREATED AT', 'sanction_date']) || '',
              lastPaidAmount: caseItem.last_paid_amount || getValue(['lastPaymentAmount', 'lastPaidAmount', 'LAST PAYMENT AMOUNT', 'last_paid_amount']) || '',
              branchName: caseItem.branch_name || '',
              loanType: caseItem.loan_type || getValue(['loanType', 'Loan Type', 'loan_type']) || '',
              caseStatus: caseItem.case_status || '',
              address: caseItem.address || getValue(['address', 'Address', 'address']) || '',
              email: caseItem.email || getValue(['email', 'Email', 'email']) || '',
              latest_call_status: caseItem.latest_call_status,
              latest_ptp_date: caseItem.latest_ptp_date,
              remarks: caseItem.remarks || '',
              total_collected_amount: caseItem.total_collected_amount || 0,
            };

            setSelectedCase(mappedCase);
            setIsCaseDetailsOpen(true);

            if (caseItem.id && user.id) {
              customerCaseService.markCaseAsViewed(caseItem.id, user.id);
              setViewedCases(prev => new Set(prev).add(caseItem.id!));
            }
          }}
        />
      </Layout >

      {/* Case Details Modal */}
      {
        selectedCase && (
          <CaseDetailsModal
            isOpen={isCaseDetailsOpen}
            onClose={() => {
              setIsCaseDetailsOpen(false);
              setSelectedCase(null);
            }}
            caseData={selectedCase}
            user={{
              id: user.id || '',
              empId: user.empId || '',
              tenantId: user.tenantId || ''
            }}
            onCaseUpdated={() => {
              loadCases(true);
              loadDashboardStats();
            }}
          />
        )
      }

      {/* Call Log Modal */}
      <CallLogModal
        isOpen={isCallLogOpen}
        onClose={() => {
          setIsCallLogOpen(false);
          setSelectedCase(null);
        }}
        caseData={selectedCase}
        onSave={async (logData: CallLogData) => {
          if (!selectedCase?.id || !user.id) return;

          try {
            console.log('📝 Saving call log:', logData);

            await customerCaseService.addCallLog({
              case_id: selectedCase.id,
              employee_id: user.id,
              call_status: logData.callStatus,
              call_notes: logData.remarks,
              call_duration: parseInt(logData.callDuration) || 0,
              ptp_datetime: logData.ptpDate ? (() => {
                const dateTimeString = `${logData.ptpDate}T${logData.ptpTime || '00:00'}:00`;
                const localDate = new Date(dateTimeString);
                return localDate.toISOString();
              })() : undefined,
              amount_collected: logData.ptpAmount,
              callback_datetime: (logData.callbackDate && logData.callbackTime) ? (() => {
                const dateTimeString = `${logData.callbackDate}T${logData.callbackTime}:00`;
                const localDate = new Date(dateTimeString);
                return localDate.toISOString();
              })() : undefined
            });

            showNotification(notificationHelpers.success(
              'Call Logged',
              `Call log saved successfully for ${selectedCase?.customerName}`
            ));

            setIsCallLogOpen(false);
            setSelectedCase(null);

            // Refresh dashboard data to update metrics
            await loadDashboardStats();
            await loadCases(true);
          } catch (error) {
            console.error('Error saving call log:', error);
            showNotification(notificationHelpers.error(
              'Error',
              'Failed to save call log. Please try again.'
            ));
          }
        }}
      />

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isStatusUpdateOpen}
        onClose={() => {
          setIsStatusUpdateOpen(false);
          setSelectedCase(null);
        }}
        caseData={selectedCase}
        onSave={(status) => {
          if (selectedCase?.id) {
            handleStatusUpdate(selectedCase.id, status);
            setIsStatusUpdateOpen(false);
            setSelectedCase(null);
          }
        }}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        initialData={profileData}
        onSave={async (data) => {
          try {
            await employeeService.updateEmployee(user.id, {
              name: data.name,
              email: data.email,
              mobile: data.phone,
              dob: data.dob,
              gender: data.gender,
              address: data.address,
              city: data.city,
              state: data.state,
              avatarUrl: data.avatarUrl
            });

            setProfileData({
              ...data,
              avatarUrl: data.avatarUrl || ''
            });
            setIsEditProfileOpen(false);
            showNotification(notificationHelpers.success(
              'Profile Updated',
              'Your profile has been updated successfully.'
            ));

            // Optionally refresh auth user context if name/phone changed significantly
          } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(notificationHelpers.error(
              'Update Failed',
              'Failed to update profile details'
            ));
          }
        }}
      />

      {/* Alerts Drawer */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={currentAlerts}
        onCaseClick={(caseId) => {
          const alert = currentAlerts.find(a => a.id === caseId);
          if (alert && alert.original_data) {
            // If case_data is present, map it and use it
            const caseData = alert.original_data.customer_cases;
            const mappedCase = mapServiceCaseToDashboardCase(caseData as ServiceCustomerCase);
            setSelectedCase(mappedCase);
            setIsAlertsDrawerOpen(false);
            setIsCaseDetailsOpen(true);
          } else {
            // Fallback: try to find in current page of cases
            const caseToOpen = (customerCases as ServiceCustomerCase[]).map(mapServiceCaseToDashboardCase).find(c => c.id === caseId);
            if (caseToOpen) {
              setSelectedCase(caseToOpen);
              setIsAlertsDrawerOpen(false);
              setIsCaseDetailsOpen(true);
            }
          }
        }}
      />

      {/* Case Field Management Modal */}
      <CaseFieldModal
        isOpen={isCaseFieldModalOpen}
        onClose={() => setIsCaseFieldModalOpen(false)}
        caseData={selectedCase}
        onSave={async (updatedFields) => {
          if (!selectedCase?.id) return;
          try {
            const serviceUpdates: Partial<ServiceCustomerCase> = {};
            if (updatedFields.mobileNo) serviceUpdates.mobile_no = updatedFields.mobileNo;
            if (updatedFields.outstandingAmount) serviceUpdates.outstanding_amount = updatedFields.outstandingAmount;
            if (updatedFields.emiAmount) serviceUpdates.emi_amount = updatedFields.emiAmount;
            if (updatedFields.lastPaidDate) serviceUpdates.last_paid_date = updatedFields.lastPaidDate;
            if (updatedFields.lastPaidAmount) serviceUpdates.last_paid_amount = updatedFields.lastPaidAmount;
            if (updatedFields.alternateNumber) serviceUpdates.alternate_number = updatedFields.alternateNumber;
            if (updatedFields.email) serviceUpdates.email = updatedFields.email;
            if (updatedFields.address) serviceUpdates.address = updatedFields.address;

            await customerCaseService.updateCase(selectedCase.id, serviceUpdates);
            showNotification(notificationHelpers.success('Fields Updated', 'Case fields updated successfully.'));
            loadDashboardStats();
            loadCases(true);
          } catch {
            showNotification(notificationHelpers.error('Update Failed', 'Failed to update case fields.'));
          }
        }}
      />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Bulk Upload Modal */}
      <CallResponseUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        user={{
          id: user.id || '',
          tenantId: user.tenantId || '',
          name: user.name || ''
        }}
        onSuccess={() => {
          loadDashboardStats();
          loadCases(true);
        }}
      />

      {/* Toast Container */}
      <ToastContainer
        toasts={toast.toasts}
        onRemoveToast={toast.removeToast}
      />
    </CelebrationProvider >
  );
};

export default TelecallerDashboard;