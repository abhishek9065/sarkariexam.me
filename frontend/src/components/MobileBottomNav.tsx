import { Link, useLocation } from 'react-router-dom';
import './MobileBottomNav.css';

const NAV_ITEMS = [
    { key: 'home', label: 'Home', icon: '🏠', to: '/' },
    { key: 'jobs', label: 'Jobs', icon: '💼', to: '/jobs' },
    { key: 'results', label: 'Results', icon: '📊', to: '/results' },
    { key: 'admit', label: 'Admit Card', icon: '🎫', to: '/admit-card' },
];

export function MobileBottomNav() {
    const { pathname } = useLocation();

    // Check if the current route matches the nav item (Home is a special case)
    const isActive = (to: string) => {
        if (to === '/') return pathname === '/';
        return pathname.startsWith(to);
    };

    return (
        <nav className="mobile-bottom-nav">
            <ul className="mbn-list">
                {NAV_ITEMS.map((item) => {
                    const active = isActive(item.to);
                    return (
                        <li key={item.key} className={`mbn-item ${active ? 'active' : ''}`}>
                            <Link to={item.to} className="mbn-link">
                                <span className="mbn-icon" aria-hidden="true">{item.icon}</span>
                                <span className="mbn-label">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
