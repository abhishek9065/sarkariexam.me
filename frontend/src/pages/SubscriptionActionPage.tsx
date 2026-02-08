import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header, Navigation, Footer } from '../components';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/constants';
import './V2.css';

type SubscriptionAction = 'verify' | 'unsubscribe';

export function SubscriptionActionPage({ action }: { action: SubscriptionAction }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, token, logout, isAuthenticated } = useAuth();
    const handlePageNavigation = (page: string) => {
        if (page === 'home') navigate('/');
        else if (page === 'admin') navigate('/admin');
        else navigate('/' + page);
    };
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Missing token.');
            return;
        }

        const controller = new AbortController();
        const endpoint = action === 'verify' ? 'verify' : 'unsubscribe';

        const run = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/subscriptions/${endpoint}?token=${encodeURIComponent(token)}`,
                    { signal: controller.signal }
                );
                const body = await res.json().catch(() => ({}));

                if (!res.ok) {
                    setStatus('error');
                    setMessage(body.error || 'Request failed.');
                    return;
                }

                setStatus('success');
                setMessage(body.message || (action === 'verify'
                    ? 'Your subscription has been verified.'
                    : 'You have been unsubscribed.'));
            } catch (error: any) {
                if (error?.name === 'AbortError') return;
                setStatus('error');
                setMessage('Network error. Please try again.');
            }
        };

        run();

        return () => controller.abort();
    }, [action, searchParams]);

    const title = status === 'loading'
        ? 'Processing request'
        : action === 'verify'
            ? 'Subscription Verified'
            : 'Unsubscribed';

    return (
        <div className="app sr-v2-subscription">
            <a className="sr-v2-skip-link" href="#subscription-main">
                Skip to subscription status
            </a>
            <Header
                setCurrentPage={handlePageNavigation}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => { }}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <Navigation
                activeTab={undefined}
                setShowSearch={() => { }}
                setCurrentPage={handlePageNavigation}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main id="subscription-main" className="main-content sr-v2-main">
                <div className="static-page">
                    <button className="back-btn sr-v2-static-back" onClick={() => navigate('/')}>Back</button>
                    <h1>{title}</h1>
                    <div className="static-content sr-v2-subscription-card">
                        {status === 'loading' ? (
                            <p role="status" aria-live="polite">Processing your request...</p>
                        ) : (
                            <p role={status === 'error' ? 'alert' : 'status'}>{message}</p>
                        )}
                        {status !== 'loading' && (
                            <div className="sr-v2-subscription-actions">
                                <button className="admin-btn primary v2-shell-login" onClick={() => navigate('/')}>Go Home</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer setCurrentPage={handlePageNavigation} />
        </div>
    );
}

export default SubscriptionActionPage;
