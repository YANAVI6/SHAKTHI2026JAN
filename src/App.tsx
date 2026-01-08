import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ActivityMonitor } from './components/ActivityMonitor';
import SplashScreen from './components/SplashScreen';

// Lazy load Dashboards & Pages
const LoginPage = lazy(() => import('./components/LoginPage'));
const SuperAdminLoginPage = lazy(() => import('./components/SuperAdminLoginPage'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));
const CompanyAdminDashboard = lazy(() => import('./components/CompanyAdmin/CompanyAdminDashboard').then(module => ({ default: module.CompanyAdminDashboard })));
const DashboardOverview = lazy(() => import('./pages/dashboard/DashboardOverview'));

// Lazy load Public Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PublicPage = lazy(() => import('./pages/PublicPage'));
const NotFound = lazy(() => import('./pages/errors/NotFound'));

// Providers
import { AuthProvider, USER_STORAGE_KEY } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { CelebrationProvider } from './contexts/CelebrationContext';
import { Toaster } from './components/ui/sonner';



// Wrapper components to pass auth props
function ConnectedSuperAdminDashboard() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <SuperAdminDashboard user={user} onLogout={logout} />;
}

function ConnectedCompanyAdminDashboard() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <CompanyAdminDashboard user={user} onLogout={logout} />;
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [isSplashComplete, setIsSplashComplete] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoadingAuth(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  if (!isInitialized || isLoadingAuth || !isSplashComplete) {
    return <SplashScreen onComplete={() => setIsSplashComplete(true)} />;
  }

  return (
    <ErrorBoundary>
      <Toaster />
      <Router>
        <AuthProvider initialUser={currentUser}>
          <ActivityMonitor>
            <NotificationProvider>
              <ConfirmationProvider>
                <Suspense fallback={<SplashScreen onComplete={() => { }} />}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/contact" element={<PublicPage pageSlug="contact" />} />
                    <Route path="/about" element={<PublicPage pageSlug="about" />} />
                    <Route path="/security-vault" element={<PublicPage pageSlug="security-vault" />} />
                    <Route path="/api-docs" element={<PublicPage pageSlug="api-docs" />} />
                    <Route path="/privacy-policy" element={<PublicPage pageSlug="privacy-policy" />} />
                    <Route path="/terms-conditions" element={<PublicPage pageSlug="terms-conditions" />} />
                    <Route path="/:tenantSlug" element={<LoginPage />} />
                    <Route path="/tenant-login" element={<LoginPage />} />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route path="/superadmin-login" element={<SuperAdminLoginPage />} />

                    {/* Super Admin Routes */}
                    <Route
                      path="/superadmin/*"
                      element={
                        <ProtectedRoute requiredRole="SuperAdmin">
                          <Routes>
                            <Route path="/" element={<ConnectedSuperAdminDashboard />} />
                            <Route path="*" element={<Navigate to="/superadmin" replace />} />
                          </Routes>
                        </ProtectedRoute>
                      }
                    />

                    {/* Company Admin Routes */}
                    <Route
                      path="/admin/*"
                      element={
                        <ProtectedRoute requiredRole={["CompanyAdmin", "Admin"]}>
                          <CelebrationProvider>
                            <Routes>
                              <Route path="/" element={<ConnectedCompanyAdminDashboard />} />
                              <Route path="*" element={<Navigate to="/admin" replace />} />
                            </Routes>
                          </CelebrationProvider>
                        </ProtectedRoute>
                      }
                    />

                    {/* Employee/Telecaller Routes */}
                    <Route
                      path="/dashboard/*"
                      element={
                        <ProtectedRoute requiredRole={['Telecaller', 'TeamIncharge', 'Admin']}>
                          <CelebrationProvider>
                            <Routes>
                              <Route path="/" element={<DashboardOverview />} />
                              <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                          </CelebrationProvider>
                        </ProtectedRoute>
                      }
                    />

                    {/* 404 Not Found */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ConfirmationProvider>
            </NotificationProvider>
          </ActivityMonitor>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

// ✅ FIXED Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // ✅ CRITICAL FIX #1: Use useAuth() hook from context (NOT undefined currentUser)
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state while auth checks
  if (isLoading) {
    return <SplashScreen onComplete={() => { }} />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) {
      console.warn(`Unauthorized access attempt: ${user.role} tried to access ${requiredRole}`);
      return <Navigate to="/" replace />;
    }
  }

  return children;
}