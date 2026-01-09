import React, { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { ChannelList } from './ChannelList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useAuth } from '../../contexts/AuthContext';
import { useChannels } from '../../hooks/useChannels';
import { useChat } from '../../hooks/useChat';
import { CreateChannelModal } from './modals/CreateChannelModal';
import { DirectMessageModal } from './modals/DirectMessageModal';
import { Plus, MessageCircle } from 'lucide-react';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const { channels, isLoading: channelsLoading, unreadCounts, markAsRead } = useChannels(user?.id || '', user?.tenantId || '');
    const { messages, sendMessage, isLoading: messagesLoading } = useChat(
        selectedChannelId,
        user?.id || ''
    );

    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isDMOpen, setIsDMOpen] = useState(false);

    React.useEffect(() => {
        if (selectedChannelId) {
            markAsRead(selectedChannelId);
        }
    }, [selectedChannelId, markAsRead]);


    if (!isOpen) return null;

    const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

    const handleChannelSelect = (channelId: string) => {
        setSelectedChannelId(channelId);
        markAsRead(channelId);
    };

    const handleSendMessage = async (text: string) => {
        if (!user?.tenantId) return;
        await sendMessage(text, user.tenantId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
                    <div className="flex items-center">
                        <MessageSquare className="w-6 h-6 text-white mr-3" />
                        <h2 className="text-xl font-bold text-white">Team Chat</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Channels Sidebar */}
                    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                            <h3 className="font-bold text-gray-800">Messages</h3>
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => setIsDMOpen(true)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
                                    title="New DM"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsCreateChannelOpen(true)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-purple-600 transition-colors"
                                    title="New Channel"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChannelList
                                channels={channels}
                                selectedChannelId={selectedChannelId}
                                onSelectChannel={handleChannelSelect}
                                onDeleteChannel={() => { }} // Not implemented in modal yet
                                isLoading={channelsLoading}
                                unreadCounts={unreadCounts}
                            />
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col">
                        {selectedChannel ? (
                            <>
                                {/* Channel Header */}
                                <div className="p-4 border-b border-gray-200 bg-white">
                                    <h3 className="font-semibold text-gray-900">{selectedChannel.name}</h3>
                                    {selectedChannel.description && (
                                        <p className="text-sm text-gray-600">{selectedChannel.description}</p>
                                    )}
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-hidden">
                                    <MessageList
                                        messages={messages}
                                        currentUserId={user?.id || ''}
                                        isLoading={messagesLoading}
                                        channelId={selectedChannelId}
                                    />
                                </div>

                                {/* Message Input */}
                                <div className="border-t border-gray-200 bg-white">
                                    <MessageInput
                                        onSendMessage={handleSendMessage}
                                        channelId={selectedChannelId}
                                        userId={user?.id || ''}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                <div className="text-center">
                                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg">Select a channel to start chatting</p>
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
        </div>
    );
};
