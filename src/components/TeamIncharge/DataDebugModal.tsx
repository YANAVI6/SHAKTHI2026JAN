import React from 'react';
import { X, Database, Users, Target, Phone, DollarSign } from 'lucide-react';

interface TeamData {
    id: string;
    team_name: string;
    product_name: string;
    telecaller_count: number;
    total_cases: number;
    cases_pending: number;
    cases_in_progress: number;
    cases_resolved: number;
    cases_closed: number;
    total_calls: number;
    total_collected: number;
    individual_targets: number;
    team_target: number;
    achievement_percentage: number;
}

interface DataDebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    teams: TeamData[];
}

export const DataDebugModal: React.FC<DataDebugModalProps> = ({ isOpen, onClose, teams }) => {
    if (!isOpen) return null;

    const totalTeamTarget = teams.reduce((sum, t) => sum + t.team_target, 0);
    const totalCollected = teams.reduce((sum, t) => sum + t.total_collected, 0);
    const totalCases = teams.reduce((sum, t) => sum + t.total_cases, 0);
    const totalTelecallers = teams.reduce((sum, t) => sum + t.telecaller_count, 0);
    const totalCalls = teams.reduce((sum, t) => sum + t.total_calls, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Database className="w-6 h-6" />
                        <h2 className="text-2xl font-bold">Data Debug Panel</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Summary Stats */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-600" />
                            Overall Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Teams</div>
                                <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Telecallers</div>
                                <div className="text-2xl font-bold text-purple-600">{totalTelecallers}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Cases</div>
                                <div className="text-2xl font-bold text-orange-600">{totalCases}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Calls</div>
                                <div className="text-2xl font-bold text-indigo-600">{totalCalls}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-600 mb-1">Collected</div>
                                <div className="text-2xl font-bold text-green-600">₹{totalCollected.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Total Target:</span>
                                <span className="text-lg font-bold text-blue-600">
                                    {totalTeamTarget > 0 ? `₹${totalTeamTarget.toLocaleString('en-IN')}` : 'Not Set'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Teams Data */}
                    {teams.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                            <Database className="w-16 h-16 text-yellow-600 mx-auto mb-3 opacity-50" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Found</h3>
                            <p className="text-sm text-gray-600">
                                No active teams were found in the database. Please check:
                            </p>
                            <ul className="text-sm text-gray-600 mt-2 space-y-1">
                                <li>• Teams exist in the 'teams' table</li>
                                <li>• Teams have status = 'active'</li>
                                <li>• Teams belong to your tenant_id</li>
                            </ul>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                Team Details ({teams.length})
                            </h3>
                            {teams.map((team, index) => (
                                <div key={team.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{team.team_name}</h4>
                                                <p className="text-sm text-gray-600">Product: {team.product_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users className="w-4 h-4 text-purple-600" />
                                                    <span className="text-xs text-purple-700 font-medium">Telecallers</span>
                                                </div>
                                                <div className="text-xl font-bold text-purple-900">{team.telecaller_count}</div>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Target className="w-4 h-4 text-orange-600" />
                                                    <span className="text-xs text-orange-700 font-medium">Cases</span>
                                                </div>
                                                <div className="text-xl font-bold text-orange-900">{team.total_cases}</div>
                                            </div>
                                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Phone className="w-4 h-4 text-indigo-600" />
                                                    <span className="text-xs text-indigo-700 font-medium">Calls</span>
                                                </div>
                                                <div className="text-xl font-bold text-indigo-900">{team.total_calls}</div>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <DollarSign className="w-4 h-4 text-green-600" />
                                                    <span className="text-xs text-green-700 font-medium">Collected</span>
                                                </div>
                                                <div className="text-lg font-bold text-green-900">
                                                    ₹{team.total_collected.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                <div className="text-xs text-gray-600 mb-1">Case Status Breakdown</div>
                                                <div className="grid grid-cols-4 gap-2 text-xs">
                                                    <div>
                                                        <div className="text-yellow-600 font-medium">Pending</div>
                                                        <div className="font-bold">{team.cases_pending}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-blue-600 font-medium">Progress</div>
                                                        <div className="font-bold">{team.cases_in_progress}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-green-600 font-medium">Resolved</div>
                                                        <div className="font-bold">{team.cases_resolved}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-600 font-medium">Closed</div>
                                                        <div className="font-bold">{team.cases_closed}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                                <div className="text-xs text-blue-700 mb-1">Target & Achievement</div>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-xs text-gray-600">Target</div>
                                                        <div className="font-bold text-blue-900">
                                                            {team.team_target > 0 ? `₹${team.team_target.toLocaleString('en-IN')}` : 'Not Set'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-600">Achievement</div>
                                                        <div className="font-bold text-green-900">{team.achievement_percentage}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Raw Data */}
                                        <details className="mt-3">
                                            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
                                                View Raw JSON Data
                                            </summary>
                                            <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                                                {JSON.stringify(team, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Debug Instructions</h3>
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li>• Open browser console (F12) to see detailed logs</li>
                            <li>• Check if teams are loading from Supabase</li>
                            <li>• Verify telecaller_count, total_cases, and total_calls are correct</li>
                            <li>• If team_target is 0, check if targets are set in 'telecaller_targets' table</li>
                            <li>• Expand "View Raw JSON Data" to see complete team object</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
