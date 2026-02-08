import type { KeyboardEvent } from 'react';
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
    const handleHomeNavigation = () => setCurrentPage('home');
    const handleHomeKeyDown = (event: KeyboardEvent<HTMLHeadingElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleHomeNavigation();
    };

    return (
        <header className="site-header v2-shell-header">
            <div className="header-inner v2-shell-header-inner">
                <h1 className="site-title v2-shell-title" onClick={handleHomeNavigation} role="button" tabIndex={0} onKeyDown={handleHomeKeyDown}>
                    <span className="site-title-kicker">Exam Updates Hub</span>
                    <span className="site-title-brand">SarkariExams.me</span>
                    <small className="year-indicator">Academic Year {academicYear}</small>
                </h1>
                <div className="header-controls v2-shell-controls">
                    <LanguageSwitcher />
                    {isAuthenticated ? (
                        <>
                            <NotificationCenter token={token ?? null} />
                            <button className="user-name v2-shell-user" onClick={onProfileClick} aria-label={`User profile: ${displayName}`}>
                                <span className="user-icon" aria-hidden="true">👤</span>
                                <span>{displayName}</span>
                            </button>
                            <button 
                                className="login-btn logout-btn v2-shell-logout" 
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
                        <button className="login-btn v2-shell-login" onClick={onLogin} aria-label="Log in">
                            <span className="login-icon" aria-hidden="true">🔐</span>
                            <span>Login</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
