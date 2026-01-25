import type { PageType } from '../../utils/constants';
import { NotificationCenter } from '../ui/NotificationCenter';

interface HeaderProps {
    setCurrentPage: (page: PageType) => void;
    user: any;
    token?: string | null;
    isAuthenticated: boolean;
    onLogin: () => void;
    onLogout: () => void;
    onProfileClick?: () => void;
}

export function Header({ setCurrentPage, user, token, isAuthenticated, onLogin, onLogout, onProfileClick }: HeaderProps) {
    return (
        <header className="site-header">
            <div className="header-inner">
                <h1 className="site-title" onClick={() => setCurrentPage('home')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setCurrentPage('home')}>
                    ⚡ SarkariExams.me
                    <small className="year-indicator">2025-26</small>
                </h1>
                <div className="header-controls">
                    {isAuthenticated ? (
                        <>
                            <NotificationCenter token={token ?? null} />
                            <button className="user-name" onClick={onProfileClick} aria-label={`User profile: ${user?.name}`}>
                                <span className="user-icon" aria-hidden="true">👤</span>
                                <span>{user?.name}</span>
                            </button>
                            <button className="login-btn logout-btn" onClick={onLogout} aria-label="Logout">Logout</button>
                        </>
                    ) : (
                        <button className="login-btn" onClick={onLogin} aria-label="Login to account">
                            <span className="login-icon" aria-hidden="true">🔐</span>
                            <span>Login</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
