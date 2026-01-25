import { useState } from 'react';
import './AdminLogin.css';

interface AdminLoginProps {
    onLogin: (email: string, pass: string) => Promise<void>;
    loading?: boolean;
    error?: string;
}

export function AdminLogin({ onLogin, loading = false, error }: AdminLoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onLogin(email, password);
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <h2>Admin Login</h2>
                <form onSubmit={handleSubmit} className="admin-login-form">
                    {error && <div className="login-error">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                    <div className="login-footer">
                        <a href="/" className="back-link">← Back to Home</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
