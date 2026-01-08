import React, { useState, useEffect, useCallback } from 'react';
import { Upload, UserCheck, BarChart3, Trash2, TrendingUp, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { customerCaseService } from '../../services/customerCaseService';
import { TeamService } from '../../services/teamService';
import { UploadCasesModal } from './modals';
import { AssignCasesView } from './AssignCasesView';
import { DeleteCasesView } from './DeleteCasesView';

interface DashboardStats {
  totalTeams: number;
  totalTelecallers: number;
  totalCases: number;
  unassignedCases: number;
  assignedCases: number;
  inProgressCases: number;
  closedCases: number;
}

type ViewType = 'dashboard' | 'upload' | 'assign' | 'delete';

export const CaseManagement: React.FC = () => {
  const { user } = useAuth();

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTeams: 0,
    totalTelecallers: 0,
    totalCases: 0,
    unassignedCases: 0,
    assignedCases: 0,
    inProgressCases: 0,
    closedCases: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardStats = useCallback(async () => {
    if (!user?.tenantId || !user?.id) {
      console.warn('Tenant ID or User ID not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading case management dashboard for user:', user.id, 'tenant:', user.tenantId);

      // Get teams for this team incharge
      const teamData = await TeamService.getTeams(user.tenantId);
      console.log('Total teams loaded:', teamData.length);

      const userTeams = teamData.filter(team =>
        team.team_incharge_id === user.id && team.status === 'active'
      );
      console.log('User teams (in-charge and active):', userTeams.length);

      // Calculate stats
      const totalTeams = userTeams.length;
      const totalTelecallers = userTeams.reduce((sum, team) => sum + (team.telecallers?.length || 0), 0);

      // Get case counts for all teams efficiently
      const teamIds = userTeams.map(t => t.id);
      console.log('Fetching stats for teams:', teamIds);

      const stats = await customerCaseService.getTeamInchargeStats(user.tenantId, teamIds);

      const totalCases = stats.totalCases;
      const unassignedCases = stats.unassignedCases;
      const assignedCases = stats.assignedCases;
      const inProgressCases = stats.inProgressCases;
      const closedCases = stats.closedCases;

      console.log('Dashboard stats calculated:', {
        totalTeams,
        totalTelecallers,
        totalCases,
        unassignedCases,
        assignedCases,
        inProgressCases,
        closedCases
      });

      setDashboardStats({
        totalTeams,
        totalTelecallers,
        totalCases,
        unassignedCases,
        assignedCases,
        inProgressCases,
        closedCases
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setDashboardStats({
        totalTeams: 0,
        totalTelecallers: 0,
        totalCases: 0,
        unassignedCases: 0,
        assignedCases: 0,
        inProgressCases: 0,
        closedCases: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId, user?.id]);

  useEffect(() => {
    if (user?.tenantId && user?.id) {
      loadDashboardStats();
    }
  }, [user?.tenantId, user?.id, loadDashboardStats]);

  const handleModalSuccess = () => {
    // Reload dashboard stats when any modal operation succeeds
    loadDashboardStats();
  };

  const getCardStats = () => [
    {
      title: 'Total Teams',
      value: dashboardStats.totalTeams,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Active teams'
    },
    {
      title: 'Total Telecallers',
      value: dashboardStats.totalTelecallers,
      icon: UserCheck,
      color: 'bg-green-500',
      description: 'Team members'
    },
    {
      title: 'Total Cases',
      value: dashboardStats.totalCases,
      icon: BarChart3,
      color: 'bg-purple-500',
      description: 'All cases'
    },
    {
      title: 'Unassigned Cases',
      value: dashboardStats.unassignedCases,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      description: 'Need assignment'
    },
    {
      title: 'Assigned Cases',
      value: dashboardStats.assignedCases,
      icon: CheckCircle,
      color: 'bg-blue-500',
      description: 'In progress'
    },
    {
      title: 'Closed Cases',
      value: dashboardStats.closedCases,
      icon: TrendingUp,
      color: 'bg-green-500',
      description: 'Completed'
    }
  ];

  const getMenuCards = () => [
    {
      title: 'Upload Cases',
      description: 'Upload new customer cases via Excel template',
      icon: Upload,
      color: 'bg-green-500',
      onClick: () => setShowUploadModal(true),
      action: 'Upload',
      stats: null
    },
    {
      title: 'Assign Cases',
      description: 'View, assign, reassign, and manage case assignments',
      icon: UserCheck,
      color: 'bg-blue-500',
      onClick: () => setCurrentView('assign'),
      action: 'Manage',
      stats: {
        unassigned: dashboardStats.unassignedCases,
        total: dashboardStats.totalCases,
        inProgress: dashboardStats.inProgressCases
      }
    },
    {
      title: 'Deleted Cases',
      description: 'View and manage deleted cases (Recycle Bin)',
      icon: Trash2,
      color: 'bg-red-500',
      onClick: () => setCurrentView('delete'),
      action: 'View',
      stats: null,
      restricted: user?.role !== 'CompanyAdmin' && user?.role !== 'TeamIncharge'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'assign') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          ← Back to Dashboard
        </button>
        <AssignCasesView />
      </div>
    );
  }

  if (currentView === 'delete') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          ← Back to Dashboard
        </button>
        <DeleteCasesView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
            Case Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage, assign, and track customer cases across your teams
          </p>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getCardStats().map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                  <div className="flex items-center">
                    <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-xs text-gray-500">{stat.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Case Operations</h3>
          <p className="text-gray-600 mt-1">Choose an operation to manage your cases</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getMenuCards().map((card, index) => {
              const IconComponent = card.icon;
              if (card.restricted) return null;
              return (
                <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                  <div className="flex items-center mb-4">
                    <div className={`${card.color} rounded-lg p-3 mr-4`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{card.title}</h4>
                      {card.stats && (
                        <p className="text-sm text-gray-600">
                          {card.stats.total !== undefined && `${card.stats.total} total`}
                          {card.stats.unassigned !== undefined && ` • ${card.stats.unassigned} unassigned`}
                          {card.stats.inProgress !== undefined && ` • ${card.stats.inProgress} in progress`}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{card.description}</p>

                  <button
                    onClick={card.onClick}
                    className={`w-full py-2 px-4 ${card.color} text-white rounded-lg hover:opacity-90 transition-all duration-200 flex items-center justify-center font-medium`}
                  >
                    {card.action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No recent activity</p>
            <p className="text-sm">Case activities will appear here</p>
          </div>
        </div>
      </div>

      <UploadCasesModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};