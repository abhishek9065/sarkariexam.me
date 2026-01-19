import { useTheme } from '../../context/ThemeContext';
import type { PageType } from '../../utils/constants';

interface HeaderProps {
    setCurrentPage: (page: PageType) => void;
    user: any;
    isAuthenticated: boolean;
    onLogin: () => void;
    onLogout: () => void;
    onProfileClick?: () => void;
}

export function Header({ setCurrentPage, user, isAuthenticated, onLogin, onLogout, onProfileClick }: HeaderProps) {
    const { themeMode, toggleTheme } = useTheme();

    const getThemeIcon = () => {
        if (themeMode === 'auto') return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
        );
        if (themeMode === 'light') return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        );
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        );
    };

    const getThemeTooltip = () => {
        if (themeMode === 'auto') return 'Auto Mode - Click for Light';
        if (themeMode === 'light') return 'Light Mode - Click for Dark';
        return 'Dark Mode - Click for Auto';
    };

    return (
        <header className="site-header">
            <h1 className="site-title" onClick={() => setCurrentPage('home')}>
                SARKARIEXAMS.ME
            </h1>
            <p className="site-subtitle">Your Gateway to Government Jobs</p>
            <div className="header-controls">
                <button 
                    className="theme-toggle" 
                    onClick={toggleTheme} 
                    title={getThemeTooltip()}
                    aria-label="Toggle theme"
                >
                    {getThemeIcon()}
                </button>
                <div className="header-auth">
                    {isAuthenticated ? (
                        <div className="user-menu">
                            <span
                                className="user-name"
                                onClick={onProfileClick}
                                style={{ cursor: 'pointer' }}
                                title="View Profile"
                            >
                                {user?.name}
                            </span>
                            <button className="auth-btn logout-btn" onClick={onLogout}>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button className="auth-btn login-btn" onClick={onLogin}>
                            Login
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
