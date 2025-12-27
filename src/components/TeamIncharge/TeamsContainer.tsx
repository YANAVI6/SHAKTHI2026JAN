import React, { useState } from 'react';
import { Users, Target } from 'lucide-react';
import { Teams } from './Teams';
import { TargetManagement } from './TargetManagement';

type TabType = 'view-teams' | 'targets';

export const TeamsContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('view-teams');

  const tabs = [
    { id: 'view-teams' as TabType, name: 'View Teams', icon: Users },
    { id: 'targets' as TabType, name: 'Targets', icon: Target }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-5 border-b border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="w-7 h-7 mr-3 text-green-600" />
                Teams
              </h3>
              <p className="text-sm text-gray-600 mt-1">Manage your teams and their assignments</p>
            </div>
          </div>

          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                    ${isActive
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-green-50 border border-green-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'view-teams' && <Teams />}
        {activeTab === 'targets' && <TargetManagement />}
      </div>
    </div>
  );
};
