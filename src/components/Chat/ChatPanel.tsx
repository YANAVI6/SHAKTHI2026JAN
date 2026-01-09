import React, { useState } from 'react';
import { X, MessageSquare, Plus, MessageCircle, Users } from 'lucide-react';
import { ChannelList } from './ChannelList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { useAuth } from '../../contexts/AuthContext';
import { useChannels } from '../../hooks/useChannels';
import { useChat } from '../../hooks/useChat';
import { ChatService } from '../../services/chatService';
import { CreateChannelModal } from './modals/CreateChannelModal';
import { DirectMessageModal } from './modals/DirectMessageModal';

import { useNotification, notificationHelpers } from '../shared/Notification';
import { ConfirmationModal } from '../shared/ConfirmationModal';

interface ChatPanelProps {
    onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const { channels, isLoading: channelsLoading, unreadCounts, markAsRead } = useChannels(user?.id || '', user?.tenantId || '', selectedChannelId);
    const { messages, sendMessage, isLoading: messagesLoading } = useChat(
        selectedChannelId,
        user?.id || ''
    );
    const { showNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<'chats' | 'people'>('chats');
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isDMOpen, setIsDMOpen] = useState(false);

    const [isJoiningChat, setIsJoiningChat] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState<string | null>(null);




    // Mark as read when new messages arrive in the active channel
    React.useEffect(() => {
        if (selectedChannelId && messages.length > 0) {
            // Use the timestamp of the latest message to avoid clock drift issues
            const latestMessage = messages[messages.length - 1];
            markAsRead(selectedChannelId, latestMessage.created_at);
        }
    }, [messages, selectedChannelId, markAsRead]);

    const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

    const handleChannelSelect = (channelId: string) => {
        setSelectedChannelId(channelId);
    };

    const handleUserSelect = async (targetUserId: string) => {
        if (!user?.tenantId || !user?.id || isJoiningChat) return;
        try {
            setIsJoiningChat(true);
            const channel = await ChatService.getOrCreateDirectChannel(
                user.tenantId,
                user.id,
                targetUserId
            );
            setSelectedChannelId(channel.id);
            setActiveTab('chats'); // Switch back to chats tab to show the conversation
        } catch (error) {
            console.error('Error starting chat:', error);
        } finally {
            setIsJoiningChat(false);
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!user?.tenantId) return;
        await sendMessage(text, user.tenantId);
    };

    const handleDeleteChannel = (channelId: string) => {
        setChannelToDelete(channelId);
    };

    const confirmDeleteChannel = async () => {
        if (!channelToDelete) return;

        try {
            await ChatService.deleteChannel(channelToDelete);
            showNotification(notificationHelpers.success('Channel Deleted', 'Channel has been removed successfully.'));

            if (selectedChannelId === channelToDelete) {
                setSelectedChannelId(null);
            }
        } catch (error) {
            console.error('Error deleting channel:', error);
            showNotification(notificationHelpers.error('Delete Failed', 'Could not delete the channel. Please try again.'));
        } finally {
            setChannelToDelete(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gradient-to-r from-purple-600 to-purple-800 shadow-sm">
                <div className="flex items-center">
                    <div className="bg-white/20 p-1.5 rounded-lg mr-2.5">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">Team Hub</h2>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-all duration-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-gray-50/30">
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-[240px] border-r border-gray-100 bg-white/50 backdrop-blur-sm flex flex-col flex-shrink-0">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 bg-white/40">
                            <button
                                onClick={() => setActiveTab('chats')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'chats'
                                    ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Chats
                            </button>
                            <button
                                onClick={() => setActiveTab('people')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'people'
                                    ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                People
                            </button>
                        </div>

                        {activeTab === 'chats' ? (
                            <>
                                <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-white/40">
                                    <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Conversations</span>
                                    <div className="flex space-x-0.5">
                                        <button
                                            onClick={() => setIsDMOpen(true)}
                                            className="p-1.5 hover:bg-purple-50 rounded-md text-gray-400 hover:text-purple-600 transition-colors"
                                            title="New DM"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setIsCreateChannelOpen(true)}
                                            className="p-1.5 hover:bg-purple-50 rounded-md text-gray-400 hover:text-purple-600 transition-colors"
                                            title="New Channel"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <ChannelList
                                        channels={channels}
                                        selectedChannelId={selectedChannelId}
                                        onSelectChannel={handleChannelSelect}
                                        onDeleteChannel={handleDeleteChannel}
                                        isLoading={channelsLoading}
                                        unreadCounts={unreadCounts}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-hidden">
                                <UserList
                                    tenantId={user?.tenantId || ''}
                                    currentUserId={user?.id || ''}
                                    onSelectUser={handleUserSelect}
                                />
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-w-[300px] bg-white">
                        {selectedChannel ? (
                            <>
                                <div className="px-4 py-2.5 border-b border-gray-100 bg-white shadow-sm flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <h3 className="font-bold text-gray-800 tracking-tight truncate">{selectedChannel.name}</h3>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Active now</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden bg-[#F8F9FD]">
                                    <MessageList
                                        messages={messages}
                                        currentUserId={user?.id || ''}
                                        isLoading={messagesLoading}
                                        channelId={selectedChannelId}
                                    />
                                </div>
                                <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                    <MessageInput
                                        onSendMessage={handleSendMessage}
                                        channelId={selectedChannelId}
                                        userId={user?.id || ''}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400 p-8 bg-gradient-to-b from-white to-gray-50">
                                <div className="text-center max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        {activeTab === 'chats' ? (
                                            <MessageSquare className="w-8 h-8 text-purple-400 opacity-60" />
                                        ) : (
                                            <Users className="w-8 h-8 text-purple-400 opacity-60" />
                                        )}
                                    </div>
                                    <h3 className="text-gray-900 font-bold mb-1">
                                        {activeTab === 'chats' ? 'Welcome to Team Chat' : 'Find Team Members'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-6">
                                        {activeTab === 'chats'
                                            ? 'Connect with your team instantly. Select a channel to get started.'
                                            : 'Browse the list to find a colleague and start a conversation.'}
                                    </p>
                                    {activeTab === 'chats' && (
                                        <button
                                            onClick={() => setIsDMOpen(true)}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
                                        >
                                            Start a Conversation
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CreateChannelModal
                isOpen={isCreateChannelOpen}
                onClose={() => setIsCreateChannelOpen(false)}
                tenantId={user?.tenantId || ''}
                userId={user?.id || ''}
                teamId={user?.teamId as string}
                onChannelCreated={(id) => setSelectedChannelId(id)}
            />

            <DirectMessageModal
                isOpen={isDMOpen}
                onClose={() => setIsDMOpen(false)}
                tenantId={user?.tenantId || ''}
                currentUserId={user?.id || ''}
                onChannelSelected={(id) => setSelectedChannelId(id)}
            />


            <ConfirmationModal
                isOpen={!!channelToDelete}
                onClose={() => setChannelToDelete(null)}
                onConfirm={confirmDeleteChannel}
                title="Delete Channel"
                message="Are you sure you want to delete this channel? This action cannot be undone and all message history will be lost."
                type="danger"
                confirmText="Delete Channel"
            />
        </div>
    );
};
