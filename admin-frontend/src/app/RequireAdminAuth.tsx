import { Navigate, Outlet } from 'react-router-dom';

import { useAdminAuth } from './useAdminAuth';

export function RequireAdminAuth() {
    const { user, loading } = useAdminAuth();

    if (loading) return <div className="admin-login-wrap">Loading admin session...</div>;
    if (!user || !['admin', 'editor', 'reviewer', 'viewer'].includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
