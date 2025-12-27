import React from 'react';
import { BarChart3, Users, FileText, BarChart, Settings, Bell } from 'lucide-react';
import Layout from '../Layout';
import { useTenantName } from '../../hooks/useTenantName';
import { Dashboard } from './Dashboard';
import { TeamsContainer } from './TeamsContainer';
import { CaseManagement } from './CaseManagement';
import { ReportsComponent } from './Reports';
import { Settings as SettingsComponent } from './Settings';
import { NotificationManager } from './NotificationManager';
import { User } from '../../contexts/AuthContext';
import { PTPAlertSection } from '../shared/reports/PTPAlertSection';
import { CallbackAlertSection } from '../shared/reports/CallbackAlertSection';
import { CaseListSection } from '../shared/CaseListSection';
import { LiveMonitoring } from '../CompanyAdmin/sections/LiveMonitoring';
import { CaseDetailsModal } from '../TelecallerDashboard/CaseDetailsModal';
import { CustomerCase } from '../TelecallerDashboard/types';
import { mapServiceCaseToDashboardCase } from '../../utils/caseMapper';
import { CustomerCase as ServiceCustomerCase } from '../../services/customerCaseService';
import ToastContainer from '../TelecallerDashboard/ToastContainer';
import { useToast } from '../TelecallerDashboard/hooks';

interface TeamInchargeDashboardProps {
  user: User;
  onLogout: () => void;
}

export const TeamInchargeDashboard: React.FC<TeamInchargeDashboardProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = React.useState('dashboard');
  const [selectedCase, setSelectedCase] = React.useState<CustomerCase | null>(null);
  const toast = useToast();
  const { tenantName } = useTenantName(user?.tenantId);

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
    { name: 'Settings', icon: Settings, active: activeSection === 'settings', onClick: () => setActiveSection('settings') },
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
      case 'settings':
        return <SettingsComponent />;
      case 'notifications':
        return <NotificationManager />;
      case 'ptp-alerts':
        return (
          <PTPAlertSection
            user={user}
            onCaseClick={(caseItem) => setSelectedCase(mapServiceCaseToDashboardCase(caseItem as ServiceCustomerCase))}
          />
        );
      case 'callback-alerts':
        return (
          <CallbackAlertSection
            user={user}
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
      title="Shakti - Team Incharge"
      roleColor="bg-green-500"
      tenantName={tenantName}
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
    </Layout>
  );
};

export default TeamInchargeDashboard;