import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TelecallerDashboard } from '../../components/TelecallerDashboard';
import { TeamInchargeDashboard } from '../../components/TeamIncharge';
import { Navigate } from 'react-router-dom';

const DashboardOverview: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (user.role === 'Telecaller') {
        if (!user.empId) {
            console.error('Telecaller user missing empId');
            return <Navigate to="/" replace />;
        }
        return <TelecallerDashboard user={user as typeof user & { empId: string }} onLogout={logout} />;
    }

    if (user.role === 'TeamIncharge') {
        // TeamInchargeDashboard inside uses useAuth, so might not need props, 
        // but looking at its definition it takes no props.
        return <TeamInchargeDashboard user={user} onLogout={logout} />;
    }

    // Fallback or specific dashboard for other roles if needed
    // For now, redirect to not found or home
    return <Navigate to="/" replace />;
};

export default DashboardOverview;
