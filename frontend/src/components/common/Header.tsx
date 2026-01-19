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
            <div className="header-inner">
                <h1 className="site-title" onClick={() => setCurrentPage('home')}>
                    SarkariExams.me
                </h1>
                <div className="header-controls">
                    <button className="theme-toggle" onClick={toggleTheme} title={getThemeTooltip()}>
                        {getThemeIcon()}
                    </button>
                    {isAuthenticated ? (
                        <>
                            <span className="user-name" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
                                👤 {user?.name}
                            </span>
                            <button className="login-btn" onClick={onLogout}>Logout</button>
                        </>
                    ) : (
                        <button className="login-btn" onClick={onLogin}>Login</button>
                    )}
                </div>
            </div>
        </header>
    );
}
