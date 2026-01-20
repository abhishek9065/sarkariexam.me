import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './MobileNav.css';

interface MobileNavProps {
    onShowAuth?: () => void;
}

export function MobileNav({ onShowAuth }: MobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleNavigation = (path: string) => {
        if (path === '/profile' && !isAuthenticated) {
            onShowAuth?.();
            return;
        }
        navigate(path);
    };

    return (
        <nav className="mobile-bottom-nav">
            <button
                className={`nav-btn ${isActive('/') ? 'active' : ''}`}
                onClick={() => handleNavigation('/')}
            >
                <span className="nav-icon">🏠</span>
                <span className="nav-label">Home</span>
            </button>

            <button
                className={`nav-btn ${isActive('/jobs') ? 'active' : ''}`}
                onClick={() => handleNavigation('/jobs')}
            >
                <span className="nav-icon">💼</span>
                <span className="nav-label">Jobs</span>
            </button>

            <button
                className={`nav-btn ${isActive('/results') ? 'active' : ''}`}
                onClick={() => handleNavigation('/results')}
            >
                <span className="nav-icon">📊</span>
                <span className="nav-label">Results</span>
            </button>

            <button
                className={`nav-btn ${isActive('/admit-card') ? 'active' : ''}`}
                onClick={() => handleNavigation('/admit-card')}
            >
                <span className="nav-icon">🎫</span>
                <span className="nav-label">Admit</span>
            </button>

            <button
                className={`nav-btn ${isActive('/profile') ? 'active' : ''}`}
                onClick={() => handleNavigation('/profile')}
            >
                <span className="nav-icon">{isAuthenticated ? '👤' : '🔐'}</span>
                <span className="nav-label">{isAuthenticated ? 'Profile' : 'Login'}</span>
            </button>
        </nav>
    );
}

export default MobileNav;
