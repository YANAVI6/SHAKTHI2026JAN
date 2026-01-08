import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChatService, UserStatus } from '../services/chatService';

/**
 * Hook for tracking user online/offline status
 */
export const useUserStatus = (tenantId: string) => {
    const [onlineUsers, setOnlineUsers] = useState<UserStatus[]>([]);

    useEffect(() => {
        if (!tenantId) return;

        // Load initial online users
        const loadOnlineUsers = async () => {
            const users = await ChatService.getOnlineUsers(tenantId);
            setOnlineUsers(users);
        };

        loadOnlineUsers();

        // Subscribe to status changes
        const channel = supabase
            .channel('user-status')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_user_status',
                    filter: `tenant_id=eq.${tenantId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const status = payload.new as UserStatus;
                        if (status.status === 'online') {
                            setOnlineUsers((prev) => {
                                const exists = prev.find((u) => u.user_id === status.user_id);
                                if (exists) {
                                    return prev.map((u) =>
                                        u.user_id === status.user_id ? status : u
                                    );
                                }
                                return [...prev, status];
                            });
                        } else {
                            setOnlineUsers((prev) =>
                                prev.filter((u) => u.user_id !== status.user_id)
                            );
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOnlineUsers((prev) =>
                            prev.filter((u) => u.user_id !== payload.old.user_id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [tenantId]);

    return onlineUsers;
};
