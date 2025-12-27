import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { AlertService, AlertCase } from '../../services/alertService';

interface AlertButtonProps {
    userId: string;
    onClick: (alerts: AlertCase[]) => void;
    onStatusChange?: (status: 'RED' | 'YELLOW' | 'GREEN') => void;
}

export const AlertButton: React.FC<AlertButtonProps> = ({ userId, onClick, onStatusChange }) => {
    const [status, setStatus] = useState<'RED' | 'YELLOW' | 'GREEN'>('GREEN');
    const [alerts, setAlerts] = useState<AlertCase[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = useCallback(async () => {
        if (!userId) return;

        try {
            const result = await AlertService.getAlerts(userId);
            setStatus(result.status);
            setAlerts(result.cases);
            if (onStatusChange) {
                onStatusChange(result.status);
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    }, [userId, onStatusChange]);

    useEffect(() => {
        fetchAlerts();
        // Poll every minute
        const interval = setInterval(fetchAlerts, 60000);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    const getButtonStyles = () => {
        switch (status) {
            case 'RED':
                return 'bg-red-500 hover:bg-red-600 text-white animate-pulse';
            case 'YELLOW':
                return 'bg-yellow-500 hover:bg-yellow-600 text-white';
            case 'GREEN':
                return 'bg-green-500 hover:bg-green-600 text-white';
            default:
                return 'bg-gray-200 text-gray-500';
        }
    };

    const getIcon = () => {
        switch (status) {
            case 'RED':
                return <AlertCircle className="w-5 h-5" />;
            case 'YELLOW':
                return <Clock className="w-5 h-5" />;
            case 'GREEN':
                return <CheckCircle className="w-5 h-5" />;
        }
    };

    const getLabel = () => {
        switch (status) {
            case 'RED':
                return 'Urgent Actions';
            case 'YELLOW':
                return 'Approaching';
            case 'GREEN':
                return 'All Clear';
        }
    };

    if (loading) return null;

    return (
        <button
            onClick={() => onClick(alerts)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${getButtonStyles()}`}
        >
            {getIcon()}
            <span className="hidden sm:inline">{getLabel()}</span>
            {alerts.length > 0 && (
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-bold ml-1">
                    {alerts.length}
                </span>
            )}
        </button>
    );
};
