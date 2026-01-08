import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, User as UserIcon } from 'lucide-react';
import { ChatService } from '../../../services/chatService';
import { supabase } from '../../../lib/supabase';
import { useNotification, notificationHelpers } from '../../shared/Notification';

interface DirectMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    currentUserId: string;
    onChannelSelected: (channelId: string) => void;
}

interface UserSummary {
    id: string;
    name: string;
    role: string;
    emp_id: string;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    currentUserId,
    onChannelSelected
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select('id, name, role, emp_id')
                .eq('tenant_id', tenantId)
                .neq('id', currentUserId)
                .order('name');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoading(false);
        }
    }, [tenantId, currentUserId]);

    useEffect(() => {
        if (isOpen) {
            loadUsers();
        }
    }, [isOpen, loadUsers]);

    const handleStartChat = async (targetUserId: string) => {
        try {
            setIsLoading(true);
            const channel = await ChatService.getOrCreateDirectChannel(
                tenantId,
                currentUserId,
                targetUserId
            );
            onChannelSelected(channel.id);
            onClose();
        } catch (error) {
            console.error('Error starting direct message:', error);
            showNotification(notificationHelpers.error(
                'Action Failed',
                'Failed to start chat. Please try again.'
            ));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-purple-600">
                    <h3 className="text-lg font-bold text-white">New Direct Message</h3>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or employee ID..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && users.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-500">Loading team members...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredUsers.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No team members found matching your search.
                                </div>
                            ) : (
                                filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleStartChat(user.id)}
                                        className="w-full flex items-center px-4 py-3 hover:bg-purple-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-purple-100 transition-colors">
                                            <UserIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded mr-2">{user.role}</span>
                                                <span>ID: {user.emp_id}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
