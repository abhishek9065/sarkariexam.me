import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SkeletonLoader } from './components/SkeletonLoader';
import { AdminDesktopOnlyGate } from './components/AdminDesktopOnlyGate';
import { Layout } from './components/Layout';

/* Lazy-loaded pages */
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const StaticPage = lazy(() => import('./pages/StaticPage').then((m) => ({ default: m.StaticPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const TrendingPage = lazy(() => import('./pages/TrendingPage').then((m) => ({ default: m.TrendingPage })));
const SubscriptionActionPage = lazy(() => import('./pages/SubscriptionActionPage').then((m) => ({ default: m.SubscriptionActionPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const ENABLE_E2E_ERROR_BOUNDARY_ROUTES = import.meta.env.VITE_E2E_ERROR_BOUNDARY_ROUTES === '1';

function SuspenseFallback() {
    return (
        <Layout>
            <SkeletonLoader />
        </Layout>
    );
}

function RouteAwareErrorBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    return <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>{children}</ErrorBoundary>;
}

function E2EErrorBoundaryOkPage() {
    return (
        <Layout>
            <section data-testid="e2e-error-boundary-ok">
                <h1>Error boundary recovered</h1>
                <p>The app rendered normally after leaving the crashing route.</p>
            </section>
        </Layout>
    );
}

function E2EErrorBoundaryCrashPage() {
    throw new Error('Intentional e2e route crash');
}

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <RouteAwareErrorBoundary>
                            <Suspense fallback={<SuspenseFallback />}>
                                <Routes>
                                    {/* Home */}
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/home" element={<HomePage />} />

                                    {/* Category pages */}
                                    <Route path="/jobs" element={<CategoryPage type="job" />} />
                                    <Route path="/results" element={<CategoryPage type="result" />} />
                                    <Route path="/admit-card" element={<CategoryPage type="admit-card" />} />
                                    <Route path="/admit-cards" element={<CategoryPage type="admit-card" />} />
                                    <Route path="/answer-key" element={<CategoryPage type="answer-key" />} />
                                    <Route path="/admission" element={<CategoryPage type="admission" />} />
                                    <Route path="/syllabus" element={<CategoryPage type="syllabus" />} />

                                    {/* Detail pages */}
                                    <Route path="/job/:slug" element={<DetailPage type="job" />} />
                                    <Route path="/result/:slug" element={<DetailPage type="result" />} />
                                    <Route path="/admit-card/:slug" element={<DetailPage type="admit-card" />} />
                                    <Route path="/answer-key/:slug" element={<DetailPage type="answer-key" />} />
                                    <Route path="/admission/:slug" element={<DetailPage type="admission" />} />
                                    <Route path="/syllabus/:slug" element={<DetailPage type="syllabus" />} />

                                    {/* Explore & Trending */}
                                    <Route path="/explore" element={<ExplorePage />} />
                                    <Route path="/trending" element={<TrendingPage />} />

                                    {/* Protected: User pages */}
                                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                                    <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />

                                    {/* Robust legacy admin default + explicit rollback alias */}
                                    <Route path="/admin/*" element={<ProtectedRoute requireAdmin><AdminDesktopOnlyGate><AdminPage /></AdminDesktopOnlyGate></ProtectedRoute>} />
                                    <Route path="/admin-legacy/*" element={<ProtectedRoute requireAdmin><AdminDesktopOnlyGate><AdminPage /></AdminDesktopOnlyGate></ProtectedRoute>} />

                                    {/* Static pages */}
                                    <Route path="/about" element={<StaticPage type="about" />} />
                                    <Route path="/contact" element={<StaticPage type="contact" />} />
                                    <Route path="/privacy" element={<StaticPage type="privacy" />} />
                                    <Route path="/disclaimer" element={<StaticPage type="disclaimer" />} />
                                    <Route path="/advertise" element={<StaticPage type="advertise" />} />
                                    <Route path="/verify" element={<SubscriptionActionPage mode="verify" />} />
                                    <Route path="/unsubscribe" element={<SubscriptionActionPage mode="unsubscribe" />} />

                                    {ENABLE_E2E_ERROR_BOUNDARY_ROUTES ? (
                                        <>
                                            <Route path="/__e2e/error-boundary/ok" element={<E2EErrorBoundaryOkPage />} />
                                            <Route path="/__e2e/error-boundary/crash" element={<E2EErrorBoundaryCrashPage />} />
                                        </>
                                    ) : null}

                                    {/* 404 */}
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </Suspense>
                        </RouteAwareErrorBoundary>
                    </AuthProvider>
                </BrowserRouter>
            </LanguageProvider>
        </ThemeProvider>
    );
}
