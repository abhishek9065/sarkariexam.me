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
                <h1 className="site-title" onClick={() => setCurrentPage('home')}>
                    ⚡ SarkariExams.me
                </h1>
                <div className="header-controls">
                    {isAuthenticated ? (
                        <>
                            <NotificationCenter token={token ?? null} userId={user?.id} />
                            <span className="user-name" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
                                👤 {user?.name}
                            </span>
                            <button className="login-btn" onClick={onLogout}>Logout</button>
                        </>
                    ) : (
                        <button className="login-btn" onClick={onLogin}>🔐 Login</button>
                    )}
                </div>
            </div>
        </header>
    );
}
