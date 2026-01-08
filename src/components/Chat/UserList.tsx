import React, { useState, useEffect, useCallback } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserSummary {
    id: string;
    name: string;
    role: string;
    emp_id: string;
    avatar_url?: string;
}

interface UserListProps {
    tenantId: string;
    currentUserId: string;
    onSelectUser: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({
    tenantId,
    currentUserId,
    onSelectUser
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userStatuses, setUserStatuses] = useState<Record<string, string>>({});

    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select('id, name, role, emp_id, avatar_url')
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
        loadUsers();
    }, [loadUsers]);

    // Subscribe to detailed user activity status
    useEffect(() => {
        if (!tenantId) return;

        // Initial fetch
        const fetchStatuses = async () => {
            const { data } = await supabase
                .from('user_activity')
                .select('employee_id, status')
                .eq('tenant_id', tenantId);

            if (data) {
                const newStatuses: Record<string, string> = {};
                data.forEach(item => {
                    newStatuses[item.employee_id] = item.status;
                });
                setUserStatuses(newStatuses);
            }
        };

        fetchStatuses();

        // Real-time subscription
        const channel = supabase
            .channel(`user-activity:${tenantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_activity',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const newActivity = payload.new as any;
                        setUserStatuses(prev => ({
                            ...prev,
                            [newActivity.employee_id]: newActivity.status
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white/50">
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-100 bg-white/40">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search people..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none text-xs"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                {isLoading && users.length === 0 ? (
                    <div className="p-4 text-center">
                        <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-xs text-gray-400">Loading...</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-xs">
                                No users found
                            </div>
                        ) : (
                            filteredUsers.map(user => {
                                // Check status
                                const rawStatus = userStatuses[user.id] || 'offline';
                                const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
                                const statusLower = rawStatus.toLowerCase();

                                let statusColor = 'bg-gray-400'; // Default Offline gray
                                if (statusLower === 'online') statusColor = 'bg-green-500';
                                else if (statusLower === 'idle' || statusLower === 'busy') statusColor = 'bg-red-500';
                                else if (statusLower === 'break' || statusLower === 'away') statusColor = 'bg-orange-400';

                                const isOffline = statusLower === 'offline';

                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => onSelectUser(user.id)}
                                        className="w-full flex items-center px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-200 group border border-transparent hover:border-gray-100"
                                    >
                                        <div className="relative w-8 h-8 mr-3">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-full object-cover border border-gray-100"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                                                    <UserIcon className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                                                </div>
                                            )}
                                            {!isOffline && (
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColor} border-2 border-white rounded-full`} title={status}></div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 truncate">{user.name}</p>
                                            <div className="flex items-center text-[10px] text-gray-400 gap-1">
                                                <span className="truncate">{user.role}</span>
                                                {!isOffline && <span className="text-[9px] opacity-75">• {status}</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
