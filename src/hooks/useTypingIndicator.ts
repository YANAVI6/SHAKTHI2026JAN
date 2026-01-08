import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TypingUser {
    user_id: string;
    user_name?: string;
}

/**
 * Hook for typing indicators in a channel
 */
export const useTypingIndicator = (channelId: string | null) => {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    useEffect(() => {
        if (!channelId) {
            return;
        }

        // Subscribe to typing indicators
        const channel = supabase
            .channel(`typing:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_typing_indicators',
                    filter: `channel_id=eq.${channelId}`
                },
                async (payload) => {
                    // Fetch user name
                    const { data: users } = await supabase
                        .from('employees')
                        .select('id, name')
                        .eq('id', payload.new.user_id)
                        .limit(1);

                    const user = users?.[0];

                    if (user) {
                        setTypingUsers((prev) => {
                            const exists = prev.find((u) => u.user_id === user.id);
                            if (exists) return prev;
                            return [...prev, { user_id: user.id, user_name: user.name }];
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'chat_typing_indicators',
                    filter: `channel_id=eq.${channelId}`
                },
                async (payload) => {
                    // Ensure user is in the list
                    const { data: users } = await supabase
                        .from('employees')
                        .select('id, name')
                        .eq('id', payload.new.user_id)
                        .limit(1);

                    const user = users?.[0];

                    if (user) {
                        setTypingUsers((prev) => {
                            const exists = prev.find((u) => u.user_id === user.id);
                            if (exists) return prev;
                            return [...prev, { user_id: user.id, user_name: user.name }];
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'chat_typing_indicators',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    setTypingUsers((prev) =>
                        prev.filter((u) => u.user_id !== payload.old.user_id)
                    );
                }
            )
            .subscribe();

        // Auto-cleanup: remove typing indicators older than 10 seconds
        const cleanupInterval = setInterval(() => {
            setTypingUsers((prev) => {
                if (prev.length === 0) return prev;
                // In production, you'd check timestamps, but for now just clear periodically
                return [];
            });
        }, 10000);

        return () => {
            channel.unsubscribe();
            clearInterval(cleanupInterval);
        };
    }, [channelId]);

    return typingUsers;
};
