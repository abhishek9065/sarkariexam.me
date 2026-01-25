import { ReactNode } from 'react';
import { Header, Navigation, Footer, Marquee, ScrollToTop } from '../components';

interface MainLayoutProps {
    children: ReactNode;
    activeTab?: string;
    setActiveTab?: (tab: any) => void;
    setShowSearch?: (show: boolean) => void;
    goBack?: () => void;
    setCurrentPage?: (page: any) => void;
    isAuthenticated?: boolean;
    user?: any;
    onShowAuth?: () => void;
    onLogin?: () => void;
    onLogout?: () => void;
    onProfileClick?: () => void;
}

export function MainLayout({
    children,
    activeTab,
    setActiveTab,
    setShowSearch,
    goBack,
    setCurrentPage,
    isAuthenticated = false,
    user,
    onShowAuth,
    onLogin,
    onLogout,
    onProfileClick
}: MainLayoutProps) {
    return (
        <div className="app-container">
            <Header
                setCurrentPage={setCurrentPage || (() => { })}
                user={user}
                isAuthenticated={isAuthenticated}
                onLogin={onLogin || (() => { })}
                onLogout={onLogout || (() => { })}
                onProfileClick={onProfileClick}
            />

            <Navigation
                activeTab={activeTab as import('../utils').TabType | undefined}
                setActiveTab={setActiveTab || (() => { })}
                setShowSearch={setShowSearch || (() => { })}
                goBack={goBack || (() => { })}
                setCurrentPage={setCurrentPage || (() => { })}
                isAuthenticated={isAuthenticated}
                onShowAuth={onShowAuth || (() => { })}
            />

            <Marquee />

            <main className="main-content">
                {children}
            </main>

            <Footer setCurrentPage={setCurrentPage || (() => { })} />

            <ScrollToTop />
        </div>
    );
}

export default MainLayout;
