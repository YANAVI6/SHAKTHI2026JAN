import React from 'react';
import { X, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { AlertCase } from '../../services/alertService';

interface AlertsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    alerts: AlertCase[];
    onCaseClick: (caseId: string) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
    isOpen,
    onClose,
    alerts,
    onCaseClick
}) => {
    if (!isOpen) return null;

    const redAlerts = alerts.filter(a => a.status === 'RED');
    const yellowAlerts = alerts.filter(a => a.status === 'YELLOW');
    const greenAlerts = alerts.filter(a => a.status === 'GREEN');

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
                <div className="relative w-full bg-white shadow-xl flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-semibold">Urgent Alerts</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {alerts.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                                <p className="text-gray-500 mt-2">No urgent cases pending right now.</p>
                            </div>
                        ) : (
                            <>
                                {/* Red Alerts */}
                                {redAlerts.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center">
                                            <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                                            Overdue / Due Now ({redAlerts.length})
                                        </h3>
                                        {redAlerts.map((alert, index) => (
                                            <div
                                                key={`RED-${alert.type}-${alert.id}-${index}`}
                                                onClick={() => onCaseClick(alert.id)}
                                                className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors shadow-sm"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{alert.customer_name}</h4>
                                                        <div className="flex items-center text-xs text-red-700 mt-1">
                                                            <span className="font-medium bg-red-200 px-2 py-0.5 rounded text-[10px] mr-2">
                                                                {alert.type === 'PTP' ? 'PTP' : 'CALLBACK'}
                                                            </span>
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Due: {formatTime(alert.due_date)}
                                                            <div className="ml-3 font-semibold text-gray-900">
                                                                ₹{alert.original_data.customer_cases.outstanding_amount || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white rounded-full p-1 shadow-sm">
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Yellow Alerts */}
                                {yellowAlerts.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-wider flex items-center">
                                            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                            Approaching ({yellowAlerts.length})
                                        </h3>
                                        {yellowAlerts.map((alert, index) => (
                                            <div
                                                key={`YELLOW-${alert.type}-${alert.id}-${index}`}
                                                onClick={() => onCaseClick(alert.id)}
                                                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors shadow-sm"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{alert.customer_name}</h4>
                                                        <div className="flex items-center text-xs text-yellow-800 mt-1">
                                                            <span className="font-medium bg-yellow-200 px-2 py-0.5 rounded text-[10px] mr-2">
                                                                {alert.type === 'PTP' ? 'PTP' : 'CALLBACK'}
                                                            </span>
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Due: {formatTime(alert.due_date)}
                                                            <div className="ml-3 font-semibold text-gray-900">
                                                                ₹{alert.original_data.customer_cases.outstanding_amount || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white rounded-full p-1 shadow-sm">
                                                        <Clock className="w-5 h-5 text-yellow-600" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Green Alerts (Today's Schedule) */}
                                {greenAlerts.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider flex items-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            Today's Schedule ({greenAlerts.length})
                                        </h3>
                                        {greenAlerts.map((alert, index) => (
                                            <div
                                                key={`GREEN-${alert.type}-${alert.id}-${index}`}
                                                onClick={() => onCaseClick(alert.id)}
                                                className={`border rounded-lg p-4 cursor-pointer transition-colors shadow-sm ${alert.is_viewed
                                                    ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 opacity-75'
                                                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className={`font-semibold ${alert.is_viewed ? 'text-gray-600' : 'text-gray-900'}`}>
                                                            {alert.customer_name}
                                                        </h4>
                                                        <div className={`flex items-center text-xs mt-1 ${alert.is_viewed ? 'text-gray-500' : 'text-green-700'}`}>
                                                            <span className={`font-medium px-2 py-0.5 rounded text-[10px] mr-2 ${alert.is_viewed ? 'bg-gray-200' : 'bg-green-200'
                                                                }`}>
                                                                {alert.type === 'PTP' ? 'PTP' : 'CALLBACK'}
                                                            </span>
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {alert.is_viewed ? 'Viewed' : 'Scheduled'}: {formatTime(alert.due_date)}
                                                            <div className={`ml-3 font-semibold ${alert.is_viewed ? 'text-gray-600' : 'text-gray-900'}`}>
                                                                ₹{alert.original_data.customer_cases.outstanding_amount || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white rounded-full p-1 shadow-sm">
                                                        {alert.is_viewed ? (
                                                            <CheckCircle className="w-5 h-5 text-gray-400" />
                                                        ) : (
                                                            <Clock className="w-5 h-5 text-green-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
