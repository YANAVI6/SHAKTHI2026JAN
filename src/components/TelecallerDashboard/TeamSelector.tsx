import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    product_name: string;
}

interface TeamSelectorProps {
    teams: Team[];
    selectedTeamId: string;
    onTeamChange: (teamId: string) => void;
    isLoading?: boolean;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
    teams,
    selectedTeamId,
    onTeamChange,
    isLoading = false
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading teams...</span>
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                No teams assigned
            </div>
        );
    }

    if (teams.length === 1) {
        // Only one team, no need for selector
        return (
            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm font-medium text-purple-900">{teams[0].name}</div>
                <div className="text-xs text-purple-700">{teams[0].product_name}</div>
            </div>
        );
    }

    return (
        <div className="relative">
            <select
                value={selectedTeamId}
                onChange={(e) => onTeamChange(e.target.value)}
                className="appearance-none w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer transition-colors"
            >
                {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                        {team.name} ({team.product_name})
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
        </div>
    );
};
