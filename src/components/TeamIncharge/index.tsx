import React, { useState } from 'react';
import { BarChart3, Users, FileText, BarChart, Bell } from 'lucide-react';
import Layout from '../Layout';
import { useTenantName } from '../../hooks/useTenantName';
import { Dashboard } from './Dashboard';
import { TeamsContainer } from './TeamsContainer';
import { CaseManagement } from './CaseManagement';
import { ReportsComponent } from './Reports';
import { ChatPanel } from '../Chat/ChatPanel';
import { NotificationManager } from './NotificationManager';
import { User } from '../../contexts/AuthContext';
import { PTPAlertSection } from '../shared/reports/PTPAlertSection';
import { CallbackAlertSection } from '../shared/reports/CallbackAlertSection';
import { ChatSyncService } from '../../services/chatSyncService';
import { useChannels } from '../../hooks/useChannels';
import { CaseListSection } from '../shared/CaseListSection';
import { LiveMonitoring } from '../CompanyAdmin/sections/LiveMonitoring';
import { CaseDetailsModal } from '../TelecallerDashboard/CaseDetailsModal';
import { CustomerCase } from '../TelecallerDashboard/types';
import { mapServiceCaseToDashboardCase } from '../../utils/caseMapper';
import { CustomerCase as ServiceCustomerCase } from '../../services/customerCaseService';
import ToastContainer from '../TelecallerDashboard/ToastContainer';
import { useToast } from '../TelecallerDashboard/hooks';

type SectionType = 'dashboard' | 'all-cases' | 'teams' | 'live-monitoring' | 'case-management' | 'reports' | 'ptp-alerts' | 'callback-alerts' | 'notifications' | 'settings';

interface TeamInchargeDashboardProps {
  user: User;
  onLogout: () => void;
}

export const TeamInchargeDashboard: React.FC<TeamInchargeDashboardProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedCase, setSelectedCase] = React.useState<CustomerCase | null>(null);
  const toast = useToast();
  const { tenantName } = useTenantName(user?.tenantId);
  const { unreadCounts } = useChannels(user?.id || '');
  const totalUnreadMessages = Object.values(unreadCounts).reduce((a: number, b: number) => a + b, 0);

  React.useEffect(() => {
    if (user?.id && user?.tenantId) {
      ChatSyncService.syncUserChannels(
        user.tenantId,
        user.id,
        user.role || 'TeamIncharge',
        user.teamId as string
      );
    }
  }, [user?.id, user?.tenantId, user?.role, user?.teamId]);

  const menuItems = [
    { name: 'Dashboard', icon: BarChart3, active: activeSection === 'dashboard', onClick: () => setActiveSection('dashboard') },
    { name: 'All Cases', icon: FileText, active: activeSection === 'all-cases', onClick: () => setActiveSection('all-cases') },
    { name: 'Teams', icon: Users, active: activeSection === 'teams', onClick: () => setActiveSection('teams') },
    { name: 'Live Monitoring', icon: BarChart, active: activeSection === 'live-monitoring', onClick: () => setActiveSection('live-monitoring') },
    { name: 'Case Management', icon: FileText, active: activeSection === 'case-management', onClick: () => setActiveSection('case-management') },
    { name: 'Reports', icon: BarChart, active: activeSection === 'reports', onClick: () => setActiveSection('reports') },
    { name: 'PTP Alert', icon: Bell, active: activeSection === 'ptp-alerts', onClick: () => setActiveSection('ptp-alerts') },
    { name: 'Callback Alert', icon: Bell, active: activeSection === 'callback-alerts', onClick: () => setActiveSection('callback-alerts') },
    { name: 'Notifications', icon: Bell, active: activeSection === 'notifications', onClick: () => setActiveSection('notifications') },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'teams':
        return <TeamsContainer />;
      case 'case-management':
        return <CaseManagement />;
      case 'reports':
        return <ReportsComponent />;
      case 'live-monitoring':
        return <LiveMonitoring />;
      case 'notifications':
        return <NotificationManager />;
      case 'ptp-alerts':
        return (
          <PTPAlertSection
            user={user}
            teamId={user.teamId}
            onCaseClick={(caseItem) => setSelectedCase(mapServiceCaseToDashboardCase(caseItem as ServiceCustomerCase))}
          />
        );
      case 'callback-alerts':
        return (
          <CallbackAlertSection
            user={user}
            teamId={user.teamId}
            onCaseClick={(caseItem) => setSelectedCase(mapServiceCaseToDashboardCase(caseItem as ServiceCustomerCase))}
          />
        );
      case 'all-cases':
        return (
          <CaseListSection
            user={{
              id: user.id,
              role: user.role,
              tenantId: user.tenantId
            }}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      user={user}
      onLogout={onLogout}
      menuItems={menuItems}
      title="Shakthi - Team Incharge"
      roleColor="bg-green-500"
      tenantName={tenantName}
      chatPanel={<ChatPanel onClose={() => setIsChatOpen(false)} />}
      isChatOpen={isChatOpen}
      onChatToggle={() => setIsChatOpen(!isChatOpen)}
      unreadChatCount={totalUnreadMessages}
      onNotificationClick={() => setActiveSection('notifications')}
    >
      {renderContent()}


      {/* Case Details Modal */}
      {selectedCase && (
        <CaseDetailsModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          caseData={selectedCase}
          user={{
            id: user.id,
            empId: user.empId || '',
            tenantId: user.tenantId
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

      {/* Chat Panel - Rendered in Layout via split-panel */}
    </Layout>
  );
};

export default TeamInchargeDashboard;