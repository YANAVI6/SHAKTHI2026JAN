import React, { useState, useEffect } from 'react';
import { Bell, Plus, Search, Trash2 } from 'lucide-react';
import { NotificationService } from '../../services/notificationService';
import { AlertService, AlertCase } from '../../services/alertService';
import { Notification } from '../../models';
import { useAuth } from '../../contexts/AuthContext';
import { CreateNotificationModal } from '../Common/CreateNotificationModal';
import { supabase } from '../../lib/supabase';

type TabType = 'notifications' | 'alerts';

export const NotificationManager: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('notifications');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [alerts, setAlerts] = useState<AlertCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchNotifications = React.useCallback(async () => {
        if (!user?.tenantId) return;
        try {
            setLoading(true);
            const data = await NotificationService.getNotificationHistory(user.tenantId);
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.tenantId]);

    const fetchAlerts = React.useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);

            // Get team_id from employees table
            const { data: employee } = await supabase
                .from('employees')
                .select('team_id')
                .eq('id', user.id)
                .single();

            if (!employee?.team_id) {
                console.warn('No team_id found for user');
                setAlerts([]);
                setLoading(false);
                return;
            }

            const data = await AlertService.getAlertsByTeam(employee.team_id);
            setAlerts(data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (activeTab === 'notifications') {
            fetchNotifications();
        } else {
            fetchAlerts();
        }
    }, [activeTab, fetchNotifications, fetchAlerts]);

    const filteredNotifications = notifications.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAlerts = alerts.filter(a =>
        a.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-blue-600" />
                        Notification Manager
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Manage team notifications and alerts</p>
                </div>
                {activeTab === 'notifications' && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Notification
                    </button>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'notifications'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Notifications
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'notifications' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {notifications.length}
                            </span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'alerts'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Team Alerts
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'alerts' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {alerts.filter(a => a.status === 'RED' || a.status === 'YELLOW').length}
                            </span>
                        </div>
                    </button>
                </nav>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'notifications' ? "Search notifications..." : "Search alerts..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Notifications Tab Content */}
            {activeTab === 'notifications' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Title</th>
                                    <th className="px-6 py-4 font-semibold">Message</th>
                                    <th className="px-6 py-4 font-semibold">Target</th>
                                    <th className="px-6 py-4 font-semibold">Type</th>
                                    <th className="px-6 py-4 font-semibold">Sender</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                                    </tr>
                                ) : filteredNotifications.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No notifications found</td>
                                    </tr>
                                ) : (
                                    filteredNotifications.map((n) => (
                                        <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{n.title}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={n.message}>
                                                {n.message}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${n.target_type === 'all' ? 'bg-purple-100 text-purple-800' :
                                                        n.target_type === 'team' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-green-100 text-green-800'}`}>
                                                    {n.target_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${n.type === 'info' ? 'bg-blue-100 text-blue-800' :
                                                        n.type === 'warning' ? 'bg-orange-100 text-orange-800' :
                                                            n.type === 'success' ? 'bg-green-100 text-green-800' :
                                                                'bg-red-100 text-red-800'}`}>
                                                    {n.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{n.sender_name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await NotificationService.deleteNotification(n.id);
                                                            fetchNotifications();
                                                        } catch (error) {
                                                            console.error('Error deleting notification:', error);
                                                            alert('Failed to delete notification');
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                    title="Delete Notification"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Alerts Tab Content */}
            {activeTab === 'alerts' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Type</th>
                                    <th className="px-6 py-4 font-semibold">Customer Name</th>
                                    <th className="px-6 py-4 font-semibold">Due Date/Time</th>
                                    <th className="px-6 py-4 font-semibold">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                                    </tr>
                                ) : filteredAlerts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No alerts found</td>
                                    </tr>
                                ) : (
                                    filteredAlerts.map((alert) => (
                                        <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${alert.status === 'RED' ? 'bg-red-100 text-red-800' :
                                                        alert.status === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'}`}>
                                                    {alert.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {alert.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{alert.customer_name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {alert.due_date.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                {alert.original_data.call_notes || 'No notes'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <CreateNotificationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchNotifications}
            />
        </div>
    );
};
