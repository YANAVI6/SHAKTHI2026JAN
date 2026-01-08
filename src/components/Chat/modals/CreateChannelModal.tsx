import React, { useState } from 'react';
import { X, Hash, Users, Lock } from 'lucide-react';
import { ChatService } from '../../../services/chatService';
import { useNotification, notificationHelpers } from '../../shared/Notification';

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    userId: string;
    teamId?: string;
    onChannelCreated: (channelId: string) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    userId,
    teamId,
    onChannelCreated
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'general' | 'team' | 'role'>('team');
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setIsLoading(true);
            const channel = await ChatService.createChannel({
                tenant_id: tenantId,
                name: name.trim(),
                type,
                description: description.trim(),
                team_id: type === 'team' ? teamId : undefined,
                created_by: userId
            });

            showNotification(notificationHelpers.success(
                'Channel Created',
                `Channel #${channel.name} has been created.`
            ));

            onChannelCreated(channel.id);
            onClose();
            setName('');
            setDescription('');
        } catch (error) {
            console.error('Error creating channel:', error);
            showNotification(notificationHelpers.error(
                'Creation Failed',
                'Failed to create channel. Please try again.'
            ));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-purple-600">
                    <h3 className="text-lg font-bold text-white">Create New Channel</h3>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Channel Name
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400">
                                <Hash className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="e.g. sales-team"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none h-24 resize-none"
                            placeholder="What's this channel about?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Channel Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('team')}
                                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${type === 'team'
                                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <Users className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Team</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('general')}
                                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${type === 'general'
                                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <Hash className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">General</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('role')}
                                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${type === 'role'
                                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <Lock className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Role</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
                        >
                            {isLoading ? 'Creating...' : 'Create Channel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
