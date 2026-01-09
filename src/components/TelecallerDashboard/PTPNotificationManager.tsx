import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Bell, X, Clock, Layout } from 'lucide-react';
import { customerCaseService } from '../../services/customerCaseService';
import type { TeamInchargeCase } from '../../types/caseManagement';

interface PTPNotificationManagerProps {
    user: {
        id: string;
        role: string;
        tenantId?: string;
        teamId?: string;
    };
    onOpenCase: (caseItem: TeamInchargeCase) => void;
    lastUpdate?: number;
    selectedTeamId?: string;
}

export const PTPNotificationManager: React.FC<PTPNotificationManagerProps> = ({ user, onOpenCase, lastUpdate, selectedTeamId }) => {
    const [ptpCases, setPtpCases] = useState<TeamInchargeCase[]>([]);
    const lastAlertTimes = useRef<Map<string, number>>(new Map());
    const activeToastIds = useRef<Map<string, string | number>>(new Map());

    // Fetch PTP cases periodically or when forced by update
    useEffect(() => {
        const fetchPTPs = async () => {
            if (!user.tenantId || !user.id || user.role !== 'Telecaller' || !selectedTeamId) {
                return;
            }

            try {
                const data = await customerCaseService.getTodayPTPCases(user.tenantId, user.id, selectedTeamId);
                setPtpCases(data);
            } catch (error) {
                console.error('❌ PTPManager: Error fetching PTPs:', error);
            }
        };

        fetchPTPs();
        const intervalId = setInterval(fetchPTPs, 2 * 60 * 1000); // Refetch every 2 minutes naturally

        return () => clearInterval(intervalId);
    }, [user.tenantId, user.id, user.role, lastUpdate, selectedTeamId]);

    // Check for alerts every 30 seconds
    useEffect(() => {
        const checkAlerts = () => {
            const now = new Date();

            ptpCases.forEach(caseItem => {
                if (!caseItem.latest_ptp_date) return;

                const ptpTime = new Date(caseItem.latest_ptp_date);
                const isTimePassed = now >= ptpTime;

                if (isTimePassed) {
                    // Check if case has been updated AFTER PTP time
                    const isUpdated = caseItem.latest_call_date && new Date(caseItem.latest_call_date) > ptpTime;

                    if (isUpdated) {
                        // Stop alerts for this case
                        if (activeToastIds.current.has(caseItem.id)) {
                            toast.dismiss(activeToastIds.current.get(caseItem.id));
                            activeToastIds.current.delete(caseItem.id);
                        }
                        return;
                    }

                    // Check repeat logic (every 5 minutes)
                    const lastAlert = lastAlertTimes.current.get(caseItem.id) || 0;
                    const timeSinceLastAlert = now.getTime() - lastAlert;
                    const shouldAlert = timeSinceLastAlert >= 5 * 60 * 1000;

                    if (shouldAlert) {
                        triggerAlert(caseItem);
                        lastAlertTimes.current.set(caseItem.id, now.getTime());
                    }
                }
            });
        };

        const triggerAlert = (caseItem: TeamInchargeCase) => {
            // Dismiss previous toast for this case if any
            if (activeToastIds.current.has(caseItem.id)) {
                toast.dismiss(activeToastIds.current.get(caseItem.id));
            }

            const toastId = toast.custom((t) => (
                <div className="bg-white rounded-xl shadow-2xl w-[400px] pointer-events-auto overflow-hidden border border-red-100 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300 transition-all hover:scale-[1.01]">
                    <div className="bg-gradient-to-r from-red-600 to-orange-500 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm animate-pulse">
                                <Bell className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">PTP Due Now</h3>
                                <p className="text-red-50/80 text-xs font-medium uppercase tracking-wider">Urgent Action Required</p>
                            </div>
                        </div>
                        <button
                            onClick={() => toast.dismiss(t)}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-[9px]">Customer</span>
                                <p className="text-sm font-semibold text-gray-900 truncate">{caseItem.customer_name}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-[9px]">Loan ID</span>
                                <p className="text-sm font-semibold text-gray-900 truncate">{caseItem.loan_id}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 py-3 border-y border-gray-50/50">
                            <div className="flex items-center gap-2 text-red-600 bg-red-50/50 px-3 py-1.5 rounded-full border border-red-100/50">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-bold">
                                    {new Date(caseItem.latest_ptp_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {caseItem.pos_amount && (
                                <div className="text-gray-500 text-sm font-medium">
                                    POS: <span className="text-gray-900 font-bold">₹{caseItem.pos_amount}</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                toast.dismiss(t);
                                onOpenCase(caseItem);
                            }}
                            className="group relative w-full overflow-hidden bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg hover:shadow-xl"
                        >
                            <span>Open Case Details</span>
                            <Layout className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            ), {
                duration: Infinity,
                position: 'top-center'
            });

            activeToastIds.current.set(caseItem.id, toastId);
        };

        checkAlerts();
        const intervalId = setInterval(checkAlerts, 30 * 1000);

        return () => clearInterval(intervalId);
    }, [ptpCases, onOpenCase]);

    return null;
};
