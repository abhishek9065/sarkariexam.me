import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header, Navigation, Footer } from '../components';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/constants';

type SubscriptionAction = 'verify' | 'unsubscribe';

export function SubscriptionActionPage({ action }: { action: SubscriptionAction }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, token, logout, isAuthenticated } = useAuth();
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
        <div className="app">
            <Header
                setCurrentPage={(page) => navigate('/' + page)}
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
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main className="main-content">
                <div className="static-page">
                    <button className="back-btn" onClick={() => navigate('/')}>Back</button>
                    <h1>{title}</h1>
                    <div className="static-content">
                        {status === 'loading' ? (
                            <p>Processing your request...</p>
                        ) : (
                            <p>{message}</p>
                        )}
                        {status !== 'loading' && (
                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <button className="admin-btn primary" onClick={() => navigate('/')}>Go Home</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
        </div>
    );
}

export default SubscriptionActionPage;
