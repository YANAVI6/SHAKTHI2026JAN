import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../../services/chatService';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';

interface MessageListProps {
    messages: ChatMessage[];
    currentUserId: string;
    isLoading: boolean;
    channelId: string | null;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentUserId,
    isLoading,
    channelId
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingUsers = useTypingIndicator(channelId);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            ) : (
                <>
                    {messages.map((message) => {
                        const isOwnMessage = message.sender_id === currentUserId;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwnMessage
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    {!isOwnMessage && message.sender && (
                                        <div className="flex items-center gap-2 mb-1">
                                            {message.sender.avatarUrl ? (
                                                <img
                                                    src={message.sender.avatarUrl}
                                                    alt={message.sender.name}
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-purple-600">
                                                        {message.sender.name.charAt(0)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-xs font-semibold text-gray-600">
                                                {message.sender.name}
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-sm whitespace-pre-wrap break-words">
                                        {message.message_text}
                                    </div>
                                    <div
                                        className={`text-xs mt-1 ${isOwnMessage ? 'text-purple-200' : 'text-gray-500'
                                            }`}
                                    >
                                        {new Date(message.created_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                        {message.is_edited && ' (edited)'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg px-4 py-2">
                                <div className="flex items-center space-x-1">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <span className="text-xs text-gray-600 ml-2">
                                        {typingUsers[0].user_name} is typing...
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </>
            )}
        </div>
    );
};
