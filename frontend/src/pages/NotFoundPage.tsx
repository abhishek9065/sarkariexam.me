import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function NotFoundPage() {
    return (
        <Layout>
            <div className="not-found-page animate-fade-in">
                <span className="not-found-icon">🔍</span>
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p className="text-muted">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="not-found-actions">
                    <Link to="/" className="btn btn-accent">Go Home</Link>
                    <Link to="/jobs" className="btn btn-outline">Browse Jobs</Link>
                </div>
            </div>
        </Layout>
    );
}
