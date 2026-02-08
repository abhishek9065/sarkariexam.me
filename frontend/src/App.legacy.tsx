import { useEffect, useState, useCallback } from 'react';
import './styles.css';
import type { Announcement, ContentType } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header, PWAInstallPrompt, SearchFilters, type FilterState } from './components';
import UPPoliceJobDetail from './pages/UPPoliceJobDetail';
import UniversalJobDetail from './pages/UniversalJobDetail';

const apiBase = import.meta.env.VITE_API_BASE ?? '';


import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';

// Page types
// Page types
type PageType = 'home' | 'admin' | 'about' | 'contact' | 'privacy' | 'disclaimer' | 'up-police-2026' | 'community';
type TabType = ContentType | 'bookmarks' | 'profile' | undefined;

// Navigation menu items
const navItems = [
  { label: 'Home', type: undefined as TabType },
  { label: 'Result', type: 'result' as TabType },
  { label: 'Jobs', type: 'job' as TabType },
  { label: 'Admit Card', type: 'admit-card' as TabType },
  { label: 'Admission', type: 'admission' as TabType },
  { label: 'Syllabus', type: 'syllabus' as TabType },
  { label: 'Answer Key', type: 'answer-key' as TabType },
  { label: '❤️ My Bookmarks', type: 'bookmarks' as TabType },
];

// ============ USER PROFILE ============

