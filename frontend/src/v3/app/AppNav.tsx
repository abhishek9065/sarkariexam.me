import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AppNavProps {
    onOpenSearch: () => void;
    compareCount?: number;
    onOpenCompare?: () => void;
}

const categoryLinks = [
    { label: 'Jobs', to: '/jobs' },
    { label: 'Results', to: '/results' },
    { label: 'Admit Card', to: '/admit-card' },
    { label: 'Answer Key', to: '/answer-key' },
    { label: 'Admission', to: '/admission' },
    { label: 'Syllabus', to: '/syllabus' },
];

export function AppNav({ onOpenSearch, compareCount = 0, onOpenCompare }: AppNavProps) {
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <header className="sr3-nav-wrap">
            <div className="sr3-nav-top">
                <div className="sr3-shell sr3-nav-top-inner">
                    <span className="sr3-nav-top-pill">Live updates every few minutes</span>
                    <div className="sr3-meta-row">
                        <button type="button" className="sr3-nav-link-btn" onClick={onOpenSearch}>Search</button>
                        {onOpenCompare && (
                            <button type="button" className="sr3-nav-link-btn" onClick={onOpenCompare}>
                                Compare ({compareCount})
                            </button>
                        )}
                        <button type="button" className="sr3-nav-link-btn" onClick={() => navigate('/profile')}>
                            {isAuthenticated ? 'My Profile' : 'Login'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="sr3-shell sr3-nav-main sr3-surface">
                <div className="sr3-brand-area">
                    <button type="button" className="sr3-brand" onClick={() => navigate('/')}>
                        SarkariExams.me
                    </button>
                    <p className="sr3-brand-caption">Fast, dense, trust-first government updates</p>
                </div>
                <nav className="sr3-nav-links" aria-label="Primary">
                    <NavLink to="/" className="sr3-nav-item">Home</NavLink>
                    {categoryLinks.map((link) => (
                        <NavLink key={link.to} to={link.to} className="sr3-nav-item">
                            {link.label}
                        </NavLink>
                    ))}
                    <NavLink to="/community" className="sr3-nav-item">Community</NavLink>
                </nav>
                <div className="sr3-nav-actions">
                    {isAuthenticated && (
                        <span className="sr3-nav-user" title={user?.email || ''}>{user?.name || 'User'}</span>
                    )}
                    {isAuthenticated ? (
                        <button type="button" className="sr3-btn secondary" onClick={() => { void logout(); }}>
                            Logout
                        </button>
                    ) : (
                        <button type="button" className="sr3-btn secondary" onClick={() => navigate('/profile')}>
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default AppNav;
