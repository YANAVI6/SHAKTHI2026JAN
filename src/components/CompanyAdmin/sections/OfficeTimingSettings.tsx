import React, { useState, useEffect } from 'react';
import { Clock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { activityService } from '../../../services/activityService';
import { useAuth } from '../../../contexts/AuthContext';

export const OfficeTimingSettings: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [officeStartTime, setOfficeStartTime] = useState('09:00');
    const [officeEndTime, setOfficeEndTime] = useState('18:00');
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat

    const daysOfWeek = [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' },
    ];

    useEffect(() => {
        const loadOfficeHours = async () => {
            if (!user?.tenantId) return;

            try {
                setLoading(true);
                const settings = await activityService.getOfficeHours(user.tenantId);

                if (settings) {
                    setOfficeStartTime(settings.officeStartTime);
                    setOfficeEndTime(settings.officeEndTime);
                    setTimezone(settings.timezone);
                    setWorkingDays(settings.workingDays);
                }
            } catch (error) {
                console.error('Error loading office hours:', error);
                setMessage({ type: 'error', text: 'Failed to load office hours settings' });
            } finally {
                setLoading(false);
            }
        };

        loadOfficeHours();
    }, [user?.tenantId]);

    const handleSave = async () => {
        if (!user?.tenantId) return;

        // Validation
        if (!officeStartTime || !officeEndTime) {
            setMessage({ type: 'error', text: 'Please set both start and end times' });
            return;
        }

        if (officeStartTime >= officeEndTime) {
            setMessage({ type: 'error', text: 'End time must be after start time' });
            return;
        }

        if (workingDays.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one working day' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            await activityService.saveOfficeHours(
                user.tenantId,
                officeStartTime,
                officeEndTime,
                timezone,
                workingDays
            );

            setMessage({ type: 'success', text: 'Office hours saved successfully!' });
        } catch (error) {
            console.error('Error saving office hours:', error);
            setMessage({ type: 'error', text: 'Failed to save office hours' });
        } finally {
            setSaving(false);
        }
    };

    const toggleWorkingDay = (day: number) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day));
        } else {
            setWorkingDays([...workingDays, day].sort());
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    Office Timing Settings
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Configure office hours for accurate activity tracking and productivity reports
                </p>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {message.text}
                    </p>
                </div>
            )}

            {/* Settings Form */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                {/* Office Hours */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Office Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={officeStartTime}
                                onChange={(e) => setOfficeStartTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                            </label>
                            <input
                                type="time"
                                value={officeEndTime}
                                onChange={(e) => setOfficeEndTime(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                    </label>
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        <option value="America/New_York">America/New York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                </div>

                {/* Working Days */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Working Days
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {daysOfWeek.map((day) => (
                            <button
                                key={day.value}
                                onClick={() => toggleWorkingDay(day.value)}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${workingDays.includes(day.value)
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">How Office Hours Work</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Activity tracking will calculate productive time based on these hours</li>
                    <li>Time worked outside office hours will be tracked separately</li>
                    <li>Reports will show time within vs outside office hours</li>
                    <li>Break time and idle time are excluded from productive time calculations</li>
                </ul>
            </div>
        </div>
    );
};
