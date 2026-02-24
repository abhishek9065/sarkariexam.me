import { Navigate, Outlet } from 'react-router-dom';

import { useAdminAuth } from './useAdminAuth';

export function RequireAdminAuth() {
    const { user, loading } = useAdminAuth();

    if (loading) {
        return (
            <div className="admin-login-wrap">
                <div className="admin-login-card">
                    <div className="admin-alert info">Loading admin session...</div>
                </div>
            </div>
        );
    }
    if (!user || !['admin', 'editor', 'contributor', 'reviewer', 'viewer'].includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
