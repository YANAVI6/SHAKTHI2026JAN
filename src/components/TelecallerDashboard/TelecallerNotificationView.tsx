import React, { useState } from 'react';
import {
    Bell,
    Check,
    Settings,
    FileText,
    Clock,
    CheckCircle,
    DollarSign,
    UserCheck,
    Trash2
} from 'lucide-react';
import { NotificationService, DashboardNotification } from '../../services/notificationService';

interface TelecallerNotificationViewProps {
    notifications: DashboardNotification[];
    setNotifications: React.Dispatch<React.SetStateAction<DashboardNotification[]>>;
    onOpenAlerts: () => void;
}

export const TelecallerNotificationView: React.FC<TelecallerNotificationViewProps> = ({
    notifications,
    setNotifications,
    onOpenAlerts
}) => {
    const [notificationFilter, setNotificationFilter] = useState('All');

    const handleMarkAllAsRead = () => {
        // In a real app, we'd call an API. For now, we'll update local state
        // and potentially store "read" IDs in localStorage if needed.
        // Since getNotifications calculates isRead dynamically for some types,
        // we might just want to visually mark them as read in the UI for this session.
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        setNotifications(updated);
    };

    const handleDismiss = (id: string) => {
        NotificationService.dismissNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const filteredNotifications = notifications.filter(n =>
        notificationFilter === 'All' || n.category === notificationFilter
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-gray-600">Stay updated with your latest activities</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Check className="w-4 h-4" />
                        Mark all as read
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['All', 'Cases', 'Follow-ups', 'PTP', 'Payments', 'Attendance', 'System'].map((category) => (
                    <button
                        key={category}
                        onClick={() => setNotificationFilter(category)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${notificationFilter === category
                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-100'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                    >
                        {category}
                        {category === 'All' && (
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${notificationFilter === category ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {notifications.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <div className="space-y-4">
                <div className="space-y-3">
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No notifications found</p>
                            <p className="text-sm text-gray-400">We'll notify you when something happens</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => {
                            const Icon = notification.category === 'Cases' ? FileText :
                                notification.category === 'Follow-ups' ? Clock :
                                    notification.category === 'PTP' ? CheckCircle :
                                        notification.category === 'Payments' ? DollarSign :
                                            notification.category === 'Attendance' ? UserCheck :
                                                notification.category === 'System' ? Settings : Bell;

                            const colorClass = notification.color === 'blue' ? 'text-blue-600 bg-blue-50' :
                                notification.color === 'orange' ? 'text-orange-600 bg-orange-50' :
                                    notification.color === 'green' ? 'text-green-600 bg-green-50' :
                                        notification.color === 'purple' ? 'text-purple-600 bg-purple-50' : 'text-gray-600 bg-gray-50';

                            return (
                                <div
                                    key={notification.id}
                                    className={`group relative flex gap-4 p-4 bg-white rounded-xl border transition-all duration-200 ${!notification.isRead
                                        ? 'border-blue-100 shadow-sm bg-blue-50/30'
                                        : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                                        }`}
                                >
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className={`text-base ${!notification.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                                    {notification.description}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                                {notification.time}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Unread Indicator */}
                                    {!notification.isRead && (
                                        <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-white"></div>
                                    )}

                                    {/* Link wrapper for PTP or click actions */}
                                    <div
                                        className="absolute inset-0 cursor-pointer z-0"
                                        onClick={() => {
                                            if (notification.category === 'PTP' || notification.title.includes('PTP')) {
                                                onOpenAlerts();
                                            }
                                        }}
                                    ></div>

                                    {/* Hover Actions (Desktop) */}
                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-2 bg-white/80 backdrop-blur-sm p-1 rounded-lg z-10">
                                        <button
                                            onClick={() => {
                                                const updated = notifications.map(n =>
                                                    n.id === notification.id ? { ...n, isRead: true } : n
                                                );
                                                setNotifications(updated);
                                                if (notification.category === 'PTP' || notification.title.includes('PTP')) {
                                                    onOpenAlerts();
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDismiss(notification.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
