import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS, PATHS, type PageType, type TabType } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

interface NavProps {
    activeTab: TabType;
    setActiveTab?: (type: TabType) => void; // Optional now, kept for backward compat if needed
    setShowSearch: (show: boolean) => void;
    goBack?: () => void;
    setCurrentPage: (page: PageType) => void;
    isAuthenticated: boolean;
    onShowAuth: () => void;
}

export function Navigation({ activeTab, setShowSearch, setCurrentPage, isAuthenticated, onShowAuth }: NavProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';

    const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
        if (item.type === 'bookmarks' && !isAuthenticated) {
            onShowAuth();
            return;
        }

        // Navigate to SEO-friendly URL
        const path = PATHS[String(item.type)] || '/';
        navigate(path);
        
        setMobileMenuOpen(false); // Close menu after selection
    };

    return (
        <nav className="main-nav">
            {/* Hamburger Menu Button - Only visible on mobile */}
            <button
                className="hamburger-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
            >
                <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </button>

            {/* Navigation Container */}
            <div className={`nav-container ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                {NAV_ITEMS.map((item) => {
                    if (item.type === 'bookmarks' && !isAuthenticated) return null;
                    const isActive = activeTab === item.type;
                    
                    return (
                        <button
                            key={item.label}
                            className={`nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => handleNavClick(item)}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={`Navigate to ${item.label} section`}
                        >
                            {item.label}
                        </button>
                    );
                })}
                <button 
                    className="nav-search" 
                    onClick={() => { setShowSearch(true); setMobileMenuOpen(false); }}
                    aria-label="Open search"
                >
                    <span aria-hidden="true">🔍</span>
                    <span className="search-text">Search</span>
                </button>
                {isAdmin && (
                    <button 
                        className="nav-link admin-link" 
                        onClick={() => { setCurrentPage('admin'); setMobileMenuOpen(false); }}
                        aria-label="Admin panel"
                    >
                        <span aria-hidden="true">⚙️</span>
                        <span>Admin</span>
                    </button>
                )}
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
            )}
        </nav>
    );
}
