import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatService, ChatChannel } from '../services/chatService';

/**
 * Hook for managing user's chat channels
 */
export const useChannels = (userId: string) => {
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // Load user's channels
    useEffect(() => {
        if (!userId) return;

        const loadChannels = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const userChannels = await ChatService.getUserChannels(userId);
                setChannels(userChannels);

                // Load unread counts
                const counts = await ChatService.getUnreadCounts(userId);
                setUnreadCounts(counts);
            } catch (err) {
                console.error('Error loading channels:', err);
                setError('Failed to load channels');
            } finally {
                setIsLoading(false);
            }
        };

        loadChannels();
    }, [userId]);

    // Handle incoming messages for unread counts
    useEffect(() => {
        if (!userId) return;

        const messageChannel = supabase
            .channel('unread-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                },
                (payload) => {
                    // Only increment if not sent by current user
                    if (payload.new.sender_id !== userId) {
                        setUnreadCounts(prev => ({
                            ...prev,
                            [payload.new.channel_id]: (prev[payload.new.channel_id] || 0) + 1
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            messageChannel.unsubscribe();
        };
    }, [userId]);

    // Subscribe to channel changes
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('user-channels')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_channel_members',
                    filter: `user_id=eq.${userId}`
                },
                async (payload) => {
                    // Fetch the full channel data with formatted name
                    const channelData = await ChatService.getChannel(payload.new.channel_id, userId);

                    if (channelData) {
                        setChannels((prev) => [...prev, channelData]);
                        // Initialize unread count for new channel
                        setUnreadCounts(prev => ({
                            ...prev,
                            [channelData.id]: 0
                        }));
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'chat_channel_members',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setChannels((prev) =>
                        prev.filter((ch) => ch.id !== payload.old.channel_id)
                    );
                    // Remove from unread counts
                    setUnreadCounts(prev => {
                        const newCounts = { ...prev };
                        delete newCounts[payload.old.channel_id];
                        return newCounts;
                    });
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [userId]);

    const markAsRead = useCallback(async (channelId: string) => {
        // Optimistically clear local count
        setUnreadCounts(prev => ({
            ...prev,
            [channelId]: 0
        }));

        // Persist to backend
        if (userId) {
            try {
                await ChatService.updateLastRead(channelId, userId);
            } catch (error) {
                console.error('Failed to mark channel as read:', error);
            }
        }
    }, [userId]);

    return {
        channels,
        isLoading,
        error,
        unreadCounts,
        markAsRead
    };
};
