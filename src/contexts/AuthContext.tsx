import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginSuperAdmin, loginCompanyAdmin } from '../services/authService';
import { activityService } from '../services/activityService';
import { supabase } from '../lib/supabase';
import { setTenantContext, setUserContext, clearTenantContext } from '../lib/tenantContext';
import { securityAuditService } from '../services/securityAuditService';

export interface User {
  id: string;
  name: string;
  role: string;
  tenantId?: string;
  email?: string;
  empId?: string;
  teamId?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, role: string, tenantSlug?: string) => Promise<void>;
  logout: (reason?: string) => void;
  lastNotificationTime: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const USER_STORAGE_KEY = 'shakti_user_session';

export const AuthProvider: React.FC<{ children: ReactNode; initialUser?: User | null }> = ({ children, initialUser }) => {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  useEffect(() => {
    const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        sessionStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Track last interaction time for auto-logout
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  // Update interaction time on user activity
  useEffect(() => {
    const handleActivity = () => {
      setLastInteraction(Date.now());
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  const logout = React.useCallback(async (reason?: string) => {
    if (user?.id) {
      console.log('👋 Logout initiated for user:', user.id, 'Role:', user.role);
      // Log security audit
      try {
        await securityAuditService.logLogout(user.id, user.tenantId, user.role);
      } catch (error) {
        console.error('❌ Error logging security audit:', error);
      }

      // Track activity (independent of audit logging)
      try {
        const role = user.role?.toLowerCase() || '';
        // Only track activity for Telecallers and Team Incharges (case-insensitive check)
        if (role === 'telecaller' || role === 'teamincharge' || role === 'team incharge') {
          console.log('📝 Tracking logout for role:', user.role);
          await activityService.trackLogout(user.id, reason);
        } else {
          console.log('ℹ️ Skipping activity tracking for role:', user.role);
        }
      } catch (error) {
        console.error('❌ Error tracking logout activity:', error);
      }
    }

    await clearTenantContext();

    setUser(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  }, [user?.id, user?.tenantId, user?.role]);

  // Heartbeat and Auto-logout logic
  useEffect(() => {
    if (!user?.id || !user?.tenantId) return;

    // Only track activity for Telecallers and Team Incharges (who are in employees table)
    // Company Admins are in a separate table and don't need activity tracking
    if (user.role !== 'Telecaller' && user.role !== 'TeamIncharge') {
      return;
    }

    // Initial heartbeat
    activityService.updateLastActive(user.id, user.tenantId).catch(console.error);

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteraction;

      // Auto-logout after 5 minutes (300,000 ms)
      if (timeSinceLastInteraction > 300000) {
        console.log('User inactive for 5 minutes, auto-logging out...');
        logout('Auto-logout due to inactivity');
        return;
      }

      // Only send heartbeat if user has been active in the last minute
      // This allows the "last_active_time" in DB to age, triggering "Idle" status
      if (timeSinceLastInteraction < 60000) {
        activityService.updateLastActive(user.id, user.tenantId!).catch(console.error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user?.id, user?.tenantId, user?.role, lastInteraction, logout]);

  // Handle page unload events (tab close, browser close, shutdown)
  useEffect(() => {
    if (!user?.id) return;

    // Only track for Telecallers and Team Incharges
    if (user.role !== 'Telecaller' && user.role !== 'TeamIncharge') {
      return;
    }

    const handleBeforeUnload = () => {
      // Use beacon API for reliable logout tracking during page unload
      activityService.trackLogoutBeacon(user.id, 'Tab/Window closed');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden (tab switched, minimized, etc.)
        // We don't logout here, just note it
        // The heartbeat will handle idle detection
        console.log('Page hidden, heartbeat will continue tracking activity');
      } else {
        // Page is visible again
        console.log('Page visible again');
      }
    };

    const handlePageHide = () => {
      // pagehide is more reliable than beforeunload on mobile browsers
      activityService.trackLogoutBeacon(user.id, 'Page hidden/unloaded');
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      // Cleanup event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user?.id, user?.role]);

  // Real-time Notification Listener
  useEffect(() => {
    if (!user?.tenantId || !user?.id) return;

    // Request notification permission on mount
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    console.log('Setting up notification listener for tenant:', user.tenantId);

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${user.tenantId}`
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newNote = payload.new as any;
          console.log('📬 Received notification:', newNote);

          // Check if notification is for this user
          const isRelevant =
            newNote.target_type === 'all' ||
            (newNote.target_type === 'user' && newNote.target_id === user.id) ||
            (newNote.target_type === 'team'); // Show team notifications to all for now

          if (isRelevant) {
            console.log('✅ Notification is relevant, showing to user');
            setLastNotificationTime(Date.now()); // Trigger update in listeners

            // Try browser notification first
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(newNote.title, { body: newNote.message });
            } else {
              // Fallback to alert for visibility
              alert(`📬 New Notification\n\n${newNote.title}\n${newNote.message}`);
            }
          } else {
            console.log('❌ Notification not relevant for this user');
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification channel status:', status);
      });

    return () => {
      console.log('Cleaning up notification listener');
      supabase.removeChannel(channel);
    };
  }, [user?.tenantId, user?.id]);

  const login = async (username: string, password: string, role: string, tenantSlug?: string) => {
    try {
      if (role === 'SuperAdmin') {
        const authenticatedUser = await loginSuperAdmin({ username, password });
        const userData = {
          id: authenticatedUser.id,
          name: authenticatedUser.username,
          role: role
        };

        // Set user context for super admin (can access all tenants)
        await setUserContext(authenticatedUser.id);

        // Log successful super admin login
        await securityAuditService.logLogin(authenticatedUser.id, undefined, role);

        setUser(userData);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        return;
      }

      if (role === 'CompanyAdmin' || role === 'TeamIncharge' || role === 'Telecaller') {
        const authenticatedUser = await loginCompanyAdmin({ username, password }, tenantSlug);

        // CRITICAL: Validate that selected role matches actual user role
        const actualRole = authenticatedUser.role || 'CompanyAdmin';
        if (role !== actualRole) {
          throw new Error(`Invalid role selected. You are a ${actualRole}, not a ${role}.`);
        }

        const userData = {
          id: authenticatedUser.id,
          name: authenticatedUser.name || authenticatedUser.username,
          role: actualRole, // Use actual role from database only
          tenantId: authenticatedUser.tenantId,
          email: authenticatedUser.email,
          empId: authenticatedUser.username,
          teamId: authenticatedUser.teamId
        };

        // Set tenant context for RLS policies
        if (authenticatedUser.tenantId) {
          await setTenantContext(authenticatedUser.tenantId);
          await setUserContext(authenticatedUser.id);
          console.log('✅ Tenant context initialized for:', authenticatedUser.tenantId);

          // Log successful login
          await securityAuditService.logLogin(
            authenticatedUser.id,
            authenticatedUser.tenantId,
            actualRole
          );
        } else {
          console.warn('⚠️ No tenant ID found for user');
        }

        setUser(userData);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        return;
      }

      throw new Error('Invalid role');
    } catch (error) {
      console.error('Login error:', error);

      // Log failed login attempt
      await securityAuditService.logFailedLogin(
        username,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  };





  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, lastNotificationTime }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};