function UserProfile({
  bookmarks,
  onItemClick,
  user,
  logout
}: {
  bookmarks: Announcement[],
  onItemClick: (item: Announcement) => void,
  user: any,
  logout: () => void
}) {
  return (
    <div className="user-profile">
      <div className="profile-header card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '5px' }}>👤 My Profile</h2>
          <p style={{ color: '#666', margin: 0 }}>{user?.email}</p>
          <span className="type-badge" style={{ marginTop: '10px', display: 'inline-block' }}>{user?.role || 'User'}</span>
        </div>
        <button className="admin-btn logout" onClick={logout}>Logout</button>
      </div>

      <div className="profile-content">
        <SectionTable
          title="❤️ Saved Bookmarks"
          items={bookmarks}
          onItemClick={onItemClick}
          fullWidth
        />

        <div style={{ marginTop: '20px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>⚙️ Preferences</h3>
          <p style={{ color: '#666', fontStyle: 'italic' }}>Notification settings coming soon...</p>
        </div>
      </div>
    </div>
  );
}

// Featured exams
const featuredItems = [
  { title: 'UP Police 2026', subtitle: '32,679 Posts', color: 'blue', type: 'job' as ContentType, page: 'up-police-2026' as PageType },
  { title: 'SSC GD 2025', subtitle: 'Apply Now', color: 'purple', type: 'job' as ContentType },
  { title: 'Railway RRB', subtitle: 'Result Out', color: 'green', type: 'result' as ContentType },
  { title: 'UPSC CSE 2024', subtitle: 'Notification', color: 'red', type: 'job' as ContentType },
  { title: 'Bank PO/Clerk', subtitle: 'Admit Card', color: 'orange', type: 'admit-card' as ContentType },
];

// Content sections
const sections = [
  { title: 'Latest Result', type: 'result' as ContentType },
  { title: 'Admit Card', type: 'admit-card' as ContentType },
  { title: 'Latest Jobs', type: 'job' as ContentType },
  { title: 'Answer Key', type: 'answer-key' as ContentType },
  { title: 'Syllabus', type: 'syllabus' as ContentType },
  { title: 'Admission', type: 'admission' as ContentType },
];

// Notification Prompt Component
function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    setPermission(Notification.permission);

    // Show prompt if permission not decided and not dismissed recently
    const dismissed = localStorage.getItem('notification_prompt_dismissed');
    if (Notification.permission === 'default' && !dismissed) {
      // Delay the prompt a bit for better UX
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      setShowPrompt(false);

      if (perm === 'granted') {
        // Subscribe to push notifications
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID public key from backend
        const response = await fetch(`${apiBase}/api/push/vapid-public-key`);
        const { publicKey } = await response.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });

        // Send subscription to backend
        await fetch(`${apiBase}/api/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });

        console.log('Push subscription saved');
      }
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt || permission !== 'default') return null;

  return (
    <div className="notification-prompt">
      <div className="notification-prompt-content">
        <span className="notification-icon">🔔</span>
        <div className="notification-text">
          <strong>Enable Notifications</strong>
          <p>Get instant alerts for new jobs, results & admit cards!</p>
        </div>
        <div className="notification-buttons">
          <button onClick={handleDismiss} className="notification-btn dismiss">Later</button>
          <button onClick={handleAllow} className="notification-btn allow">Allow</button>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Announcement[]>([]);
  const { user, token, logout, isAuthenticated } = useAuth();

  // Advanced search states
  const [searchCategory, setSearchCategory] = useState('');
  const [searchType, setSearchType] = useState<ContentType | ''>('');
  const [searchOrganization, setSearchOrganization] = useState('');
  const [searchQualification, setSearchQualification] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'deadline'>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [, setInlineFilters] = useState<FilterState | null>(null);

  // Get applied filters count
  const appliedFiltersCount = [searchType, searchCategory, searchOrganization, searchQualification].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSearchType('');
    setSearchCategory('');
    setSearchOrganization('');
    setSearchQualification('');
    setSortOrder('newest');
  };

  // Fetch announcements with enhanced filters
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (searchType) params.set('type', searchType);
    if (searchCategory) params.set('category', searchCategory);
    if (searchOrganization) params.set('organization', searchOrganization);
    if (searchQualification) params.set('qualification', searchQualification);
    params.set('sort', sortOrder);

    setLoading(true);
    setError(null);

    fetch(`${apiBase}/api/announcements/v2?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const body = (await res.json()) as { data: Announcement[] };
        setData(body.data ?? []);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [searchQuery, searchType, searchCategory, searchOrganization, searchQualification, sortOrder]);

  // Fetch bookmarks when user is authenticated
  const fetchBookmarks = useCallback(async () => {
    if (!token) return;
    try {
      const [idsRes, bookmarksRes] = await Promise.all([
        fetch(`${apiBase}/api/bookmarks/ids`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/bookmarks`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (idsRes.ok && bookmarksRes.ok) {
        const idsData = await idsRes.json();
        const bookmarksData = await bookmarksRes.json();
        setBookmarkedIds(new Set(idsData.data));
        setBookmarks(bookmarksData.data);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks();
    } else {
      setBookmarkedIds(new Set());
      setBookmarks([]);
    }
  }, [isAuthenticated, fetchBookmarks]);

  // Toggle bookmark
  const toggleBookmark = async (announcementId: string) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const isBookmarked = bookmarkedIds.has(announcementId);

    try {
      if (isBookmarked) {
        await fetch(`${apiBase}/api/bookmarks/${announcementId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await fetch(`${apiBase}/api/bookmarks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ announcementId })
        });
      }
      fetchBookmarks();
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // Filter by type
  const getByType = (type: ContentType) => data.filter((item) => item.type === type);


  // ============ BROWSER HISTORY INTEGRATION ============
  // Navigation state interface for history
  interface NavState {
    activeTab?: TabType;
    selectedItemSlug?: string | null;
    currentPage: PageType;
  }

  // Push state to browser history
  const pushNavState = useCallback((state: NavState) => {
    const url = new URL(window.location.href);
    // Update URL based on state
    if (state.selectedItemSlug) {
      url.searchParams.set('item', state.selectedItemSlug);
      url.searchParams.delete('tab');
      url.searchParams.delete('page');
    } else if (state.activeTab) {
      url.searchParams.set('tab', state.activeTab);
      url.searchParams.delete('item');
      url.searchParams.delete('page');
    } else if (state.currentPage !== 'home') {
      url.searchParams.set('page', state.currentPage);
      url.searchParams.delete('tab');
      url.searchParams.delete('item');
    } else {
      url.searchParams.delete('tab');
      url.searchParams.delete('item');
      url.searchParams.delete('page');
    }
    window.history.pushState(state, '', url.toString());
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavState | null;
      if (state) {
        // Restore from history state
        setActiveTab(state.activeTab);
        setCurrentPage(state.currentPage || 'home');
        // Find item by slug if present
        if (state.selectedItemSlug) {
          const item = data.find(d => d.slug === state.selectedItemSlug);
          setSelectedItem(item || null);
        } else {
          setSelectedItem(null);
        }
      } else {
        // No state - go to home
        setActiveTab(undefined);
        setSelectedItem(null);
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [data]);

  // Initialize history state on first load
  useEffect(() => {
    const url = new URL(window.location.href);
    const tabParam = url.searchParams.get('tab') as TabType;
    const itemParam = url.searchParams.get('item');
    const pageParam = url.searchParams.get('page') as PageType;

    if (itemParam && data.length > 0) {
      const item = data.find(d => d.slug === itemParam);
      if (item) {
        setSelectedItem(item);
        setCurrentPage('home');
      }
    } else if (tabParam) {
      setActiveTab(tabParam);
      setCurrentPage('home');
    } else if (pageParam) {
      setCurrentPage(pageParam);
    }

    // Set initial state
    window.history.replaceState(
      { activeTab: tabParam, selectedItemSlug: itemParam, currentPage: pageParam || 'home' },
      '',
      window.location.href
    );
  }, [data]);

  // Handle item click - now with history
  const handleItemClick = (item: Announcement) => {
    // Special handling for UP Police 2026 page
    if (item.slug === 'up-police-constable-2026') {
      setCurrentPage('up-police-2026');
      pushNavState({ currentPage: 'up-police-2026' });
      return;
    }

    setSelectedItem(item);
    setCurrentPage('home');
    pushNavState({ selectedItemSlug: item.slug, currentPage: 'home' });
  };

  // Handle tab change - now with history
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedItem(null);
    setCurrentPage('home');
    pushNavState({ activeTab: tab, currentPage: 'home' });
  };

  // Go back to home - now with history
  const goBack = () => {
    setSelectedItem(null);
    setActiveTab(undefined);
    setCurrentPage('home');
    pushNavState({ currentPage: 'home' });
  };

  // Handle page change - now with history
  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    setSelectedItem(null);
    setActiveTab(undefined);
    pushNavState({ currentPage: page });
  };

  // Refresh data
  const refreshData = () => {
    setSearchQuery(searchQuery + ' ');
    setTimeout(() => setSearchQuery(searchQuery.trim()), 100);
  };



  // Render admin panel
  if (currentPage === 'admin') {
    return (
      <div className="app">
        <Header setCurrentPage={setCurrentPage} user={user} isAuthenticated={isAuthenticated} onLogin={() => setShowAuthModal(true)} onLogout={logout} onProfileClick={() => setActiveTab('profile')} />
        <Navigation
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          setShowSearch={setShowSearch}
          goBack={goBack}
          setCurrentPage={handlePageChange}
          isAuthenticated={isAuthenticated}
          onShowAuth={() => setShowAuthModal(true)}
          isAdmin={user?.role === 'admin'}
        />
        <AdminPanel
          isLoggedIn={isAdminLoggedIn}
          setIsLoggedIn={setIsAdminLoggedIn}
          announcements={data}
          refreshData={refreshData}
          goBack={goBack}
        />
        <Footer setCurrentPage={setCurrentPage} />
      </div>
    );
  }

  // Render other pages
  if (currentPage === 'about' || currentPage === 'contact' || currentPage === 'privacy' || currentPage === 'disclaimer' || currentPage === 'up-police-2026') {
    return (
      <div className="app">
        <Header setCurrentPage={setCurrentPage} user={user} isAuthenticated={isAuthenticated} onLogin={() => setShowAuthModal(true)} onLogout={logout} onProfileClick={() => setActiveTab('profile')} />
        <Navigation
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          setShowSearch={setShowSearch}
          goBack={goBack}
          setCurrentPage={handlePageChange}
          isAuthenticated={isAuthenticated}
          onShowAuth={() => setShowAuthModal(true)}
          isAdmin={user?.role === 'admin'}
        />
        {currentPage === 'up-police-2026' ? (
          <UPPoliceJobDetail />
        ) : (
          <StaticPage type={currentPage} goBack={goBack} />
        )}
        <Footer setCurrentPage={setCurrentPage} />
      </div>
    );
  }

  // Render detail page
  if (selectedItem) {
    return (
      <div className="app">
        <Header setCurrentPage={setCurrentPage} user={user} isAuthenticated={isAuthenticated} onLogin={() => setShowAuthModal(true)} onLogout={logout} onProfileClick={() => setActiveTab('profile')} />

        <Navigation
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          setShowSearch={setShowSearch}
          goBack={goBack}
          setCurrentPage={handlePageChange}
          isAuthenticated={isAuthenticated}
          onShowAuth={() => setShowAuthModal(true)}
          isAdmin={user?.role === 'admin'}
        />

        <div className="page-with-sidebar">
          <div className="detail-container">
            <div className="main-content">
              <button className="back-btn" onClick={() => setSelectedItem(null)}>
                ← Back to List
              </button>
              <UniversalJobDetail
                item={selectedItem}
                isBookmarked={bookmarkedIds.has(selectedItem.id)}
                onToggleBookmark={toggleBookmark}
                isAuthenticated={isAuthenticated}
                onLoginRequired={() => setShowAuthModal(true)}
              />
            </div>

            <aside className="sidebar">
              <TagsCloud />
              <SectionTable title="Latest Jobs" items={getByType('job').slice(0, 5)} onItemClick={handleItemClick} />
              <SectionTable title="Latest Result" items={getByType('result').slice(0, 5)} onItemClick={handleItemClick} />
            </aside>
          </div>

          <Footer setCurrentPage={setCurrentPage} />
        </div>
      </div>
    );
  }

  // Render homepage
  return (
    <div className="app">
      <NotificationPrompt />
      <Header setCurrentPage={setCurrentPage} user={user} isAuthenticated={isAuthenticated} onLogin={() => setShowAuthModal(true)} onLogout={logout} onProfileClick={() => setActiveTab('profile')} />
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        setShowSearch={setShowSearch}
        goBack={goBack}
        setCurrentPage={handlePageChange}
        isAuthenticated={isAuthenticated}
        onShowAuth={() => setShowAuthModal(true)}
        isAdmin={user?.role === 'admin'}
      />

      <Marquee />
      <SocialButtons />

      {/* Search Modal */}
      {showSearch && (
        <div className="search-overlay" onClick={() => setShowSearch(false)}>
          <div className="search-modal advanced-search" onClick={(e) => e.stopPropagation()}>
            <div className="search-header">
              <h3>🔍 Advanced Search</h3>
              <button className="close-btn" onClick={() => setShowSearch(false)}>×</button>
            </div>

            <div className="search-input-wrapper" style={{ position: 'relative' }}>
              <input
                type="text"
                className="search-main-input"
                placeholder="Search jobs, results, admit cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {/* Autocomplete suggestions */}
              {searchQuery.length > 2 && (
                <div className="autocomplete-dropdown" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '0 0 8px 8px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  zIndex: 100,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  {data
                    .filter(item =>
                      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.organization.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          handleItemClick(item);
                          setShowSearch(false);
                        }}
                        style={{
                          padding: '10px 15px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        <strong>{item.title.substring(0, 50)}...</strong>
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>{item.organization}</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Quick Filters Row */}
            <div className="search-filters-row">
              <select value={searchType} onChange={(e) => setSearchType(e.target.value as ContentType | '')}>
                <option value="">📄 All Types</option>
                <option value="job">💼 Jobs</option>
                <option value="result">📊 Results</option>
                <option value="admit-card">🎫 Admit Card</option>
                <option value="answer-key">🔑 Answer Key</option>
                <option value="admission">🎓 Admission</option>
                <option value="syllabus">📚 Syllabus</option>
              </select>
              <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)}>
                <option value="">🏛️ All Categories</option>
                <option value="SSC">SSC</option>
                <option value="UPSC">UPSC</option>
                <option value="Railway">Railway</option>
                <option value="Banking">Banking</option>
                <option value="Defence">Defence</option>
                <option value="State PSC">State PSC</option>
                <option value="Teaching">Teaching</option>
                <option value="Police">Police</option>
                <option value="University">University</option>
                <option value="PSU">PSU</option>
              </select>
            </div>

            {/* Toggle Advanced Filters */}
            <button
              className="toggle-advanced-btn"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? '▲ Hide Advanced Filters' : '▼ Show Advanced Filters'}
              {appliedFiltersCount > 0 && <span className="filter-badge">{appliedFiltersCount}</span>}
            </button>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="advanced-filters-panel">
                <div className="filter-group">
                  <label>🏢 Organization</label>
                  <input
                    type="text"
                    placeholder="e.g., SSC, UPSC, Railway..."
                    value={searchOrganization}
                    onChange={(e) => setSearchOrganization(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>📜 Qualification</label>
                  <select value={searchQualification} onChange={(e) => setSearchQualification(e.target.value)}>
                    <option value="">All Qualifications</option>
                    <option value="10th">10th Pass</option>
                    <option value="12th">12th Pass</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="ITI">ITI</option>
                    <option value="B.Tech">B.Tech / Engineering</option>
                    <option value="MBA">MBA</option>
                    <option value="MBBS">MBBS / Medical</option>
                    <option value="LLB">LLB / Law</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>📋 Sort By</label>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'deadline')}>
                    <option value="newest">📅 Newest First</option>
                    <option value="oldest">📅 Oldest First</option>
                    <option value="deadline">⏰ Deadline Soon</option>
                  </select>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="search-actions">
              {appliedFiltersCount > 0 && (
                <button className="clear-filters-btn" onClick={clearFilters}>
                  ❌ Clear All Filters ({appliedFiltersCount})
                </button>
              )}
              <button className="search-submit-btn" onClick={() => setShowSearch(false)}>
                🔍 Search
              </button>
            </div>

            {/* Active Filters Tags */}
            {appliedFiltersCount > 0 && (
              <div className="active-filters">
                {searchType && <span className="filter-tag">Type: {searchType} <button onClick={() => setSearchType('')}>×</button></span>}
                {searchCategory && <span className="filter-tag">Category: {searchCategory} <button onClick={() => setSearchCategory('')}>×</button></span>}
                {searchOrganization && <span className="filter-tag">Org: {searchOrganization} <button onClick={() => setSearchOrganization('')}>×</button></span>}
                {searchQualification && <span className="filter-tag">Qualification: {searchQualification} <button onClick={() => setSearchQualification('')}>×</button></span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured Boxes */}
      <section className="featured-section">
        <div className="featured-grid">
          {featuredItems.map((item, idx) => (
            <div
              key={idx}
              className={`featured-box ${item.color}`}
              onClick={() => {
                if ('page' in item && item.page) {
                  setCurrentPage(item.page as PageType);
                } else {
                  handleTabChange(item.type);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="featured-title">
                {item.title}
                {item.title.includes('UP Police') && <span className="new-badge">New</span>}
              </div>
              <div className="featured-subtitle">{item.subtitle}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Inline Search Filters - Always Visible */}
      <section className="inline-search-section" style={{ padding: '0 16px', margin: '20px auto', maxWidth: '1200px' }}>
        <SearchFilters
          onFilterChange={setInlineFilters}
          showTypeFilter={true}
        />
      </section>

      {/* Main Content */}

      <main className="main-content">
        <TagsCloud />
        {error && <div className="error-message">{error}</div>}
        {loading && <SkeletonLoader />}

        {!loading && !error && (
          <>
            {activeTab === 'profile' ? (
              <UserProfile
                bookmarks={bookmarks}
                onItemClick={handleItemClick}
                user={user}
                logout={logout}
              />
            ) : activeTab === 'bookmarks' ? (
              <div className="content-grid" style={{ gridTemplateColumns: '1fr' }}>
                {isAuthenticated ? (
                  <SectionTable
                    title="❤️ My Bookmarks"
                    items={bookmarks}
                    onItemClick={handleItemClick}
                    fullWidth
                  />
                ) : (
                  <div className="auth-prompt" style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Please login to view your bookmarks</p>
                    <button onClick={() => setShowAuthModal(true)} style={{ marginTop: '15px', padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Login</button>
                  </div>
                )}
              </div>
            ) : activeTab ? (
              <div className="content-grid" style={{ gridTemplateColumns: '1fr' }}>
                <SectionTable
                  title={navItems.find((n) => n.type === activeTab)?.label || 'Results'}
                  items={getByType(activeTab as ContentType)}
                  onItemClick={handleItemClick}
                  fullWidth
                />
              </div>
            ) : (
              <>
                <div className="content-grid">
                  {sections.slice(0, 3).map((section) => (
                    <SectionTable
                      key={section.type}
                      title={section.title}
                      items={getByType(section.type)}
                      onViewMore={() => handleTabChange(section.type)}
                      onItemClick={handleItemClick}
                    />
                  ))}
                </div>
                <div className="content-grid">
                  {sections.slice(3, 6).map((section) => (
                    <SectionTable
                      key={section.type}
                      title={section.title}
                      items={getByType(section.type)}
                      onViewMore={() => handleTabChange(section.type)}
                      onItemClick={handleItemClick}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <Footer setCurrentPage={setCurrentPage} />

      {/* Auth Modal */}
      <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

// ============ COMPONENTS ============

// Header component removed (using imported version)


interface AuthModalProps {
  show: boolean;
  onClose: () => void;
}

function AuthModal({ show, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (formData.name.length < 2) {
          throw new Error('Name must be at least 2 characters');
        }
        await register(formData.name, formData.email, formData.password);
      }
      onClose();
      setFormData({ name: '', email: '', password: '' });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>×</button>

        <h2 className="auth-title">{isLogin ? '🔐 Login' : '📝 Register'}</h2>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(null); }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(null); }}
          >
            Register
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="auth-input"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
            className="auth-input"
          />
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
}

interface NavProps {
  activeTab: TabType;
  setActiveTab: (type: TabType) => void;
  setShowSearch: (show: boolean) => void;
  goBack: () => void;
  setCurrentPage: (page: PageType) => void;
  isAuthenticated: boolean;
  onShowAuth: () => void;
  isAdmin?: boolean;
}

function Navigation({ activeTab, setActiveTab, setShowSearch, goBack, setCurrentPage, isAuthenticated, onShowAuth, isAdmin }: NavProps) {
  return (
    <nav className="main-nav">
      <div className="nav-container">
        {navItems.map((item) => {
          // Hide bookmarks tab for non-authenticated users
          if (item.type === 'bookmarks' && !isAuthenticated) return null;
          return (
            <button
              key={item.label}
              className={`nav-link ${activeTab === item.type && (item.type || !activeTab) ? 'active' : (!activeTab && !item.type ? 'active' : '')}`}
              onClick={() => {

                if (item.type === 'bookmarks' && !isAuthenticated) {
                  onShowAuth();
                  return;
                }
                // handleTabChange already sets currentPage to 'home'
                // DO NOT call setCurrentPage here - it goes through handlePageChange 
                // which resets activeTab to undefined!
                setActiveTab(item.type);
                if (!item.type) goBack();
              }}
            >
              {item.label}
            </button>
          );
        })}
        <span className="nav-search" onClick={() => setShowSearch(true)}>🔍</span>
        {isAdmin && (
          <button className="nav-link admin-link" onClick={() => setCurrentPage('admin')}>⚙️ Admin</button>
        )}
      </div>
    </nav>
  );
}

function Marquee() {
  return (
    <div className="marquee-container">
      <span className="live-badge">🔴 LIVE</span>
      <div className="marquee-track">
        <div className="marquee-content">
          <span className="marquee-item">✨ Welcome to SarkariExams.me - Your #1 Source for Government Jobs!</span>
          <span className="marquee-item">🔥 SSC GD Constable 2025 Notification Released - Apply Now</span>
          <span className="marquee-item">📢 UPSC CSE 2024 Final Result Declared - Check Result</span>
          <span className="marquee-item">⚡ Railway RRB NTPC Result 2024 - Download Scorecard</span>
          <span className="marquee-item">🎯 Bank PO/Clerk Admit Cards Available - Download Now</span>
        </div>
      </div>
    </div>
  );
}

function SocialButtons() {
  return (
    <div className="social-buttons">
      <a href="#" className="social-btn whatsapp-btn">📱 Join WhatsApp Channel</a>
      <a href="#" className="social-btn telegram-btn">✈️ Join Telegram Channel</a>
    </div>
  );
}

function SkeletonLoader() {
  const SkeletonCard = () => (
    <div className="skeleton-card">
      <div className="skeleton-header"></div>
      <div className="skeleton-content">
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line"></div>
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-button"></div>
      </div>
    </div>
  );

  return (
    <>
      <div className="skeleton-grid">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="skeleton-grid">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </>
  );
}

interface SectionTableProps {
  title: string;
  items: Announcement[];
  onViewMore?: () => void;
  onItemClick: (item: Announcement) => void;
  fullWidth?: boolean;
}

function SectionTable({ title, items, onViewMore, onItemClick, fullWidth }: SectionTableProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="section-table" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <div className="section-table-header">{title}</div>
      <div className="section-table-content">
        <ul>
          {items.length > 0 ? (
            items.slice(0, 10).map((item) => (
              <li key={item.id}>
                <a href="#" onClick={(e) => { e.preventDefault(); onItemClick(item); }}>
                  {item.title}
                  {item.totalPosts && ` [${item.totalPosts} Post]`}
                  {item.deadline && ` - Last: ${formatDate(item.deadline)}`}
                </a>
              </li>
            ))
          ) : (
            <li>No {title.toLowerCase()} available at the moment.</li>
          )}
        </ul>
      </div>
      {onViewMore && (
        <div className="section-table-footer">
          <button className="view-more-btn" onClick={onViewMore}>View More</button>
        </div>
      )}
    </div>
  );
}


// ============ TAGS CLOUD ============

function TagsCloud() {
  const [tags, setTags] = useState<{ name: string, count: number }[]>([]);

  useEffect(() => {
    fetch(`${apiBase}/api/announcements/meta/tags`)
      .then(res => res.json())
      .then(data => setTags(data.data || []))
      .catch(console.error);
  }, []);

  if (tags.length === 0) return null;

  return (
    <div className="tags-cloud-section" style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#333', borderBottom: '2px solid #e74c3c', paddingBottom: '5px', display: 'inline-block' }}>🏷️ Browse by Tags</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {tags.map(tag => (
          <span
            key={tag.name}
            className="tag-chip"
            style={{
              background: '#f0f2f5',
              padding: '5px 10px',
              borderRadius: '15px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: '#555',
              border: '1px solid #ddd'
            }}
            onClick={() => {
              // Simple search by tag
              const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (searchInput) {
                searchInput.value = tag.name;
                // Trigger change event if possible, or just focus
                searchInput.focus();
              }
              // Ideally update a context or URL param provided by App
              // For now, prompt user this filters by search
              alert(`Searching for tag: ${tag.name}`);
              window.location.href = `/?search=${encodeURIComponent(tag.name)}`;
            }}
          >
            {tag.name} <small style={{ color: '#888' }}>({tag.count})</small>
          </span>
        ))}
      </div>
    </div>
  );
}

// ============ ADMIN PANEL ============

interface AdminPanelProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (val: boolean) => void;
  announcements: Announcement[];
  refreshData: () => void;
  goBack: () => void;
}

function AdminPanel({ isLoggedIn, setIsLoggedIn, announcements, refreshData, goBack }: AdminPanelProps) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [activeAdminTab, setActiveAdminTab] = useState<'analytics' | 'list' | 'add' | 'bulk'>('analytics');
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
  const [formData, setFormData] = useState({
    title: '',
    type: 'job' as ContentType,
    category: 'Central Government',
    organization: '',
    externalLink: '',
    location: 'All India',
    deadline: '',
    totalPosts: '',
    minQualification: '',
    ageLimit: '',
    applicationFee: '',
  });
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkJson, setBulkJson] = useState('');

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    if (!adminToken) return;

    try {
      const response = await fetch(`${apiBase}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (response.ok) {
        setMessage('Deleted successfully');
        refreshData();
      } else {
        setMessage('Failed to delete');
      }
    } catch (error) {
      console.error(error);
      setMessage('Error deleting announcement');
    }
  };

  const handleEdit = (item: Announcement) => {
    setFormData({
      title: item.title,
      type: item.type,
      category: item.category,
      organization: item.organization,
      externalLink: item.externalLink || '',
      location: item.location || '',
      deadline: item.deadline ? item.deadline.split('T')[0] : '', // Format date for input
      totalPosts: item.totalPosts ? item.totalPosts.toString() : '',
      minQualification: item.minQualification || '',
      ageLimit: item.ageLimit || '',
      applicationFee: item.applicationFee || '',
    });
    setEditingId(item.id);
    setActiveAdminTab('add');
    setMessage(`Editing: ${item.title}`);
  };

  // Handle login - call real auth API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Logging in...');
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      if (response.ok) {
        const result = await response.json();
        // API returns {data: {user, token} }
        const userData = result.data?.user || result.user;
        const authToken = result.data?.token || result.token;

        if (userData?.role === 'admin') {
          setAdminToken(authToken);
          localStorage.setItem('adminToken', authToken);
          setIsLoggedIn(true);
          setMessage('Login successful!');
        } else {
          setMessage('Access denied. Admin role required.');
        }
      } else {
        const errorResult = await response.json();
        const errorMsg = typeof errorResult.error === 'string'
          ? errorResult.error
          : 'Invalid credentials.';
        setMessage(errorMsg);
      }
    } catch (error) {
      console.error(error);
      setMessage('Login failed. Check your connection.');
    }
  };

  // Handle form submit (create or update announcement)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Processing...');

    if (!adminToken) {
      setMessage('Not authenticated. Please log in again.');
      setIsLoggedIn(false);
      return;
    }

    try {
      const url = editingId
        ? `${apiBase}/api/announcements/${editingId}`
        : `${apiBase}/api/announcements`;

      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...formData,
          totalPosts: formData.totalPosts ? parseInt(formData.totalPosts) : undefined,
        }),
      });

      if (response.ok) {
        setMessage(editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!');
        setFormData({
          title: '', type: 'job', category: 'Central Government', organization: '',
          externalLink: '', location: 'All India', deadline: '', totalPosts: '',
          minQualification: '', ageLimit: '', applicationFee: '',
        });
        setEditingId(null);
        refreshData();
        setActiveAdminTab('list');
      } else {
        setMessage('Failed to save. Note: Admin API requires authentication.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Error saving announcement.');
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="main-content">
        <div className="admin-container">
          <div className="admin-login-box">
            <h2>🔐 Admin Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="admin@sarkari.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              {message && <p className="form-message">{message}</p>}
              <button type="submit" className="admin-btn primary">Login</button>
              <button type="button" className="admin-btn secondary" onClick={goBack}>Back to Home</button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="admin-container">
        <div className="admin-header">
          <h2>⚙️ Admin Dashboard</h2>
          <div className="admin-tabs">
            <button className={activeAdminTab === 'analytics' ? 'active' : ''} onClick={() => setActiveAdminTab('analytics')}>
              📊 Analytics
            </button>
            <button className={activeAdminTab === 'list' ? 'active' : ''} onClick={() => setActiveAdminTab('list')}>
              📋 All Announcements
            </button>
            <button className={activeAdminTab === 'add' ? 'active' : ''} onClick={() => setActiveAdminTab('add')}>
              ➕ Add New
            </button>
            <button className={activeAdminTab === 'bulk' ? 'active' : ''} onClick={() => setActiveAdminTab('bulk')}>
              📥 Bulk Import
            </button>
          </div>
          <button className="admin-btn logout" onClick={() => setIsLoggedIn(false)}>Logout</button>
        </div>

        {message && <p className="form-message">{message}</p>}

        {activeAdminTab === 'analytics' ? (
          <AnalyticsDashboard adminToken={adminToken} />
        ) : activeAdminTab === 'list' ? (
          <div className="admin-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Organization</th>
                  <th>Posts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.slice(0, 20).map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title.substring(0, 40)}...</td>
                    <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                    <td>{item.organization}</td>
                    <td>{item.totalPosts || '-'}</td>
                    <td>
                      <button className="action-btn edit" onClick={() => handleEdit(item)}>Edit</button>
                      <button className="action-btn delete" onClick={() => handleDelete(item.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeAdminTab === 'bulk' ? (
          <div className="admin-form-container">
            <h3>📥 Bulk Import Announcements</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>Paste JSON array of announcements below. Required fields: title, type, category, organization.</p>
            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`{
  "announcements": [
    {
      "title": "SSC CGL 2025",
      "type": "job",
      "category": "Central Government",
      "organization": "SSC",
      "totalPosts": 5000
    }
  ]
}`}
              style={{
                width: '100%',
                height: '300px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
            />
            <button
              className="admin-btn primary"
              onClick={async () => {
                if (!adminToken) {
                  setMessage('Not authenticated');
                  return;
                }
                try {
                  const jsonData = JSON.parse(bulkJson);
                  const response = await fetch(`${apiBase}/api/bulk/import`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify(jsonData),
                  });
                  const result = await response.json();
                  setMessage(result.message || 'Import complete');
                  if (response.ok) {
                    refreshData();
                    setBulkJson('');
                  }
                } catch (err: any) {
                  setMessage('Invalid JSON: ' + err.message);
                }
              }}
            >
              🚀 Import Announcements
            </button>
          </div>
        ) : (
          <div className="admin-form-container">
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. SSC CGL 2025 Recruitment"
                    required
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-group">
                  <label>Type *</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentType })}>
                    <option value="job">Job</option>
                    <option value="result">Result</option>
                    <option value="admit-card">Admit Card</option>
                    <option value="answer-key">Answer Key</option>
                    <option value="admission">Admission</option>
                    <option value="syllabus">Syllabus</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="Central Government">Central Government</option>
                    <option value="State Government">State Government</option>
                    <option value="Banking">Banking</option>
                    <option value="Railways">Railways</option>
                    <option value="Defence">Defence</option>
                    <option value="PSU">PSU</option>
                    <option value="University">University</option>
                  </select>
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-group">
                  <label>Organization *</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g. Staff Selection Commission"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. All India"
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-group">
                  <label>Total Posts</label>
                  <input
                    type="number"
                    value={formData.totalPosts}
                    onChange={(e) => setFormData({ ...formData, totalPosts: e.target.value })}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="form-group">
                  <label>Last Date</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-group">
                  <label>Qualification</label>
                  <input
                    type="text"
                    value={formData.minQualification}
                    onChange={(e) => setFormData({ ...formData, minQualification: e.target.value })}
                    placeholder="e.g. Graduate"
                  />
                </div>
                <div className="form-group">
                  <label>Age Limit</label>
                  <input
                    type="text"
                    value={formData.ageLimit}
                    onChange={(e) => setFormData({ ...formData, ageLimit: e.target.value })}
                    placeholder="e.g. 18-27 years"
                  />
                </div>
              </div>

              <div className="form-row two-col">
                <div className="form-group">
                  <label>Application Fee</label>
                  <input
                    type="text"
                    value={formData.applicationFee}
                    onChange={(e) => setFormData({ ...formData, applicationFee: e.target.value })}
                    placeholder="e.g. ₹100"
                  />
                </div>
                <div className="form-group">
                  <label>External Link</label>
                  <input
                    type="url"
                    value={formData.externalLink}
                    onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="admin-btn primary">Create Announcement</button>
                <button type="button" className="admin-btn secondary" onClick={() => setActiveAdminTab('list')}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

// ============ STATIC PAGES ============

interface StaticPageProps {
  type: 'about' | 'contact' | 'privacy' | 'disclaimer';
  goBack: () => void;
}

function StaticPage({ type, goBack }: StaticPageProps) {
  const pages = {
    about: {
      title: 'About Us',
      content: `
                  <h3>Welcome to SarkariExams.me</h3>
                  <p>SarkariExams.me is India's leading platform for government job notifications, exam results, admit cards, and application forms.</p>

                  <h4>Our Mission</h4>
                  <p>To provide accurate, timely, and comprehensive information about government employment opportunities to millions of job seekers across India.</p>

                  <h4>What We Offer</h4>
                  <ul>
                    <li>Latest Government Job Notifications</li>
                    <li>Exam Results & Answer Keys</li>
                    <li>Admit Card Downloads</li>
                    <li>Admission Updates</li>
                    <li>Syllabus & Exam Patterns</li>
                  </ul>

                  <h4>Why Choose Us</h4>
                  <ul>
                    <li>✅ 100% Verified Information</li>
                    <li>✅ Real-time Updates</li>
                    <li>✅ User-friendly Interface</li>
                    <li>✅ No Registration Required</li>
                    <li>✅ Free to Use</li>
                  </ul>
                  `
    },
    contact: {
      title: 'Contact Us',
      content: `
                  <h3>Get in Touch</h3>
                  <p>We'd love to hear from you! For any queries, suggestions, or feedback, please reach out to us.</p>

                  <div class="contact-info">
                    <p><strong>📧 Email:</strong> contact@sarkariresult.com</p>
                    <p><strong>📱 WhatsApp:</strong> +91-XXXXXXXXXX</p>
                    <p><strong>📍 Address:</strong> New Delhi, India</p>
                  </div>

                  <h4>Follow Us</h4>
                  <p>
                    <a href="#">Telegram</a> |
                    <a href="#">WhatsApp</a> |
                    <a href="#">Facebook</a> |
                    <a href="#">Twitter</a>
                  </p>

                  <h4>Feedback Form</h4>
                  <p>For detailed queries or job posting requests, please email us with your complete details.</p>
                  `
    },
    privacy: {
      title: 'Privacy Policy',
      content: `
                  <h3>Privacy Policy</h3>
                  <p><strong>Last Updated:</strong> December 2024</p>

                  <h4>Information We Collect</h4>
                  <p>We may collect the following types of information:</p>
                  <ul>
                    <li>Browser type and version</li>
                    <li>Pages visited and time spent</li>
                    <li>Referring website</li>
                    <li>IP address (anonymized)</li>
                  </ul>

                  <h4>How We Use Information</h4>
                  <ul>
                    <li>Improve website functionality</li>
                    <li>Analyze traffic patterns</li>
                    <li>Provide relevant content</li>
                  </ul>

                  <h4>Cookies</h4>
                  <p>We use cookies to enhance user experience. You can disable cookies in your browser settings.</p>

                  <h4>Third-party Services</h4>
                  <p>We may use third-party services like Google Analytics and advertising networks.</p>

                  <h4>Contact</h4>
                  <p>For privacy concerns, email us at privacy@sarkariresult.com</p>
                  `
    },
    disclaimer: {
      title: 'Disclaimer',
      content: `
                  <h3>Disclaimer</h3>

                  <h4>Information Accuracy</h4>
                  <p>While we strive to provide accurate and up-to-date information, we make no warranties about the completeness, reliability, or accuracy of the information on this website.</p>

                  <h4>Official Sources</h4>
                  <p>All information is collected from official government websites and notifications. Users are advised to verify information from official sources before taking any action.</p>

                  <h4>External Links</h4>
                  <p>This website contains links to external websites. We are not responsible for the content or privacy practices of these sites.</p>

                  <h4>No Guarantee</h4>
                  <p>We do not guarantee any job offers, results, or admission. The final authority rests with the respective recruiting organizations.</p>

                  <h4>Liability</h4>
                  <p>We shall not be held liable for any loss or damage arising from the use of information on this website.</p>

                  <h4>Updates</h4>
                  <p>This disclaimer may be updated from time to time. Please check regularly for updates.</p>
                  `
    }
  };

  const page = pages[type];

  return (
    <main className="main-content">
      <div className="static-page">
        <button className="back-btn" onClick={goBack}>← Back to Home</button>
        <h1 className="page-title">{page.title}</h1>
        <div className="static-content" dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
    </main>
  );
}

// ============ FOOTER ============

interface FooterProps {
  setCurrentPage: (page: PageType) => void;
}

function SubscribeBox() {
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const categoryOptions = [
    { value: 'job', label: 'Jobs' },
    { value: 'result', label: 'Results' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'answer-key', label: 'Answer Keys' },
    { value: 'admission', label: 'Admissions' },
    { value: 'syllabus', label: 'Syllabus' },
  ];

  const handleCategoryToggle = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${apiBase}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, categories }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        // Handle different success messages from backend
        if (result.data?.verified) {
          setMessage('✅ Subscribed successfully! You will receive notifications.');
        } else {
          setMessage(result.message || '✅ Subscription created! Check your email to verify.');
        }
        setEmail('');
        setCategories([]);
      } else {
        setStatus('error');
        setMessage(result.error || 'Subscription failed. Try again.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('error');
        setMessage('Request timed out. Please try again.');
      } else {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="subscribe-box">
      <h3>📧 Get Email Notifications</h3>
      <p>Subscribe to receive the latest job alerts directly in your inbox!</p>

      <form onSubmit={handleSubscribe} className="subscribe-form">
        <div className="subscribe-categories">
          {categoryOptions.map(cat => (
            <label key={cat.value} className="category-checkbox">
              <input
                type="checkbox"
                checked={categories.includes(cat.value)}
                onChange={() => handleCategoryToggle(cat.value)}
              />
              {cat.label}
            </label>
          ))}
          <span className="category-hint">(Leave empty for all)</span>
        </div>

        <div className="subscribe-input-row">
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            required
          />
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending...' : '🔔 Subscribe'}
          </button>
        </div>

        {message && (
          <p className={`subscribe-message ${status}`}>{message}</p>
        )}
      </form>
    </div>
  );
}

function Footer({ setCurrentPage }: FooterProps) {
  return (
    <>
      <SubscribeBox />
      <footer className="site-footer">
        <p className="footer-text">© 2024 SarkariExams.me | All Rights Reserved</p>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }}>About Us</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('contact'); }}>Contact</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('privacy'); }}>Privacy Policy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('disclaimer'); }}>Disclaimer</a>
        </div>
      </footer>
    </>
  );
}

function AppWrapper() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <App />
        <PWAInstallPrompt />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppWrapper;
