import { supabase } from '../lib/supabase';

// Types
export interface ChatChannel {
    id: string;
    tenant_id: string;
    name: string;
    type: 'general' | 'team' | 'direct' | 'role';
    description?: string;
    team_id?: string;
    role?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
    avatarUrl?: string; // Add avatarUrl
    last_read_at?: string; // Add last_read_at for sync
}

export interface ChatMessage {
    id: string;
    tenant_id: string;
    channel_id: string;
    sender_id: string;
    message_text: string;
    reply_to?: string;
    is_edited: boolean;
    created_at: string;
    updated_at: string;
    sender?: {
        id: string;
        name: string;
        emp_id: string;
        avatarUrl?: string; // Add avatarUrl
    };
}

export interface ChatChannelMember {
    id: string;
    channel_id: string;
    user_id: string;
    joined_at: string;
    last_read_at: string;
    is_muted: boolean;
}

export interface UserStatus {
    user_id: string;
    tenant_id: string;
    status: 'online' | 'away' | 'offline';
    last_seen: string;
}

export class ChatService {
    // ==================== CHANNEL MANAGEMENT ====================

    /**
     * Get all channels for a user
     */
    static async getChannels(tenantId: string): Promise<ChatChannel[]> {
        try {
            const { data, error } = await supabase
                .from('chat_channels')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching channels:', error);
            throw error;
        }
    }

