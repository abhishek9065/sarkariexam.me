import { useNavigate } from 'react-router-dom';
import { Header, Footer } from '../components';
import { useAuth } from '../context/AuthContext';
import './V2.css';

export function NotFoundPage() {
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();

    const handlePageNavigation = (page: string) => {
        if (page === 'home') navigate('/');
        else if (page === 'admin') navigate('/admin');
        else navigate('/' + page);
    };

    return (
        <div className="app sr-v2-not-found">
            <Header
                setCurrentPage={handlePageNavigation}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => navigate('/')}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <main className="main-content sr-v2-main">
                <section className="sr-v2-not-found-card" aria-live="polite">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you requested does not exist or has moved to a new route.</p>
                    <div className="sr-v2-not-found-actions">
                        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                            Go Home
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/jobs')}>
                            Browse Jobs
                        </button>
                    </div>
                </section>
            </main>
            <Footer setCurrentPage={handlePageNavigation} />
        </div>
    );
}

export default NotFoundPage;
