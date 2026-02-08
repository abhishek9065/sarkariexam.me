import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { QueryProvider } from './context/QueryProvider';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { ErrorBoundary, SkeletonLoader, AccessibilityPanel, NotificationPrompt, LegacyRedirect, PWAInstallPrompt } from './components';
import './styles.css';

const HomePage = lazy(() => import('./pages/HomePage').then((mod) => ({ default: mod.HomePage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((mod) => ({ default: mod.CategoryPage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then((mod) => ({ default: mod.DetailPage })));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const StaticPage = lazy(() => import('./pages/StaticPages').then((mod) => ({ default: mod.StaticPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((mod) => ({ default: mod.ProfilePage })));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then((mod) => ({ default: mod.BookmarksPage })));
const SubscriptionActionPage = lazy(() => import('./pages/SubscriptionActionPage').then((mod) => ({ default: mod.SubscriptionActionPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((mod) => ({ default: mod.CommunityPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((mod) => ({ default: mod.NotFoundPage })));

function AppRoutes() {
    const location = useLocation();
    const showUserPrompts = !location.pathname.startsWith('/admin');
    const searchParams = new URLSearchParams(location.search);
    const isLegacyQuery = searchParams.has('item') || searchParams.has('tab');

    return (
        <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="app"><main className="main-content"><SkeletonLoader /></main></div>}>
                {showUserPrompts && (
                    <>
                        <NotificationPrompt />
                        <PWAInstallPrompt />
                    </>
                )}
                <Routes location={location}>
                    {/* Home Page */}
                    <Route path="/" element={isLegacyQuery ? <LegacyRedirect /> : <HomePage />} />
                    <Route path="/home" element={<HomePage />} />

                    {/* Category Pages with SEO-friendly URLs */}
                    <Route path="/jobs" element={<CategoryPage type="job" />} />
                    <Route path="/results" element={<CategoryPage type="result" />} />
                    <Route path="/admit-card" element={<CategoryPage type="admit-card" />} />
                    <Route path="/admit-cards" element={<CategoryPage type="admit-card" />} />
                    <Route path="/answer-key" element={<CategoryPage type="answer-key" />} />
                    <Route path="/answer-keys" element={<CategoryPage type="answer-key" />} />
                    <Route path="/admission" element={<CategoryPage type="admission" />} />
                    <Route path="/admissions" element={<CategoryPage type="admission" />} />
                    <Route path="/syllabus" element={<CategoryPage type="syllabus" />} />

                    {/* Detail Pages with SEO-friendly URLs */}
                    <Route path="/job/:slug" element={<DetailPage type="job" />} />
                    <Route path="/jobs/:slug" element={<DetailPage type="job" />} />
                    <Route path="/result/:slug" element={<DetailPage type="result" />} />
                    <Route path="/results/:slug" element={<DetailPage type="result" />} />
                    <Route path="/admit-card/:slug" element={<DetailPage type="admit-card" />} />
                    <Route path="/admit-cards/:slug" element={<DetailPage type="admit-card" />} />
                    <Route path="/answer-key/:slug" element={<DetailPage type="answer-key" />} />
                    <Route path="/answer-keys/:slug" element={<DetailPage type="answer-key" />} />
                    <Route path="/admission/:slug" element={<DetailPage type="admission" />} />
                    <Route path="/admissions/:slug" element={<DetailPage type="admission" />} />
                    <Route path="/syllabus/:slug" element={<DetailPage type="syllabus" />} />

                    {/* Admin Page */}
                    <Route
                        path="/admin"
                        element={
                            <Suspense fallback={<div className="app"><main className="main-content"><SkeletonLoader /></main></div>}>
                                <AdminPage />
                            </Suspense>
                        }
                    />

                    {/* Profile Page */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Bookmarks Page */}
                    <Route path="/bookmarks" element={<BookmarksPage />} />

                    {/* Subscription Actions */}
                    <Route path="/verify" element={<SubscriptionActionPage action="verify" />} />
                    <Route path="/unsubscribe" element={<SubscriptionActionPage action="unsubscribe" />} />

                    {/* Community */}
                    <Route path="/community" element={<CommunityPage />} />

                    {/* Static Pages */}
                    <Route path="/about" element={<StaticPage type="about" />} />
                    <Route path="/contact" element={<StaticPage type="contact" />} />
                    <Route path="/privacy" element={<StaticPage type="privacy" />} />
                    <Route path="/disclaimer" element={<StaticPage type="disclaimer" />} />

                    {/* Fallback */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

export default function App() {
    return (
        <QueryProvider>
            <BrowserRouter>
                <AuthProvider>
                    <ThemeProvider>
                        <LanguageProvider>
                            <OnboardingModal />
                            <AppRoutes />
                            <AccessibilityPanel />
                        </LanguageProvider>
                    </ThemeProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryProvider>
    );
}
