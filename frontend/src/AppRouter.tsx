import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { DetailPage } from './pages/DetailPage';
import { AdminPage } from './pages/AdminPage';
import { StaticPage } from './pages/StaticPages';
import { ProfilePage } from './pages/ProfilePage';
import { BookmarksPage } from './pages/BookmarksPage';
import { SubscriptionActionPage } from './pages/SubscriptionActionPage';
import { OnboardingModal } from './components/modals/OnboardingModal';
import './styles.css';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ThemeProvider>
                    <OnboardingModal />
                    <Routes>
                        {/* Home Page */}
                        <Route path="/" element={<HomePage />} />

                        {/* Category Pages with SEO-friendly URLs */}
                        <Route path="/jobs" element={<CategoryPage type="job" />} />
                        <Route path="/results" element={<CategoryPage type="result" />} />
                        <Route path="/admit-card" element={<CategoryPage type="admit-card" />} />
                        <Route path="/answer-key" element={<CategoryPage type="answer-key" />} />
                        <Route path="/admission" element={<CategoryPage type="admission" />} />
                        <Route path="/syllabus" element={<CategoryPage type="syllabus" />} />

                        {/* Detail Pages with SEO-friendly URLs */}
                        <Route path="/job/:slug" element={<DetailPage type="job" />} />
                        <Route path="/result/:slug" element={<DetailPage type="result" />} />
                        <Route path="/admit-card/:slug" element={<DetailPage type="admit-card" />} />
                        <Route path="/answer-key/:slug" element={<DetailPage type="answer-key" />} />
                        <Route path="/admission/:slug" element={<DetailPage type="admission" />} />
                        <Route path="/syllabus/:slug" element={<DetailPage type="syllabus" />} />

                        {/* Admin Page */}
                        <Route path="/admin" element={<AdminPage />} />

                        {/* Profile Page */}
                        <Route path="/profile" element={<ProfilePage />} />

                        {/* Bookmarks Page */}
                        <Route path="/bookmarks" element={<BookmarksPage />} />

                        {/* Subscription Actions */}
                        <Route path="/verify" element={<SubscriptionActionPage action="verify" />} />
                        <Route path="/unsubscribe" element={<SubscriptionActionPage action="unsubscribe" />} />

                        {/* Static Pages */}
                        <Route path="/about" element={<StaticPage type="about" />} />
                        <Route path="/contact" element={<StaticPage type="contact" />} />
                        <Route path="/privacy" element={<StaticPage type="privacy" />} />
                        <Route path="/disclaimer" element={<StaticPage type="disclaimer" />} />

                        {/* Fallback - redirect old ?item= URLs */}
                        <Route path="*" element={<HomePage />} />
                    </Routes>
                </ThemeProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
