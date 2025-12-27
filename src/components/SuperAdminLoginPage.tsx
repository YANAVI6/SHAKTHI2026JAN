import React from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePageConfig } from '../utils/pageUtils';

const SuperAdminLoginPage: React.FC = () => {
    const { login, isAuthenticated, user } = useAuth();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    usePageConfig('login', 'Super Admin Login');

    // Guard: Check for secret access flag
    const hasAccess = sessionStorage.getItem('shakti_sa_access');
    if (hasAccess !== 'true') {
        return <Navigate to="/" replace />;
    }



    if (isAuthenticated && user) {
        if (user.role === 'SuperAdmin') {
            return <Navigate to="/superadmin" replace />;
        }
        if (user.role === 'CompanyAdmin') {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(username, password, 'SuperAdmin');
        } catch {
            setError('Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
            {/* Background Graphics */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="text-center mb-12 relative z-10">
                    {/* Logo and Brand Section */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative">
                            {/* Logo Background Circle */}
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-4 mx-auto relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                                <Zap className="w-10 h-10 text-white relative z-10" strokeWidth={2.5} />
                            </div>
                            {/* Decorative rings */}
                            <div className="absolute -inset-2 border-2 border-purple-500/30 rounded-full animate-pulse"></div>
                            <div className="absolute -inset-4 border border-purple-500/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        </div>
                    </div>

                    {/* Brand Name with Custom Styling */}
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-blue-200 mb-2 tracking-tight">
                        Shakti
                    </h1>

                    {/* Tagline */}
                    <div className="flex items-center justify-center mb-4">
                        <Shield className="w-5 h-5 text-purple-400 mr-2" />
                        <p className="text-lg font-medium text-gray-300">
                            Super Admin Portal
                        </p>
                        <TrendingUp className="w-5 h-5 text-purple-400 ml-2" />
                    </div>
                </div>

                <div className="max-w-md mx-auto">
                    {/* Login Form */}
                    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 p-8 relative z-10">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-gray-400 text-sm">Please sign in to continue</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-800/50 text-white placeholder-gray-500 backdrop-blur-sm"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-800/50 text-white placeholder-gray-500 backdrop-blur-sm"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm text-center bg-red-900/30 backdrop-blur-sm py-2 px-4 rounded-lg border border-red-500/30">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${isLoading
                                    ? 'bg-gray-600 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                    }`}
                            >
                                {isLoading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <p className="text-sm text-gray-500 relative z-10">
                        Restricted Access • Authorized Personnel Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminLoginPage;
