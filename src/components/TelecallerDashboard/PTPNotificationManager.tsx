import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { customerCaseService } from '../../services/customerCaseService';
import type { TeamInchargeCase } from '../../types/caseManagement';

interface PTPNotificationManagerProps {
    user: {
        id: string;
        role: string;
        tenantId?: string;
    };
    onOpenCase: (caseItem: TeamInchargeCase) => void;
    lastUpdate?: number; // Trigger to force re-fetch
}

export const PTPNotificationManager: React.FC<PTPNotificationManagerProps> = ({ user, onOpenCase, lastUpdate }) => {
    const [ptpCases, setPtpCases] = useState<TeamInchargeCase[]>([]);
    const lastAlertTimes = useRef<Map<string, number>>(new Map());
    const activeToastIds = useRef<Map<string, string | number>>(new Map());

    // Fetch PTP cases periodically or when forced by update
    useEffect(() => {
        const fetchPTPs = async () => {
            if (!user.tenantId || !user.id || user.role !== 'Telecaller') {
                // console.log('⚠️ PTPManager: Missing user details or wrong role', user);
                return;
            }

            try {
                // console.log('🔄 PTPManager: Fetching today\'s PTPs...');
                const data = await customerCaseService.getTodayPTPCases(user.tenantId, user.id);
                // console.log(`✅ PTPManager: Found ${data.length} PTP cases for today`, data);
                setPtpCases(data);
            } catch (error) {
                console.error('❌ PTPManager: Error fetching PTPs:', error);
            }
        };

        fetchPTPs();
        const intervalId = setInterval(fetchPTPs, 2 * 60 * 1000); // Refetch every 2 minutes naturally

        return () => clearInterval(intervalId);
    }, [user.tenantId, user.id, user.role, lastUpdate]); // Added lastUpdate dependency

    // Check for alerts every 30 seconds
    useEffect(() => {
        const checkAlerts = () => {
            const now = new Date();
            if (ptpCases.length > 0) {
                console.log('⏱️ PTPManager: Checking alerts at', now.toLocaleTimeString(), 'for', ptpCases.length, 'cases');
                console.log('   Current time (full):', now.toISOString());
            }

            ptpCases.forEach(caseItem => {
                if (!caseItem.latest_ptp_date) {
                    console.log(`   ❌ Case ${caseItem.customer_name}: No PTP date`);
                    return;
                }

                const ptpTime = new Date(caseItem.latest_ptp_date);
                const isTimePassed = now >= ptpTime;

                console.log(`   📋 Case: ${caseItem.customer_name}`);
                console.log(`      PTP Time: ${ptpTime.toISOString()} (${ptpTime.toLocaleTimeString()})`);
                console.log(`      Now Time: ${now.toISOString()} (${now.toLocaleTimeString()})`);
                console.log(`      Time Passed? ${isTimePassed}`);

                // 1. Check if PTP time has passed (or is very close)
                if (isTimePassed) {

                    // 2. Check if case has been updated AFTER PTP time
                    // We consider it "updated" if there is a call log created AFTER the PTP time
                    const isUpdated = caseItem.latest_call_date && new Date(caseItem.latest_call_date) > ptpTime;

                    console.log(`      Latest Call: ${caseItem.latest_call_date || 'None'}`);
                    console.log(`      Is Updated? ${isUpdated}`);

                    if (isUpdated) {
                        console.log(`      ✅ Skipped: Already updated`);
                        // Stop alerts for this case
                        if (activeToastIds.current.has(caseItem.id)) {
                            toast.dismiss(activeToastIds.current.get(caseItem.id));
                            activeToastIds.current.delete(caseItem.id);
                        }
                        return;
                    }

                    // 3. Check repeat logic (every 5 minutes)
                    const lastAlert = lastAlertTimes.current.get(caseItem.id) || 0;
                    const timeSinceLastAlert = now.getTime() - lastAlert;
                    const shouldAlert = timeSinceLastAlert >= 5 * 60 * 1000;

                    console.log(`      Last Alert: ${lastAlert === 0 ? 'Never' : new Date(lastAlert).toLocaleTimeString()}`);
                    console.log(`      Time Since: ${(timeSinceLastAlert / 1000).toFixed(0)}s`);
                    console.log(`      Should Alert? ${shouldAlert}`);

                    if (shouldAlert) {
                        console.log(`      🔔 TRIGGERING ALERT!`);
                        // Trigger Alert
                        triggerAlert(caseItem);
                        lastAlertTimes.current.set(caseItem.id, now.getTime());
                    }
                } else {
                    console.log(`      ⏳ Not yet due (${Math.round((ptpTime.getTime() - now.getTime()) / 1000 / 60)} minutes remaining)`);
                }
            });
        };

        const triggerAlert = (caseItem: TeamInchargeCase) => {
            // Dismiss previous toast for this case if any (to avoid stacking)
            if (activeToastIds.current.has(caseItem.id)) {
                toast.dismiss(activeToastIds.current.get(caseItem.id));
            }

            console.log('⏰ PTP Alert triggered for:', caseItem.customer_name);

            const toastId = toast.custom((t) => (
                <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 w-96 pointer-events-auto flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-gray-900">PTP Due: {caseItem.customer_name}</h3>
                            <p className="text-sm text-gray-600 mt-1">Loan: {caseItem.loan_id}</p>
                            <p className="text-xs text-red-600 mt-1 font-medium">Time: {new Date(caseItem.latest_ptp_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button
                            onClick={() => toast.dismiss(t)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            toast.dismiss(t);
                            onOpenCase(caseItem);
                        }}
                        className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                    >
                        Open Case Details
                    </button>
                </div>
            ), {
                duration: Infinity, // Stay until clicked or dismissed
                position: 'top-center'
            });

            activeToastIds.current.set(caseItem.id, toastId);
        };

        // Run immediately then interval
        checkAlerts();
        const intervalId = setInterval(checkAlerts, 30 * 1000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [ptpCases, onOpenCase]); // Added onOpenCase to dependencies

    return null; // Logic only component
};
