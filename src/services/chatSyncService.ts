import { ChatService } from './chatService';
import { supabase } from '../lib/supabase';

export class ChatSyncService {
    /**
     * Ensures mandatory channels exist for a tenant and user
     */
    static async syncUserChannels(tenantId: string, userId: string, role: string, teamId?: string) {
        try {
            console.log(`🔄 Syncing chat channels for user ${userId} in tenant ${tenantId}`);

            // 1. Ensure "general" channel exists
            const generalChannel = await this.ensureChannelExists(tenantId, 'general', 'General', 'Common channel for everyone', userId);
            if (generalChannel) await ChatService.joinChannel(generalChannel.id, userId);

            // 2. Ensure role-based channel exists
            if (role) {
                const roleChannel = await this.ensureChannelExists(tenantId, 'role', `#${role}s`, `Channel for all ${role}s`, userId, undefined, role);
                if (roleChannel) await ChatService.joinChannel(roleChannel.id, userId);
            }

            // 3. Ensure team-specific channel exists
            if (teamId) {
                // Fetch team name
                const { data: team } = await supabase
                    .from('teams')
                    .select('name')
                    .eq('id', teamId)
                    .single();

                if (team) {
                    const teamChannel = await this.ensureChannelExists(tenantId, 'team', `#team-${team.name.toLowerCase().replace(/\s+/g, '-')}`, `Channel for ${team.name}`, userId, teamId);
                    if (teamChannel) await ChatService.joinChannel(teamChannel.id, userId);
                }
            }

            console.log('✅ Chat channels synced successfully');
        } catch (error) {
            console.error('Error syncing user channels:', error);
        }
    }

    private static async ensureChannelExists(
        tenantId: string,
        type: 'general' | 'role' | 'team',
        name: string,
        description: string,
        userId: string,
        teamId?: string,
        role?: string
    ) {
        try {
            // Check if exists
            let query = supabase
                .from('chat_channels')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('type', type);

            if (teamId) query = query.eq('team_id', teamId);
            if (role) query = query.eq('role', role);
            if (type === 'general') query = query.eq('name', name);

            const { data } = await query.maybeSingle();

            if (data) return data;

            // Create if missing
            return await ChatService.createChannel({
                tenant_id: tenantId,
                name,
                type,
                description,
                team_id: teamId,
                role,
                created_by: userId
            });
        } catch (error) {
            console.error(`Error ensuring ${type} channel exists:`, error);
            return null;
        }
    }
}
