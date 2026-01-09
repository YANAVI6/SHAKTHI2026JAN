import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChatService, ChatChannel } from '../services/chatService';

/**
 * Hook for managing user's chat channels
 */
export const useChannels = (userId: string, tenantId: string, activeChannelId?: string | null) => {
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, string>>({});

    // Refs for realtime listener to avoid stale closure or dependency-array re-creation
    const channelsRef = useRef<ChatChannel[]>([]);
    const lastReadRef = useRef<Record<string, string>>({});

    useEffect(() => {
        channelsRef.current = channels;
    }, [channels]);

    useEffect(() => {
        lastReadRef.current = lastReadTimestamps;
    }, [lastReadTimestamps]);

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

                // Initialize last read timestamps from channels
                const timestamps: Record<string, string> = {};
                userChannels.forEach(c => {
                    if (c.last_read_at) timestamps[c.id] = c.last_read_at;
                });
                setLastReadTimestamps(timestamps);
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
        if (!userId || !tenantId) {
            console.warn('⚠️ useChannels: Missing userId or tenantId. Realtime disabled.', { userId, tenantId });
            return;
        }

        console.log('🔌 useChannels: Subscribing to Unread Messages for Tenant:', tenantId);

        // Use a unique channel name to prevent conflicts when multiple components use this hook
        const uniqueChannelId = `unread-messages-${userId}-${Math.random().toString(36).slice(2, 9)}`;
        const messageChannel = supabase
            .channel(uniqueChannelId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                    // Removing server-side filter to ensure delivery. Filtering client-side below.
                },
                (payload) => {
                    console.log('🔔 useChannels: Realtime Payload Received:', payload);

                    // Client-side Tenant Filter
                    if (payload.new.tenant_id !== tenantId) {
                        console.log('🚫 useChannels: Ignoring message (wrong tenant)', payload.new.tenant_id);
                        return;
                    }

                    // Only increment if not sent by current user AND not currently active
                    const isSentByCurrentUser = payload.new.sender_id === userId;
                    const isActiveChannel = payload.new.channel_id === activeChannelId;

                    console.log('🔍 useChannels: Checking message:', {
                        sender_id: payload.new.sender_id,
                        current_userId: userId,
                        isSentByCurrentUser,
                        channel_id: payload.new.channel_id,
                        activeChannelId,
                        isActiveChannel
                    });

                    if (!isSentByCurrentUser && !isActiveChannel) {
                        const channelId = payload.new.channel_id;
                        // CRITICAL: Only increment if the user is actually a member of this channel
                        const isMember = channelsRef.current.some(c => c.id === channelId);

                        if (isMember) {
                            // GATED: Only increment if message is NEWER than our last known read point
                            const msgAt = payload.new.created_at;
                            const lastRead = lastReadRef.current[channelId];

                            if (!lastRead || msgAt > lastRead) {
                                console.log('✅ useChannels: Incrementing count', channelId);
                                setUnreadCounts(prev => ({
                                    ...prev,
                                    [channelId]: (prev[channelId] || 0) + 1
                                }));
                            } else {
                                console.log('🚫 useChannels: Ignoring old message', { msgAt, lastRead });
                            }
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log(`🔌 useChannels: Subscription Status (${uniqueChannelId}):`, status);
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ useChannels: Realtime Connection Failed!');
                }
            });

        return () => {
            messageChannel.unsubscribe();
        };
    }, [userId, tenantId, activeChannelId]);

    // Subscribe to channel changes
    useEffect(() => {
        if (!userId) return;

        // Use a unique channel name to prevent conflicts
        const uniqueMembershipChannelId = `user-channels-${userId}-${Math.random().toString(36).slice(2, 9)}`;
        const channel = supabase
            .channel(uniqueMembershipChannelId)
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
                        setChannels((prev) => {
                            if (prev.some(c => c.id === channelData.id)) return prev;
                            return [...prev, channelData];
                        });
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
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'chat_channel_members',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    // When the user marks a channel as read (possibly on another tab or instance)
                    // we immediately clear it here to stay in sync.
                    console.log('🔄 useChannels: Membership update received (read status check)', payload.new);

                    const channelId = payload.new.channel_id;
                    const lastRead = payload.new.last_read_at;

                    if (lastRead) {
                        setLastReadTimestamps(prev => ({
                            ...prev,
                            [channelId]: lastRead
                        }));
                    }

                    setUnreadCounts(prev => ({
                        ...prev,
                        [channelId]: 0
                    }));
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
                    // Handle leaving a channel
                    setChannels((prev) =>
                        prev.filter((ch) => ch.id !== payload.old.channel_id)
                    );
                    setUnreadCounts(prev => {
                        const newCounts = { ...prev };
                        delete newCounts[payload.old.channel_id];
                        return newCounts;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'chat_channels'
                },
                (payload) => {
                    // Handle channel deletion
                    setChannels((prev) =>
                        prev.filter((ch) => ch.id !== payload.old.id)
                    );
                    setUnreadCounts(prev => {
                        const newCounts = { ...prev };
                        delete newCounts[payload.old.id];
                        return newCounts;
                    });
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [userId]);

    const markAsRead = useCallback(async (channelId: string, timestamp?: string) => {
        const readAt = timestamp || new Date().toISOString();

        // Optimistically clear local count and update timestamp
        setUnreadCounts(prev => ({
            ...prev,
            [channelId]: 0
        }));

        setLastReadTimestamps(prev => ({
            ...prev,
            [channelId]: readAt
        }));

        // Persist to backend
        if (userId) {
            try {
                await ChatService.updateLastRead(channelId, userId, readAt);
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
