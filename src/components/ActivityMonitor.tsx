import React, { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { activityService } from '../services/activityService';

const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes for Idle status
const LOGOUT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for Auto Logout

export const ActivityMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const lastActivityTime = useRef<number>(0);

    useEffect(() => {
        lastActivityTime.current = Date.now();
    }, []);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isIdle = useRef<boolean>(false);

    const handleUserActivity = useCallback(() => {
        const now = Date.now();
        lastActivityTime.current = now;

        // Reset timers
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

        // If user was idle, they are now active
        if (isIdle.current && user?.id && user?.tenantId) {
            isIdle.current = false;
            // Update last active time immediately to show online
            activityService.updateLastActive(user.id, user.tenantId);
        }

        // Schedule next timers
        if (isAuthenticated) {
            idleTimerRef.current = setTimeout(() => {
                if (user?.id) {
                    isIdle.current = true;
                    // Set status to Idle
                    activityService.setIdle(user.id);
                }
            }, IDLE_TIMEOUT_MS);

            logoutTimerRef.current = setTimeout(() => {
                if (user?.id) {
                    console.log('Auto-logging out due to inactivity');
                    activityService.trackLogout(user.id, 'Auto Logout due to inactivity')
                        .finally(() => {
                            logout();
                        });
                }
            }, LOGOUT_TIMEOUT_MS);
        }
    }, [user, isAuthenticated, logout]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Events to listen for
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        // Initial setup
        handleUserActivity();

        events.forEach(event => {
            window.addEventListener(event, handleUserActivity);
        });

        // Heartbeat to keep session alive while active
        const heartbeat = setInterval(() => {
            if (isAuthenticated && !isIdle.current && user?.id && user?.tenantId) {
                // Only update if not idle
                // We use a separate throttled call inside service, safe to call here
                activityService.updateLastActive(user.id, user.tenantId);
            }
        }, 60000); // Check every minute

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            clearInterval(heartbeat);
        };
    }, [isAuthenticated, handleUserActivity, user]);

    return <>{children}</>;
};
