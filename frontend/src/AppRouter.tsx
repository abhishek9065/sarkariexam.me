import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { QueryProvider } from './context/QueryProvider';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { ErrorBoundary, SkeletonLoader, AccessibilityPanel, NotificationPrompt, LegacyRedirect, PWAInstallPrompt } from './components';
import { hydrateFeatureFlags, isFeatureEnabled } from './utils/featureFlags';
import type { ContentType } from './types';
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
const HomePageV3 = lazy(() => import('./v3/pages/HomePageV3').then((mod) => ({ default: mod.HomePageV3 })));
const CategoryPageV3 = lazy(() => import('./v3/pages/CategoryPageV3').then((mod) => ({ default: mod.CategoryPageV3 })));
const DetailPageV3 = lazy(() => import('./v3/pages/DetailPageV3').then((mod) => ({ default: mod.DetailPageV3 })));
const ProfilePageV3 = lazy(() => import('./v3/pages/ProfilePageV3').then((mod) => ({ default: mod.ProfilePageV3 })));

const normalizeContentType = (value?: string): ContentType | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    const map: Record<string, ContentType> = {
        job: 'job',
        jobs: 'job',
        result: 'result',
        results: 'result',
        'admit-card': 'admit-card',
        'admit-cards': 'admit-card',
        'answer-key': 'answer-key',
        'answer-keys': 'answer-key',
        admission: 'admission',
        admissions: 'admission',
        syllabus: 'syllabus',
    };
    return map[normalized] ?? null;
};

function DynamicDetailRoute({ useV3 }: { useV3: boolean }) {
    const { type } = useParams<{ type: string }>();
    const normalizedType = normalizeContentType(type);

    if (!normalizedType) {
        return <LegacyRedirect />;
    }

    return useV3
        ? <DetailPageV3 type={normalizedType} />
        : <DetailPage type={normalizedType} />;
}

function AppRoutes() {
    const location = useLocation();
    const showUserPrompts = !location.pathname.startsWith('/admin');
    const searchParams = new URLSearchParams(location.search);
    const isLegacyQuery = searchParams.has('item') || searchParams.has('tab');
    const [, setFlagsVersion] = useState(0);
    const homeV3 = isFeatureEnabled('frontend_public_v3_home');
    const categoryV3 = isFeatureEnabled('frontend_public_v3_category');
    const detailV3 = isFeatureEnabled('frontend_public_v3_detail');
    const profileV3 = isFeatureEnabled('frontend_public_v3_profile');

    useEffect(() => {
        void hydrateFeatureFlags().finally(() => {
            setFlagsVersion((prev) => prev + 1);
        });
    }, []);

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
                    <Route path="/" element={isLegacyQuery ? <LegacyRedirect /> : (homeV3 ? <HomePageV3 /> : <HomePage />)} />
                    <Route path="/home" element={homeV3 ? <HomePageV3 /> : <HomePage />} />

                    {/* Category Pages with SEO-friendly URLs */}
                    <Route path="/jobs" element={categoryV3 ? <CategoryPageV3 type="job" /> : <CategoryPage type="job" />} />
                    <Route path="/results" element={categoryV3 ? <CategoryPageV3 type="result" /> : <CategoryPage type="result" />} />
                    <Route path="/admit-card" element={categoryV3 ? <CategoryPageV3 type="admit-card" /> : <CategoryPage type="admit-card" />} />
                    <Route path="/admit-cards" element={categoryV3 ? <CategoryPageV3 type="admit-card" /> : <CategoryPage type="admit-card" />} />
                    <Route path="/answer-key" element={categoryV3 ? <CategoryPageV3 type="answer-key" /> : <CategoryPage type="answer-key" />} />
                    <Route path="/admission" element={categoryV3 ? <CategoryPageV3 type="admission" /> : <CategoryPage type="admission" />} />
                    <Route path="/syllabus" element={categoryV3 ? <CategoryPageV3 type="syllabus" /> : <CategoryPage type="syllabus" />} />

                    {/* Detail Pages with SEO-friendly URLs */}
                    <Route path="/job/:slug" element={detailV3 ? <DetailPageV3 type="job" /> : <DetailPage type="job" />} />
                    <Route path="/result/:slug" element={detailV3 ? <DetailPageV3 type="result" /> : <DetailPage type="result" />} />
                    <Route path="/admit-card/:slug" element={detailV3 ? <DetailPageV3 type="admit-card" /> : <DetailPage type="admit-card" />} />
                    <Route path="/answer-key/:slug" element={detailV3 ? <DetailPageV3 type="answer-key" /> : <DetailPage type="answer-key" />} />
                    <Route path="/admission/:slug" element={detailV3 ? <DetailPageV3 type="admission" /> : <DetailPage type="admission" />} />
                    <Route path="/syllabus/:slug" element={detailV3 ? <DetailPageV3 type="syllabus" /> : <DetailPage type="syllabus" />} />
                    <Route path="/:type/:slug" element={<DynamicDetailRoute useV3={detailV3} />} />

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
                    <Route path="/profile" element={profileV3 ? <ProfilePageV3 /> : <ProfilePage />} />

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

                    {/* Fallback - legacy and unknown URLs */}
                    <Route path="*" element={<LegacyRedirect />} />
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
