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
        <div className="flex items-center gap-3 bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${onBreak ? 'bg-orange-100' : 'bg-white shadow-sm'}`}>
                    <Coffee className={`w-4 h-4 ${onBreak ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>
                <div className="hidden sm:block">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                        {onBreak ? 'On Break' : 'Break'}
                    </p>
                    {onBreak && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600">
                            <Clock className="w-3 h-3" />
                            <span>{breakDuration}</span>
                        </div>
                    )}
                </div>
            </div>

            {onBreak ? (
                <button
                    onClick={handleEndBreak}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-xs font-bold shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                    <Play className="w-3 h-3 fill-current" />
                    {loading ? '...' : 'End'}
                </button>
            ) : (
                <button
                    onClick={handleStartBreak}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-xs font-bold shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                    <Coffee className="w-3 h-3" />
                    {loading ? '...' : 'Take'}
                </button>
            )}
        </div>
    );
};
