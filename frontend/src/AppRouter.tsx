import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function SuspenseFallback() {
    return (
        <Layout>
            <SkeletonLoader />
        </Layout>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <ErrorBoundary>
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

                                    {/* 404 */}
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </Suspense>
                        </ErrorBoundary>
                    </AuthProvider>
                </BrowserRouter>
            </LanguageProvider>
        </ThemeProvider>
    );
}
