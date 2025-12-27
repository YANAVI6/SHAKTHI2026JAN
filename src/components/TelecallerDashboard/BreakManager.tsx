import React, { useState, useEffect } from 'react';
import { Coffee, Play, Clock } from 'lucide-react';
import { activityService } from '../../services/activityService';
import { useAuth } from '../../contexts/AuthContext';

export const BreakManager: React.FC = () => {
    const { user } = useAuth();
    const [onBreak, setOnBreak] = useState(false);
    const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
    const [breakDuration, setBreakDuration] = useState('0m');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Update break duration every second when on break
        if (!onBreak || !breakStartTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diffMs = now.getTime() - breakStartTime.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);

            if (diffMins > 0) {
                setBreakDuration(`${diffMins}m ${diffSecs}s`);
            } else {
                setBreakDuration(`${diffSecs}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [onBreak, breakStartTime]);

    const handleStartBreak = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            await activityService.startBreak(user.id);
            setOnBreak(true);
            setBreakStartTime(new Date());
            setBreakDuration('0s');
        } catch (error) {
            console.error('Error starting break:', error);
            alert('Failed to start break. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndBreak = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            await activityService.endBreak(user.id);
            setOnBreak(false);
            setBreakStartTime(null);
            setBreakDuration('0m');
        } catch (error) {
            console.error('Error ending break:', error);
            alert('Failed to end break. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${onBreak ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <Coffee className={`w-5 h-5 ${onBreak ? 'text-orange-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            {onBreak ? 'On Break' : 'Break Status'}
                        </h3>
                        {onBreak && (
                            <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                                <Clock className="w-3 h-3" />
                                <span className="font-medium">{breakDuration}</span>
                            </div>
                        )}
                    </div>
                </div>

                {onBreak ? (
                    <button
                        onClick={handleEndBreak}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                    >
                        <Play className="w-4 h-4" />
                        {loading ? 'Ending...' : 'End Break'}
                    </button>
                ) : (
                    <button
                        onClick={handleStartBreak}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                    >
                        <Coffee className="w-4 h-4" />
                        {loading ? 'Starting...' : 'Take Break'}
                    </button>
                )}
            </div>

            {onBreak && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        💡 Your break time is being tracked. Click "End Break" when you're ready to resume work.
                    </p>
                </div>
            )}
        </div>
    );
};
