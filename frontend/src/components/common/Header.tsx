import type { PageType } from '../../utils/constants';
import { NotificationCenter } from '../ui/NotificationCenter';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

interface HeaderProps {
    setCurrentPage: (page: PageType) => void;
    user: any;
    token?: string | null;
    isAuthenticated: boolean;
    onLogin: () => void;
    onLogout: () => void;
    onProfileClick?: () => void;
}

function getAcademicYearLabel(date = new Date()): string {
    const month = date.getMonth(); // 0-based
    const year = date.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYearShort = String(startYear + 1).slice(-2);
    return `${startYear}-${endYearShort}`;
}

export function Header({ setCurrentPage, user, token, isAuthenticated, onLogin, onLogout, onProfileClick }: HeaderProps) {
    const displayName = user?.name || user?.email || 'Account';
    const academicYear = getAcademicYearLabel();

    return (
        <header className="site-header">
            <div className="header-inner">
                <h1 className="site-title" onClick={() => setCurrentPage('home')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setCurrentPage('home')}>
                    ⚡ SarkariExams.me
                    <small className="year-indicator">{academicYear}</small>
                </h1>
                <div className="header-controls">
                    <LanguageSwitcher />
                    {isAuthenticated ? (
                        <>
                            <NotificationCenter token={token ?? null} />
                            <button className="user-name" onClick={onProfileClick} aria-label={`User profile: ${displayName}`}>
                                <span className="user-icon" aria-hidden="true">👤</span>
                                <span>{displayName}</span>
                            </button>
                            <button 
                                className="login-btn logout-btn" 
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to log out?')) {
                                        onLogout();
                                    }
                                }} 
                                aria-label="Log out"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button className="login-btn" onClick={onLogin} aria-label="Log in">
                            <span className="login-icon" aria-hidden="true">🔐</span>
                            <span>Login</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
