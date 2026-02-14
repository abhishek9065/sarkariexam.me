import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SkeletonLoader } from './SkeletonLoader';
import { Layout } from './Layout';

interface Props {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: Props) {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return <Layout><SkeletonLoader /></Layout>;
    }

    if (!user) {
        return <Navigate to="/?login=1" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
