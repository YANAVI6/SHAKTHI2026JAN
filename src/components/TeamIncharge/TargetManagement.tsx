import React, { useState, useEffect, useCallback } from 'react';
import { Target, Users, TrendingUp, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TeamService } from '../../services/teamService';
import { TelecallerTargetService } from '../../services/telecallerTargetService';
import { TeamWithDetails, TelecallerTarget } from '../../types';
import { SetTargetModal } from './modals/SetTargetModal';
import { useNotification, notificationHelpers } from '../shared/Notification';

interface TelecallerWithTargetData {
  id: string;
  emp_id: string;
  name: string;
  email: string;
  teamName: string;
  target?: TelecallerTarget;
}

export const TargetManagement: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [telecallers, setTelecallers] = useState<TelecallerWithTargetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetTargetModal, setShowSetTargetModal] = useState(false);
  const [selectedTelecaller, setSelectedTelecaller] = useState<TelecallerWithTargetData | null>(null);

  const loadTeamsAndTargets = useCallback(async () => {
    if (!user?.tenantId) return;

    try {
      setIsLoading(true);
      const teamsData = await TeamService.getTeams(user.tenantId);

      const userTeams = teamsData.filter(
        team => team.team_incharge_id === user.id && team.status === 'active'
      );

      setTeams(userTeams);

      const allTelecallers: TelecallerWithTargetData[] = [];
      const telecallerIds: string[] = [];

      userTeams.forEach(team => {
        if (team.telecallers && team.telecallers.length > 0) {
          team.telecallers.forEach(telecaller => {
            allTelecallers.push({
              id: telecaller.id,
              emp_id: telecaller.emp_id,
              name: telecaller.name,
              email: telecaller.email || '',
              teamName: team.name
            });
            telecallerIds.push(telecaller.id);
          });
        }
      });

      if (telecallerIds.length > 0) {
        const targets = await TelecallerTargetService.getTargetsForTeam('', telecallerIds);

        const telecallersWithTargets = allTelecallers.map(telecaller => {
          const target = targets.find(t => t.telecaller_id === telecaller.id);
          return { ...telecaller, target };
        });

        setTelecallers(telecallersWithTargets);
      } else {
        setTelecallers([]);
      }
    } catch (error) {
      console.error('Error loading teams and targets:', error);
      showNotification(notificationHelpers.error(
        'Failed to Load Data',
        error instanceof Error ? error.message : 'Unknown error occurred'
      ));
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId, user?.id, showNotification]);

  useEffect(() => {
    loadTeamsAndTargets();
  }, [loadTeamsAndTargets]);

  const handleSetTarget = (telecaller: TelecallerWithTargetData) => {
    setSelectedTelecaller(telecaller);
    setShowSetTargetModal(true);
  };

  const handleTargetSuccess = () => {
    showNotification(notificationHelpers.success(
      'Target Set Successfully',
      'Performance targets have been updated'
    ));
    loadTeamsAndTargets();
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading targets...</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Teams Found</h3>
        <p className="text-gray-500">You are not managing any active teams yet.</p>
      </div>
    );
  }

  if (telecallers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Telecallers Found</h3>
        <p className="text-gray-500">There are no telecallers in your teams.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {teams.map(team => {
          const teamTelecallers = telecallers.filter(t => t.teamName === team.name);

          if (teamTelecallers.length === 0) return null;

          return (
            <div key={team.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">{team.name}</h3>
                  <span className="ml-auto text-sm text-blue-700">
                    {teamTelecallers.length} Telecaller{teamTelecallers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telecaller
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Daily Calls
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weekly Calls
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Calls
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamTelecallers.map(telecaller => (
                      <tr key={telecaller.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{telecaller.name}</div>
                          <div className="text-sm text-gray-500">{telecaller.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {telecaller.emp_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-sm font-medium ${telecaller.target ? 'text-blue-600' : 'text-gray-400'}`}>
                            {telecaller.target?.daily_calls_target || 'Not Set'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-sm font-medium ${telecaller.target ? 'text-blue-600' : 'text-gray-400'}`}>
                            {telecaller.target?.weekly_calls_target || 'Not Set'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-sm font-medium ${telecaller.target ? 'text-blue-600' : 'text-gray-400'}`}>
                            {telecaller.target?.monthly_calls_target || 'Not Set'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {telecaller.target ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Targets Set
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No Targets
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleSetTarget(telecaller)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
                          >
                            <Edit className="w-3 h-3" />
                            {telecaller.target ? 'Edit' : 'Set'} Target
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {showSetTargetModal && selectedTelecaller && (
        <SetTargetModal
          isOpen={showSetTargetModal}
          onClose={() => {
            setShowSetTargetModal(false);
            setSelectedTelecaller(null);
          }}
          telecallerId={selectedTelecaller.id}
          telecallerName={selectedTelecaller.name}
          teamName={selectedTelecaller.teamName}
          existingTarget={selectedTelecaller.target}
          onSuccess={handleTargetSuccess}
        />
      )}
    </div>
  );
};
