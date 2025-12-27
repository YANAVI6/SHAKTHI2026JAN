import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EMPLOYEE_TABLE, TEAM_TABLE } from '../../models';
import { NotificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface CreateNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
    const [targetType, setTargetType] = useState<'all' | 'team' | 'user'>('all');
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);

    const [teams, setTeams] = useState<{ id: string, name: string }[]>([]);
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            if (!user?.tenantId) return;

            // Fetch Teams
            const { data: teamsData } = await supabase
                .from(TEAM_TABLE)
                .select('id, name')
                .eq('tenant_id', user.tenantId);

            if (teamsData) setTeams(teamsData);

            // Fetch Employees
            const { data: empData } = await supabase
                .from(EMPLOYEE_TABLE)
                .select('id, name')
                .eq('tenant_id', user.tenantId)
                .eq('status', 'active');

            if (empData) setEmployees(empData);
        };

        if (isOpen && user?.tenantId) {
            fetchOptions();
        }
    }, [isOpen, user?.tenantId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !user?.tenantId) return;

        try {
            setLoading(true);
            await NotificationService.createNotification({
                tenant_id: user.tenantId,
                sender_id: user.id,
                title,
                message,
                type,
                target_type: targetType,
                target_id: targetType === 'all' ? undefined : targetId
            });

            onSuccess();
            onClose();
            // Reset form
            setTitle('');
            setMessage('');
            setTargetType('all');
            setTargetId('');
        } catch (error) {
            console.error('Error sending notification:', error);
            alert(`Failed to send notification: ${(error as Error).message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Create Notification</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Notification Title"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                            placeholder="Enter your message here..."
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <div className="flex gap-2">
                            {(['info', 'warning', 'success', 'error'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
                    ${type === t
                                            ? t === 'info' ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                : t === 'warning' ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                    : t === 'success' ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-red-100 text-red-700 border-red-200'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        } border`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Audience */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setTargetType('all')}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                  ${targetType === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'}`}
                            >
                                <Layers className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">All Users</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('team')}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                  ${targetType === 'team' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'}`}
                            >
                                <Users className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Specific Team</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType('user')}
                                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                  ${targetType === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-600'}`}
                            >
                                <User className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Specific User</span>
                            </button>
                        </div>

                        {targetType === 'team' && (
                            <select
                                required
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Team</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        )}

                        {targetType === 'user' && (
                            <select
                                required
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