    /**
     * Get channels user is a member of
     */
    static async getUserChannels(userId: string): Promise<ChatChannel[]> {
        try {
            // 1. Fetch channels with members, but NOT joining employees directly (FK removed)
            const { data, error } = await supabase
                .from('chat_channel_members')
                .select(`
                  channel_id,
                  last_read_at,
                  chat_channels (
                    *,
                    chat_channel_members (
                      user_id
                    )
                  )
                `)
                .eq('user_id', userId);

            if (error) throw error;

            // 2. Collect all user IDs from all channels to fetch names in batch
            const allUserIds = new Set<string>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data?.forEach((item: any) => {
                if (item.chat_channels?.chat_channel_members) {
                    item.chat_channels.chat_channel_members.forEach((m: { user_id: string }) => {
                        allUserIds.add(m.user_id);
                    });
                }
            });

            // 3. Fetch user details
            const { data: users } = await supabase
                .from('employees')
                .select('id, name, avatar_url')
                .in('id', Array.from(allUserIds));

            const userMap = new Map(users?.map(u => [u.id, { name: u.name, avatarUrl: u.avatar_url }]) || []);

            // 4. Map back to channels with names formatted
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data?.map((item: any) => {
                const channel = item.chat_channels;
                if (!channel) return null;

                // Reconstruct the structure _formatChannelName expects, but with manually populated names
                const channelWithNames = {
                    ...channel,
                    last_read_at: item.last_read_at,
                    chat_channel_members: channel.chat_channel_members.map((m: { user_id: string }) => ({
                        user_id: m.user_id,
                        employees: {
                            name: userMap.get(m.user_id)?.name || 'Unknown User',
                            avatarUrl: userMap.get(m.user_id)?.avatarUrl
                        }
                    }))
                };

                return this._formatChannelName(channelWithNames, userId);
            }).filter(Boolean) as ChatChannel[]) || [];

        } catch (error) {
            console.error('Error fetching user channels:', error);
            throw error;
        }
    }

    /**
     * Get a single channel with formatted name
     */
    static async getChannel(channelId: string, currentUserId: string): Promise<ChatChannel | null> {
        try {
            // 1. Fetch channel and its members (no employee join)
            const { data, error } = await supabase
                .from('chat_channels')
                .select(`
                    *,
                    chat_channel_members (
                        user_id
                    )
                `)
                .eq('id', channelId)
                .single();

            if (error) throw error;
            if (!data) return null;

            // 2. Fetch member names
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userIds = (data.chat_channel_members as any[])?.map((m: any) => m.user_id) || [];

            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from('employees')
                    .select('id, name, avatar_url')
                    .in('id', userIds);

                const userMap = new Map(users?.map(u => [u.id, { name: u.name, avatarUrl: u.avatar_url }]) || []);

                // 3. Inject names manually
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const injectedMembers = (data.chat_channel_members as any[]).map((m: any) => ({
                    user_id: m.user_id,
                    employees: {
                        name: userMap.get(m.user_id)?.name || 'Unknown User',
                        avatarUrl: userMap.get(m.user_id)?.avatarUrl
                    }
                }));

                const channelWithNames = {
                    ...data,
                    chat_channel_members: injectedMembers
                };

                return this._formatChannelName(channelWithNames, currentUserId);
            }

            return this._formatChannelName(data, currentUserId);
        } catch (error) {
            console.error('Error fetching channel:', error);
            return null;
        }
    }

    /**
     * Helper to format channel name for DMs
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static _formatChannelName(channel: any, currentUserId: string): ChatChannel {
        // If it's a DM, try to find the other person's name
        if (channel.type === 'direct' && channel.chat_channel_members) {
            const otherMember = channel.chat_channel_members.find(
                (m: { user_id: string }) => m.user_id !== currentUserId
            );

            if (otherMember?.employees?.name) {
                // Return a new object to avoid mutation issues if referenced elsewhere
                return {
                    ...channel,
                    name: otherMember.employees.name,
                    avatarUrl: otherMember.employees.avatarUrl
                };
            }
        }
        return channel;
    }

    /**
     * Create a new channel
     */
    static async createChannel(data: {
        tenant_id: string;
        name: string;
        type: 'general' | 'team' | 'direct' | 'role';
        description?: string;
        team_id?: string;
        role?: string;
        created_by: string;
    }): Promise<ChatChannel> {
        try {
            const { data: channels, error } = await supabase
                .from('chat_channels')
                .insert(data)
                .select();

            const channel = channels?.[0];

            if (error) {
                // If channel already exists (409 conflict), fetch and return it
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (error.code === '23505' || error.code === '409') {
                    // Try to find the existing channel
                    // We need to match based on unique constraints: tenant_id + name + type
                    const { data: existingChannels, error: fetchError } = await supabase
                        .from('chat_channels')
                        .select('*')
                        .eq('tenant_id', data.tenant_id)
                        .eq('name', data.name)
                        .eq('type', data.type);

                    // If multiple exist (due to previous lack of unique constraint), take the first one
                    const existingChannel = existingChannels?.[0];

                    if (existingChannel) {
                        // Ensure creator is joined even if channel existed
                        await this.joinChannel(existingChannel.id, data.created_by);
                        return existingChannel;
                    }
                    if (fetchError) console.error('Error fetching existing channel after conflict:', fetchError);
                }
                throw error;
            }

            // Auto-join creator to channel
            await this.joinChannel(channel.id, data.created_by);

            return channel;
        } catch (error) {
            console.error('Error creating channel:', error);
            throw error;
        }
    }

    /**
     * Get or create a direct message channel between two users
     */
    static async getOrCreateDirectChannel(
        tenantId: string,
        userId1: string,
        userId2: string
    ): Promise<ChatChannel> {
        try {
            // 1. Check if DM channel already exists
            // We only need to fetch channels where the current user is a member
            // The RLS and !inner join on chat_channel_members will handle this implicitly
            // but we can optimize by filtering on the current user's membership explicitly if needed.
            const { data: existingChannels, error: searchError } = await supabase
                .from('chat_channels')
                .select(`
                    *,
                    chat_channel_members!inner(user_id)
                `)
                .eq('tenant_id', tenantId)
                .eq('type', 'direct');

            if (searchError) throw searchError;

            // Find channel where both users are members
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dmChannel = existingChannels?.find((channel: any) => {
                const memberIds = channel.chat_channel_members.map((m: { user_id: string }) => m.user_id);
                return memberIds.includes(userId1) && memberIds.includes(userId2);
            });

            if (dmChannel) {
                return dmChannel;
            }

            // 2. Create new DM channel if not found
            // Use a specific name format to minimize duplicates: DM-MIN_ID-MAX_ID
            // exact order ensures name uniqueness regardless of who starts it
            const [u1, u2] = [userId1, userId2].sort();
            const channelName = `DM-${u1}-${u2}`;

            try {
                const { data: channels, error: createError } = await supabase
                    .from('chat_channels')
                    .insert({
                        tenant_id: tenantId,
                        name: channelName,
                        type: 'direct',
                        created_by: userId1
                    })
                    .select();

                const newChannel = channels?.[0];
                if (createError) throw createError;

                // Add both users as members
                // Use Promise.all to do it in parallel
                await Promise.all([
                    this.joinChannel(newChannel.id, userId1),
                    this.joinChannel(newChannel.id, userId2)
                ]);

                return newChannel;
            } catch (createError) {
                // If creation failed due to conflict, it means the channel (name+tenant+type) already exists
                // We should fetch it and ensure membership
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const errCode = (createError as any)?.code;
                if (errCode === '23505' || errCode === '409') {
                    const { data: existingChannels, error: fetchError } = await supabase
                        .from('chat_channels')
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .eq('name', channelName)
                        .eq('type', 'direct');

                    const existingChannel = existingChannels?.[0];

                    if (existingChannel) {
                        // Ensure both are members (in case one side failed previously)
                        await Promise.all([
                            this.joinChannel(existingChannel.id, userId1),
                            this.joinChannel(existingChannel.id, userId2)
                        ]);
                        return existingChannel;
                    }
                    if (fetchError) console.error('Error fetching existing DM after conflict:', fetchError);
                }
                throw createError;
            }
        } catch (error) {
            console.error('Error getting/creating DM channel:', error);
            throw error;
        }
    }

    /**
     * Join a channel
     */
    static async joinChannel(channelId: string, userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_channel_members')
                .upsert({
                    channel_id: channelId,
                    user_id: userId
                }, { onConflict: 'channel_id, user_id', ignoreDuplicates: true });

            if (error) throw error;
        } catch (error) {
            // Ignore FK violations (23503) if user table logic isn't fully migrated yet
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const code = (error as any)?.code;
            if (code === '23503') {
                return;
            }
            console.error('Error joining channel:', error);
            throw error;
        }
    }

    /**
     * Leave a channel
     */
    static async leaveChannel(channelId: string, userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error leaving channel:', error);
            throw error;
        }
    }

    /**
     * Delete a channel
     */
    static async deleteChannel(channelId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_channels')
                .delete()
                .eq('id', channelId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting channel:', error);
            throw error;
        }
    }

    // ==================== MESSAGING ====================

    /**
     * Get messages for a channel
     */
    static async getMessages(
        channelId: string,
        limit: number = 50
    ): Promise<ChatMessage[]> {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            if (!data || data.length === 0) return [];

            // Manually fetch sender details since FKs are removed
            const senderIds = [...new Set(data.map((msg: { sender_id: string }) => msg.sender_id))];

            // Try fetching from employees
            const { data: employees } = await supabase
                .from('employees')
                .select('id, name, emp_id, avatar_url')
                .in('id', senderIds);

            const employeeMap = new Map(employees?.map((e: { id: string, avatar_url?: string }) => [e.id, e]) || []);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data || []).map((msg: any) => ({
                ...msg,
                sender: employeeMap.get(msg.sender_id) ? {
                    ...employeeMap.get(msg.sender_id),
                    avatarUrl: employeeMap.get(msg.sender_id)?.avatar_url
                } : {
                    id: msg.sender_id,
                    name: 'Unknown User',
                    emp_id: 'UNKNOWN'
                }
            })).reverse(); // Reverse to show oldest first

        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    }

    /**
     * Send a message
     */
    static async sendMessage(data: {
        tenant_id: string;
        channel_id: string;
        sender_id: string;
        message_text: string;
        reply_to?: string;
    }): Promise<ChatMessage> {
        try {
            const { data: message, error } = await supabase
                .from('chat_messages')
                .insert(data)
                .select()
                .single();

            if (error) throw error;

            // Update last_read_at for sender
            await this.updateLastRead(data.channel_id, data.sender_id);

            // Fetch sender details separately or return optimistic
            // Start simple: try fetch
            const { data: sender } = await supabase
                .from('employees')
                .select('id, name, emp_id, avatar_url')
                .eq('id', data.sender_id)
                .maybeSingle();

            return {
                ...message,
                sender: sender ? {
                    ...sender,
                    avatarUrl: sender.avatar_url
                } : {
                    id: data.sender_id,
                    name: 'Me',
                    emp_id: '',
                    avatarUrl: undefined
                }
            } as ChatMessage;

            // Note: The original code had reachable code after return and correct it here
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Edit a message
     */
    static async editMessage(messageId: string, newText: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .update({ message_text: newText })
                .eq('id', messageId);

            if (error) throw error;
        } catch (error) {
            console.error('Error editing message:', error);
            throw error;
        }
    }

    /**
     * Delete a message
     */
    static async deleteMessage(messageId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    /**
     * Update last read timestamp for a channel
     */
    static async updateLastRead(channelId: string, userId: string, timestamp?: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_channel_members')
                .update({ last_read_at: timestamp || new Date().toISOString() })
                .eq('channel_id', channelId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating last read:', error);
            throw error;
        }
    }

    /**
     * Get unread count for a channel
     */
    static async getUnreadCount(channelId: string, userId: string): Promise<number> {
        try {
            // Get user's last read timestamp
            const { data: membership, error: memberError } = await supabase
                .from('chat_channel_members')
                .select('last_read_at')
                .eq('channel_id', channelId)
                .eq('user_id', userId)
                .single();

            if (memberError) throw memberError;

            // Count messages after last read
            const { count, error: countError } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channelId)
                .gt('created_at', membership.last_read_at)
                .neq('sender_id', userId); // Exclude own messages

            if (countError) throw countError;

            return count || 0;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    // ==================== USER STATUS ====================

    /**
     * Update user status
     */
    static async updateUserStatus(
        userId: string,
        tenantId: string,
        status: 'online' | 'away' | 'offline'
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_user_status')
                .upsert({
                    user_id: userId,
                    tenant_id: tenantId,
                    status: status,
                    last_seen: new Date().toISOString()
                }, { onConflict: 'user_id' }); // Conflict target must match PRIMARY KEY

            if (error) {
                console.error('❌ Error updating user status:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    userId,
                    tenantId,
                    status
                });
            }
        } catch (error) {
            console.error('❌ Exception updating user status:', error);
        }
    }

    /**
     * Get online users in tenant
     */
    static async getOnlineUsers(tenantId: string): Promise<UserStatus[]> {
        try {
            const { data, error } = await supabase
                .from('chat_user_status')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('status', 'online');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching online users:', error);
            return [];
        }
    }

    // ==================== TYPING INDICATORS ====================

    /**
     * Start typing indicator
     */
    static async startTyping(channelId: string, userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_typing_indicators')
                .upsert({
                    channel_id: channelId,
                    user_id: userId,
                    started_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error starting typing:', error);
        }
    }

    /**
     * Stop typing indicator
     */
    static async stopTyping(channelId: string, userId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('chat_typing_indicators')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error stopping typing:', error);
        }
    }

    // ==================== STATS ====================

    /**
     * Get unread counts for all channels for a user
     * Returns a map of channel_id -> count
     */
    static async getUnreadCounts(userId: string): Promise<Record<string, number>> {
        try {
            // 1. Get all memberships for the user to know last_read_at
            const { data: memberships, error: memberError } = await supabase
                .from('chat_channel_members')
                .select('channel_id, last_read_at')
                .eq('user_id', userId);

            if (memberError) throw memberError;
            if (!memberships || memberships.length === 0) return {};

            // 2. Fetch unread counts for each channel
            // Note: Ideally this would be a single optimized RPC call or view
            // to avoid N+1 queries, but Supabase/PostgREST doesn't support 
            // complex join+count well without a view.
            // For now, we'll use Promise.all which is acceptable for < 50 channels.

            const countsCallback = memberships.map(async (member) => {
                const { count, error } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('channel_id', member.channel_id)
                    .gt('created_at', member.last_read_at)
                    .neq('sender_id', userId); // Don't count own messages

                if (error) {
                    console.error(`Error counting unread for channel ${member.channel_id}:`, error);
                    return { channelId: member.channel_id, count: 0 };
                }

                return { channelId: member.channel_id, count: count || 0 };
            });

            const results = await Promise.all(countsCallback);

            // Convert to map
            const unreadMap: Record<string, number> = {};
            results.forEach(r => {
                if (r.count > 0) {
                    unreadMap[r.channelId] = r.count;
                }
            });

            return unreadMap;
        } catch (error) {
            console.error('Error fetching unread counts:', error);
            return {};
        }
    }
}
