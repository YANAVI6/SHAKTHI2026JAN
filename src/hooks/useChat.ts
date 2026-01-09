import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatService, ChatMessage } from '../services/chatService';

/**
 * Hook for real-time chat messages in a channel
 */
export const useChat = (channelId: string | null, userId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load initial messages
    useEffect(() => {
        if (!channelId) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const msgs = await ChatService.getMessages(channelId);
                setMessages(msgs);
            } catch (err) {
                console.error('Error loading messages:', err);
                setError('Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [channelId]);

    // Subscribe to new messages
    useEffect(() => {
        if (!channelId) return;

        const channel = supabase
            .channel(`messages:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.${channelId}`
                },
                async (payload) => {
                    // Use payload.new directly instead of re-fetching
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const messageData = payload.new as any;

                    if (messageData && messageData.sender_id) {
                        // 1. Immediately add message with placeholder/cached sender to avoid lag
                        const tempSender = {
                            id: messageData.sender_id,
                            name: '...', // Placeholder, will be updated momentarily
                            emp_id: ''
                        };

                        const fullMessage: ChatMessage = {
                            ...messageData,
                            sender: tempSender
                        };

                        setMessages((prev) => {
                            if (prev.some(msg => msg.id === fullMessage.id)) {
                                return prev;
                            }
                            return [...prev, fullMessage];
                        });

                        // 2. Fetch real sender details asynchronously
                        try {
                            const { data: senderData } = await supabase
                                .from('employees')
                                .select('id, name, emp_id, avatar_url')
                                .eq('id', messageData.sender_id)
                                .maybeSingle();

                            if (senderData) {
                                // 3. Update the message with real sender info
                                setMessages((prev) =>
                                    prev.map(msg =>
                                        msg.id === messageData.id
                                            ? {
                                                ...msg,
                                                sender: {
                                                    ...senderData,
                                                    avatarUrl: senderData.avatar_url
                                                }
                                            }
                                            : msg
                                    )
                                );
                            }
                        } catch (err) {
                            console.error('Error fetching sender details:', err);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                        )
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to channel:', channelId);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Failed to subscribe to channel:', channelId);
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [channelId]);

    // Send message function
    const sendMessage = useCallback(
        async (text: string, tenantId: string, replyTo?: string) => {
            if (!channelId || !text.trim()) return;

            try {
                const newMessage = await ChatService.sendMessage({
                    tenant_id: tenantId,
                    channel_id: channelId,
                    sender_id: userId,
                    message_text: text.trim(),
                    reply_to: replyTo
                });

                // Optimistically add message to UI
                setMessages((prev) => {
                    if (prev.some(msg => msg.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
            } catch (err) {
                console.error('Error sending message:', err);
                throw err;
            }
        },
        [channelId, userId]
    );

    return {
        messages,
        isLoading,
        error,
        sendMessage
    };
};
