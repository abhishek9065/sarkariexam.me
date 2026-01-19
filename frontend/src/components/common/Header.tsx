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
        if (themeMode === 'auto') return '🌓';
        if (themeMode === 'light') return '☀️';
        return '🌙';
    };

    const getThemeTooltip = () => {
        if (themeMode === 'auto') return 'Auto Mode (Night: Dark, Day: Light) - Click for Light';
        if (themeMode === 'light') return 'Light Mode - Click for Dark';
        return 'Dark Mode - Click for Auto';
    };

    return (
        <header className="site-header">
            <h1 className="site-title" onClick={() => setCurrentPage('home')} style={{ cursor: 'pointer' }}>
                SARKARIEXAMS.ME
            </h1>
            <p className="site-subtitle">SarkariExams.me</p>
            <div className="header-controls">
                <button className="theme-toggle" onClick={toggleTheme} title={getThemeTooltip()}>
                    {getThemeIcon()}
                </button>
                <div className="header-auth">
                    {isAuthenticated ? (
                        <div className="user-menu">
                            <span
                                className="user-name"
                                onClick={onProfileClick}
                                style={{ cursor: 'pointer', borderBottom: '1px dashed transparent' }}
                                title="View Profile"
                            >
                                👤 {user?.name}
                            </span>
                            <button className="auth-btn logout-btn" onClick={onLogout}>Logout</button>
                        </div>
                    ) : (
                        <button className="auth-btn login-btn" onClick={onLogin}>🔐 Login</button>
                    )}
                </div>
            </div>
        </header>
    );
}
