import React from 'react';
import { Hash, Lock, Users, MessageCircle } from 'lucide-react';
import { ChatChannel } from '../../services/chatService';

interface ChannelListProps {
    channels: ChatChannel[];
    selectedChannelId: string | null;
    onSelectChannel: (channelId: string) => void;
    isLoading: boolean;
    unreadCounts: Record<string, number>;
}

export const ChannelList: React.FC<ChannelListProps> = ({
    channels,
    selectedChannelId,
    onSelectChannel,
    isLoading,
    unreadCounts
}) => {
    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'general':
                return <Hash className="w-4 h-4" />;
            case 'team':
                return <Users className="w-4 h-4" />;
            case 'direct':
                return <MessageCircle className="w-4 h-4" />;
            case 'role':
                return <Lock className="w-4 h-4" />;
            default:
                return <Hash className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="p-4">
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white/50">
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                {channels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 opacity-60">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-xs font-medium text-gray-500 max-w-[120px]">
                            No active channels found
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => onSelectChannel(channel.id)}
                                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${selectedChannelId === channel.id
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'hover:bg-purple-50 text-gray-600 hover:text-purple-700'
                                    }`}
                            >
                                {selectedChannelId === channel.id && (
                                    <div className="absolute left-0 w-1 h-4 bg-white rounded-r-full" />
                                )}
                                <div className={`mr-3 p-1.5 rounded-lg transition-colors ${selectedChannelId === channel.id
                                    ? 'bg-white/20'
                                    : 'bg-gray-100 group-hover:bg-purple-100'
                                    }`}>
                                    {channel.avatarUrl ? (
                                        <img
                                            src={channel.avatarUrl}
                                            alt={channel.name}
                                            className="w-4 h-4 rounded-full object-cover"
                                        />
                                    ) : (
                                        getChannelIcon(channel.type)
                                    )}
                                </div>
                                <span className="flex-1 text-left text-sm font-semibold tracking-tight truncate">
                                    {channel.name}
                                </span>
                                {unreadCounts[channel.id] > 0 && (
                                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${selectedChannelId === channel.id
                                        ? 'bg-white text-purple-600'
                                        : 'bg-red-500 text-white'
                                        }`}>
                                        {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
