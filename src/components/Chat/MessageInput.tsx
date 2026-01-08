import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ChatService } from '../../services/chatService';

interface MessageInputProps {
    onSendMessage: (text: string) => Promise<void>;
    channelId: string | null;
    userId: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSendMessage,
    channelId,
    userId
}) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || isSending) return;

        try {
            setIsSending(true);
            await onSendMessage(message);
            setMessage('');

            // Stop typing indicator
            if (channelId) {
                await ChatService.stopTyping(channelId, userId);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleTyping = (text: string) => {
        setMessage(text);

        if (!channelId) return;

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Start typing indicator
        if (text.trim()) {
            ChatService.startTyping(channelId, userId);

            // Auto-stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                ChatService.stopTyping(channelId, userId);
            }, 3000);
        } else {
            ChatService.stopTyping(channelId, userId);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (channelId) {
                ChatService.stopTyping(channelId, userId);
            }
        };
    }, [channelId, userId]);

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isSending}
                />
                <button
                    type="submit"
                    disabled={!message.trim() || isSending}
                    className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </form>
    );
};
