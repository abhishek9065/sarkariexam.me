import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { SkeletonLoader } from './SkeletonLoader';
import { Layout } from './Layout';

interface Props {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
    const { user, loading } = useAuth();

    if (loading) {
        return <Layout><SkeletonLoader /></Layout>;
    }

    if (!user) {
        return <Navigate to="/?login=1" replace />;
    }

    return <>{children}</>;
}
