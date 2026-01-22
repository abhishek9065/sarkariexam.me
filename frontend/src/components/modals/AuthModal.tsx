import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$';

const getPasswordError = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must include at least one number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character';
    return null;
};

interface AuthModalProps {
    show: boolean;
    onClose: () => void;
}

export function AuthModal({ show, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();

    if (!show) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await login(formData.email, formData.password);
            } else {
                if (formData.name.length < 2) {
                    throw new Error('Name must be at least 2 characters');
                }
                const passwordError = getPasswordError(formData.password);
                if (passwordError) {
                    throw new Error(passwordError);
                }
                await register(formData.name, formData.email, formData.password);
            }
            onClose();
            setFormData({ name: '', email: '', password: '' });
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose}>×</button>

                <h2 className="auth-title">{isLogin ? '🔐 Login' : '📝 Register'}</h2>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(true); setError(null); }}
                    >
                        Login
                    </button>
                    <button
                        className={`auth-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(false); setError(null); }}
                    >
                        Register
                    </button>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="auth-input"
                            />
                            <div className="auth-hint">Name: 2 to 100 characters.</div>
                        </>
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={8}
                        pattern={isLogin ? undefined : passwordPattern}
                        title={isLogin ? 'Enter your password' : 'At least 8 characters, with uppercase, lowercase, number, and special character'}
                        className="auth-input"
                    />
                    {!isLogin && (
                        <div className="auth-hint">
                            Password: 8+ chars with uppercase, lowercase, number, and special character.
                        </div>
                    )}
                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AuthModal;
