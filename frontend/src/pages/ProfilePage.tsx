import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header, Navigation, Footer, SkeletonLoader } from '../components';
import { API_BASE } from '../utils';
import type { TabType } from '../utils/constants';
import type { Announcement, ContentType } from '../types';
import './ProfilePage.css';

interface UserProfile {
    id: string;
    userId: string;
    preferredCategories: string[];
    preferredQualifications: string[];
    preferredLocations: string[];
    preferredOrganizations: string[];
    ageGroup: string | null;
    educationLevel: string | null;
    experienceYears: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: NotificationFrequency;
    profileComplete: boolean;
    onboardingCompleted: boolean;
}

interface ProfileOptions {
    categories: string[];
    qualifications: string[];
    ageGroups: string[];
    educationLevels: string[];
    notificationFrequencies: NotificationFrequency[];
    locations: string[];
    organizations: string[];
}

interface Recommendation extends Announcement {
    matchScore: number;
    matchReasons: Record<string, number>;
}


type NotificationFrequency = 'instant' | 'daily' | 'weekly';

interface SavedSearchFilters {
    type?: ContentType;
    category?: string;
    organization?: string;
    location?: string;
    qualification?: string;
}

interface SavedSearch {
    id: string;
    name: string;
    query: string;
    filters?: SavedSearchFilters;
    notificationsEnabled: boolean;
    frequency: NotificationFrequency;
    createdAt?: string;
    updatedAt?: string;
    lastNotifiedAt?: string | null;
}

interface AlertsPayload {
    windowDays: number;
    since: string;
    savedSearches: Array<SavedSearch & { matches: Announcement[]; totalMatches: number }>;
    preferences: { matches: Recommendation[]; totalMatches: number };
}

interface DigestPreview {
    windowDays: number;
    since: string;
    generatedAt: string;
    totalMatches: number;
    breakdown: {
        savedSearchMatches: number;
        preferenceMatches: number;
    };
    preview: Announcement[];
}

type SavedSearchFormState = {
    name: string;
    query: string;
    type: ContentType | '';
    category: string;
    organization: string;
    location: string;
    qualification: string;
    notificationsEnabled: boolean;
    frequency: NotificationFrequency;
};

const DEFAULT_SAVED_SEARCH: SavedSearchFormState = {
    name: '',
    query: '',
    type: '',
    category: '',
    organization: '',
    location: '',
    qualification: '',
    notificationsEnabled: true,
    frequency: 'daily',
};

const SEARCH_TYPES: Array<{ value: ContentType | ''; label: string }> = [
    { value: '', label: 'All types' },
    { value: 'job', label: 'Jobs' },
    { value: 'result', label: 'Results' },
    { value: 'admit-card', label: 'Admit cards' },
    { value: 'answer-key', label: 'Answer keys' },
    { value: 'admission', label: 'Admissions' },
    { value: 'syllabus', label: 'Syllabus' },
];

export function ProfilePage() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [options, setOptions] = useState<ProfileOptions | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'preferences' | 'notifications' | 'recommendations' | 'saved' | 'alerts'>('preferences');
    const [savedSearchForm, setSavedSearchForm] = useState<SavedSearchFormState>({ ...DEFAULT_SAVED_SEARCH });
    const [savedSearchEditingId, setSavedSearchEditingId] = useState<string | null>(null);
    const [savedSearchError, setSavedSearchError] = useState<string | null>(null);
    const [savedSearchSaving, setSavedSearchSaving] = useState(false);
    const [savedSearchesLoading, setSavedSearchesLoading] = useState(false);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [digestLoading, setDigestLoading] = useState(false);
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [alerts, setAlerts] = useState<AlertsPayload | null>(null);
    const [digestPreview, setDigestPreview] = useState<DigestPreview | null>(null);
    const [alertWindowDays, setAlertWindowDays] = useState(7);
    const [alertLimit, setAlertLimit] = useState(6);

    const resetSavedSearchForm = () => {
        setSavedSearchForm({ ...DEFAULT_SAVED_SEARCH });
        setSavedSearchEditingId(null);
        setSavedSearchError(null);
    };

    const formatDate = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (value?: string) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const fetchSavedSearches = async () => {
        if (!token) return;
        setSavedSearchesLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/profile/saved-searches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { data } = await res.json();
                setSavedSearches(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch saved searches:', error);
        } finally {
            setSavedSearchesLoading(false);
        }
    };

    const fetchAlerts = async (windowDays = alertWindowDays, limit = alertLimit) => {
        if (!token) return;
        setAlertsLoading(true);
        try {
            const params = new URLSearchParams({
                windowDays: String(windowDays),
                limit: String(limit),
            });
            const res = await fetch(`${API_BASE}/api/profile/alerts?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { data } = await res.json();
                setAlerts(data);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setAlertsLoading(false);
        }
    };

    const fetchDigestPreview = async (windowDays = alertWindowDays, limit = alertLimit) => {
        if (!token) return;
        setDigestLoading(true);
        try {
            const params = new URLSearchParams({
                windowDays: String(windowDays),
                limit: String(limit),
            });
            const res = await fetch(`${API_BASE}/api/profile/digest-preview?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { data } = await res.json();
                setDigestPreview(data);
            }
        } catch (error) {
            console.error('Failed to fetch digest preview:', error);
        } finally {
            setDigestLoading(false);
        }
    };

    // Fetch profile, options, and recommendations
    useEffect(() => {
        if (!isAuthenticated || !token) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                const [profileRes, optionsRes, recsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    fetch(`${API_BASE}/api/profile/options`),
                    fetch(`${API_BASE}/api/profile/recommendations?limit=10`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (profileRes.ok) {
                    const { data } = await profileRes.json();
                    setProfile(data);
                }

                if (optionsRes.ok) {
                    const { data } = await optionsRes.json();
                    setOptions(data);
                }

                if (recsRes.ok) {
                    const { data } = await recsRes.json();
                    setRecommendations(data);
                }
            } catch (error) {
                console.error('Failed to fetch profile data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated, token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchSavedSearches();
    }, [token]);

    useEffect(() => {
        if (!token) return;
        if (activeSection === 'saved') {
            fetchSavedSearches();
        }
    }, [activeSection, token]);

    useEffect(() => {
        if (!token) return;
        if (activeSection === 'alerts') {
            fetchAlerts(alertWindowDays, alertLimit);
            fetchDigestPreview(alertWindowDays, alertLimit);
        }
    }, [activeSection, token]);

    // Update profile
    const saveProfile = async (updates: Partial<UserProfile>) => {
        if (!token) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                const { data } = await res.json();
                setProfile(data);
            }
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setSaving(false);
        }
    };

    // Toggle array preference
    const togglePreference = (key: 'preferredCategories' | 'preferredQualifications' | 'preferredLocations', value: string) => {
        if (!profile) return;

        const current = profile[key] || [];
        const updated = current.includes(value)
            ? current.filter((v: string) => v !== value)
            : [...current, value];

        saveProfile({ [key]: updated });
    };

    const handleSavedSearchSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token) return;

        const trimmedName = savedSearchForm.name.trim();
        const trimmedQuery = savedSearchForm.query.trim();
        if (!trimmedName) {
            setSavedSearchError('Saved search name is required.');
            return;
        }

        const filters: SavedSearchFilters = {};
        if (savedSearchForm.type) filters.type = savedSearchForm.type;
        if (savedSearchForm.category) filters.category = savedSearchForm.category;
        if (savedSearchForm.organization) filters.organization = savedSearchForm.organization;
        if (savedSearchForm.location) filters.location = savedSearchForm.location;
        if (savedSearchForm.qualification) filters.qualification = savedSearchForm.qualification;

        const hasFilters = Object.keys(filters).length > 0;
        if (!trimmedQuery && !hasFilters) {
            setSavedSearchError('Add a keyword or at least one filter.');
            return;
        }

        setSavedSearchSaving(true);
        setSavedSearchError(null);

        try {
            const payload = {
                name: trimmedName,
                query: trimmedQuery,
                filters: hasFilters ? filters : undefined,
                notificationsEnabled: savedSearchForm.notificationsEnabled,
                frequency: savedSearchForm.frequency,
            };

            const url = savedSearchEditingId
                ? `${API_BASE}/api/profile/saved-searches/${savedSearchEditingId}`
                : `${API_BASE}/api/profile/saved-searches`;
            const method = savedSearchEditingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchSavedSearches();
                resetSavedSearchForm();
            } else {
                setSavedSearchError('Unable to save this search.');
            }
        } catch (error) {
            console.error('Failed to save search:', error);
            setSavedSearchError('Unable to save this search.');
        } finally {
            setSavedSearchSaving(false);
        }
    };

    const handleSavedSearchEdit = (search: SavedSearch) => {
        setSavedSearchEditingId(search.id);
        setSavedSearchForm({
            name: search.name,
            query: search.query || '',
            type: search.filters?.type || '',
            category: search.filters?.category || '',
            organization: search.filters?.organization || '',
            location: search.filters?.location || '',
            qualification: search.filters?.qualification || '',
            notificationsEnabled: search.notificationsEnabled,
            frequency: search.frequency,
        });
        setActiveSection('saved');
    };

    const handleSavedSearchDelete = async (searchId: string) => {
        if (!token) return;
        if (!window.confirm('Delete this saved search?')) return;

        try {
            const res = await fetch(`${API_BASE}/api/profile/saved-searches/${searchId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                await fetchSavedSearches();
                if (savedSearchEditingId === searchId) {
                    resetSavedSearchForm();
                }
            }
        } catch (error) {
            console.error('Failed to delete saved search:', error);
        }
    };

    const handleSavedSearchToggle = async (search: SavedSearch, enabled: boolean) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/profile/saved-searches/${search.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ notificationsEnabled: enabled })
            });

            if (res.ok) {
                await fetchSavedSearches();
            }
        } catch (error) {
            console.error('Failed to update saved search:', error);
        }
    };

    if (loading) {
        return (
            <div className="app">
                <Header setCurrentPage={(page) => navigate('/' + page)} user={user} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} />
                <main className="main-content"><SkeletonLoader /></main>
            </div>
        );
    }

    return (
        <div className="app">
            <Header setCurrentPage={(page) => navigate('/' + page)} user={user} isAuthenticated={isAuthenticated} onLogin={() => { }} onLogout={logout} />
            <Navigation
                activeTab={'profile' as TabType}
                setActiveTab={() => { }}
                setShowSearch={() => { }}
                goBack={() => navigate(-1)}
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main className="main-content">
                <div className="profile-page">
                    <div className="profile-header">
                        <div className="profile-avatar">
                            {user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="profile-info">
                            <h1>{user?.name || 'User'}</h1>
                            <p>{user?.email}</p>
                            {profile?.profileComplete && <span className="badge complete">Profile Complete</span>}
                        </div>
                    </div>

                    <div className="profile-tabs">
                        <button
                            className={activeSection === 'preferences' ? 'active' : ''}
                            onClick={() => setActiveSection('preferences')}
                        >
                            Preferences
                        </button>
                        <button
                            className={activeSection === 'recommendations' ? 'active' : ''}
                            onClick={() => setActiveSection('recommendations')}
                        >
                            For You
                        </button>
                        <button
                            className={activeSection === 'notifications' ? 'active' : ''}
                            onClick={() => setActiveSection('notifications')}
                        >
                            Notifications
                        </button>
                        <button
                            className={activeSection === 'saved' ? 'active' : ''}
                            onClick={() => setActiveSection('saved')}
                        >
                            Saved Searches
                        </button>
                        <button
                            className={activeSection === 'alerts' ? 'active' : ''}
                            onClick={() => setActiveSection('alerts')}
                        >
                            Alerts
                        </button>
                    </div>

                    {saving && <div className="saving-indicator">Saving...</div>}

                    {activeSection === 'preferences' && options && (
                        <div className="profile-section">
                            <h2>Job Categories</h2>
                            <p className="section-hint">Select categories you're interested in</p>
                            <div className="chip-group">
                                {options.categories.map(cat => (
                                    <button
                                        key={cat}
                                        className={`chip ${profile?.preferredCategories?.includes(cat) ? 'selected' : ''}`}
                                        onClick={() => togglePreference('preferredCategories', cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <h2>Qualifications</h2>
                            <p className="section-hint">Select your qualifications</p>
                            <div className="chip-group">
                                {options.qualifications.map(qual => (
                                    <button
                                        key={qual}
                                        className={`chip ${profile?.preferredQualifications?.includes(qual) ? 'selected' : ''}`}
                                        onClick={() => togglePreference('preferredQualifications', qual)}
                                    >
                                        {qual}
                                    </button>
                                ))}
                            </div>

                            <h2>Preferred Locations</h2>
                            <p className="section-hint">Where do you want to work?</p>
                            <div className="chip-group">
                                {options.locations.map(loc => (
                                    <button
                                        key={loc}
                                        className={`chip ${profile?.preferredLocations?.includes(loc) ? 'selected' : ''}`}
                                        onClick={() => togglePreference('preferredLocations', loc)}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>

                            <h2>Age Group</h2>
                            <div className="select-group">
                                <select
                                    value={profile?.ageGroup || ''}
                                    onChange={(e) => saveProfile({ ageGroup: e.target.value || null } as any)}
                                >
                                    <option value="">Select age group</option>
                                    {options.ageGroups.map(age => (
                                        <option key={age} value={age}>{age}</option>
                                    ))}
                                </select>
                            </div>

                            <h2>Education Level</h2>
                            <div className="select-group">
                                <select
                                    value={profile?.educationLevel || ''}
                                    onChange={(e) => saveProfile({ educationLevel: e.target.value || null } as any)}
                                >
                                    <option value="">Select education level</option>
                                    {options.educationLevels.map(edu => (
                                        <option key={edu} value={edu}>{edu}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeSection === 'recommendations' && (
                        <div className="profile-section">
                            <h2>Recommended Jobs For You</h2>
                            <p className="section-hint">Based on your preferences</p>

                            {recommendations.length === 0 ? (
                                <div className="empty-state">
                                    <p>No recommendations yet. Update your preferences to get personalized job matches!</p>
                                </div>
                            ) : (
                                <div className="recommendations-list">
                                    {recommendations.map(rec => (
                                        <div
                                            key={rec.id}
                                            className="recommendation-card"
                                            onClick={() => navigate(`/${rec.type}/${rec.slug}`)}
                                        >
                                            <div className="match-score">
                                                {Math.round(rec.matchScore)}% Match
                                            </div>
                                            <h3>{rec.title}</h3>
                                            <div className="rec-meta">
                                                <span>{rec.organization}</span>
                                                {rec.totalPosts && <span>{rec.totalPosts} Posts</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div className="profile-section">
                            <h2>Notification Settings</h2>

                            <div className="toggle-group">
                                <label>
                                    <span>Email Notifications</span>
                                    <input
                                        type="checkbox"
                                        checked={profile?.emailNotifications || false}
                                        onChange={(e) => saveProfile({ emailNotifications: e.target.checked })}
                                    />
                                </label>
                            </div>

                            <div className="toggle-group">
                                <label>
                                    <span>Push Notifications</span>
                                    <input
                                        type="checkbox"
                                        checked={profile?.pushNotifications || false}
                                        onChange={(e) => saveProfile({ pushNotifications: e.target.checked })}
                                    />
                                </label>
                            </div>

                            <h3>Notification Frequency</h3>
                            <div className="radio-group">
                                {['instant', 'daily', 'weekly'].map(freq => (
                                    <label key={freq}>
                                        <input
                                            type="radio"
                                            name="frequency"
                                            checked={profile?.notificationFrequency === freq}
                                            onChange={() => saveProfile({ notificationFrequency: freq as NotificationFrequency })}
                                        />
                                        <span>{freq.charAt(0).toUpperCase() + freq.slice(1)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSection === 'saved' && (
                        <div className="profile-section">
                            <div className="saved-search-header">
                                <div>
                                    <h2>Saved Searches</h2>
                                    <p className="section-hint">Save filters and get alerts when new matches appear.</p>
                                </div>
                                <button className="admin-btn secondary" onClick={resetSavedSearchForm}>Reset</button>
                            </div>

                            <form className="saved-search-form" onSubmit={handleSavedSearchSubmit}>
                                <div className="saved-search-grid">
                                    <div className="saved-search-field">
                                        <label>Name</label>
                                        <input
                                            type="text"
                                            value={savedSearchForm.name}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, name: e.target.value })}
                                            placeholder="e.g. Banking clerk jobs"
                                        />
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Keyword</label>
                                        <input
                                            type="text"
                                            value={savedSearchForm.query}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, query: e.target.value })}
                                            placeholder="e.g. SBI, SSC, Railways"
                                        />
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Type</label>
                                        <select
                                            value={savedSearchForm.type}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, type: e.target.value as ContentType | '' })}
                                        >
                                            {SEARCH_TYPES.map((type) => (
                                                <option key={type.label} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Category</label>
                                        <select
                                            value={savedSearchForm.category}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, category: e.target.value })}
                                        >
                                            <option value="">All categories</option>
                                            {options?.categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Organization</label>
                                        <select
                                            value={savedSearchForm.organization}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, organization: e.target.value })}
                                        >
                                            <option value="">All organizations</option>
                                            {options?.organizations.map((org) => (
                                                <option key={org} value={org}>{org}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Location</label>
                                        <select
                                            value={savedSearchForm.location}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, location: e.target.value })}
                                        >
                                            <option value="">All locations</option>
                                            {options?.locations.map((loc) => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Qualification</label>
                                        <select
                                            value={savedSearchForm.qualification}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, qualification: e.target.value })}
                                        >
                                            <option value="">All qualifications</option>
                                            {options?.qualifications.map((qual) => (
                                                <option key={qual} value={qual}>{qual}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saved-search-field">
                                        <label>Digest</label>
                                        <select
                                            value={savedSearchForm.frequency}
                                            onChange={(e) => setSavedSearchForm({ ...savedSearchForm, frequency: e.target.value as NotificationFrequency })}
                                        >
                                            {options?.notificationFrequencies.map((freq) => (
                                                <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saved-search-field checkbox">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={savedSearchForm.notificationsEnabled}
                                                onChange={(e) => setSavedSearchForm({ ...savedSearchForm, notificationsEnabled: e.target.checked })}
                                            />
                                            Enable notifications
                                        </label>
                                    </div>
                                </div>

                                {savedSearchError && <div className="form-message error">{savedSearchError}</div>}

                                <div className="saved-search-actions">
                                    <button type="submit" className="admin-btn primary" disabled={savedSearchSaving}>
                                        {savedSearchEditingId ? 'Update search' : 'Save search'}
                                    </button>
                                    {savedSearchEditingId && (
                                        <button type="button" className="admin-btn secondary" onClick={resetSavedSearchForm}>Cancel edit</button>
                                    )}
                                </div>
                            </form>

                            <div className="saved-search-list">
                                {savedSearchesLoading ? (
                                    <div className="admin-loading">Loading saved searches...</div>
                                ) : savedSearches.length === 0 ? (
                                    <div className="empty-state">No saved searches yet.</div>
                                ) : (
                                    savedSearches.map((search) => (
                                        <div key={search.id} className="saved-search-card">
                                            <div className="saved-search-card-header">
                                                <div>
                                                    <h3>{search.name}</h3>
                                                    <p className="saved-search-query">{search.query || 'No keyword filter'}</p>
                                                    <div className="saved-search-meta">
                                                        <span>Digest: {search.frequency}</span>
                                                        <span>Updated: {formatDate(search.updatedAt)}</span>
                                                        {search.lastNotifiedAt && <span>Last alert: {formatDateTime(search.lastNotifiedAt)}</span>}
                                                    </div>
                                                </div>
                                                <div className="saved-search-actions">
                                                    <button className="admin-btn secondary small" onClick={() => handleSavedSearchEdit(search)}>Edit</button>
                                                    <button className="admin-btn danger small" onClick={() => handleSavedSearchDelete(search.id)}>Delete</button>
                                                </div>
                                            </div>
                                            <div className="saved-search-tags">
                                                {search.filters?.type && <span className="filter-tag">Type: {search.filters.type}</span>}
                                                {search.filters?.category && <span className="filter-tag">Category: {search.filters.category}</span>}
                                                {search.filters?.organization && <span className="filter-tag">Org: {search.filters.organization}</span>}
                                                {search.filters?.location && <span className="filter-tag">Location: {search.filters.location}</span>}
                                                {search.filters?.qualification && <span className="filter-tag">Qualification: {search.filters.qualification}</span>}
                                            </div>
                                            <div className="saved-search-toggle">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={search.notificationsEnabled}
                                                        onChange={(e) => handleSavedSearchToggle(search, e.target.checked)}
                                                    />
                                                    Notifications ({search.frequency})
                                                </label>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'alerts' && (
                        <div className="profile-section">
                            <div className="saved-search-header">
                                <div>
                                    <h2>Alerts and digest</h2>
                                    <p className="section-hint">Latest matches from saved searches and preferences.</p>
                                </div>
                                <button
                                    className="admin-btn secondary"
                                    onClick={() => { fetchAlerts(alertWindowDays, alertLimit); fetchDigestPreview(alertWindowDays, alertLimit); }}
                                >
                                    Refresh
                                </button>
                            </div>

                            <div className="alert-controls">
                                <div className="alert-control">
                                    <label>Window</label>
                                    <select
                                        value={alertWindowDays}
                                        onChange={(e) => setAlertWindowDays(parseInt(e.target.value, 10))}
                                    >
                                        <option value={3}>Last 3 days</option>
                                        <option value={7}>Last 7 days</option>
                                        <option value={14}>Last 14 days</option>
                                        <option value={30}>Last 30 days</option>
                                    </select>
                                </div>
                                <div className="alert-control">
                                    <label>Max items</label>
                                    <select
                                        value={alertLimit}
                                        onChange={(e) => setAlertLimit(parseInt(e.target.value, 10))}
                                    >
                                        <option value={4}>4 items</option>
                                        <option value={6}>6 items</option>
                                        <option value={8}>8 items</option>
                                        <option value={12}>12 items</option>
                                    </select>
                                </div>
                                <button
                                    className="admin-btn primary"
                                    onClick={() => { fetchAlerts(alertWindowDays, alertLimit); fetchDigestPreview(alertWindowDays, alertLimit); }}
                                >
                                    Apply
                                </button>
                            </div>

                            {alertsLoading ? (
                                <div className="admin-loading">Loading alerts...</div>
                            ) : alerts ? (
                                <div className="alerts-content">
                                    <div className="alert-group">
                                        <div className="alert-group-header">
                                            <h3>Saved search alerts</h3>
                                            <span className="alert-count">{alerts.savedSearches.length} searches</span>
                                        </div>
                                        {alerts.savedSearches.length === 0 ? (
                                            <div className="empty-state">No saved searches yet.</div>
                                        ) : (
                                            alerts.savedSearches.map((search) => (
                                                <div key={search.id} className="alert-card">
                                                    <div className="alert-card-header">
                                                        <div>
                                                            <h4>{search.name}</h4>
                                                            <span className="alert-count">{search.totalMatches} matches</span>
                                                        </div>
                                                        <span className="alert-window">Last {alerts.windowDays} days</span>
                                                    </div>
                                                    {search.matches.length === 0 ? (
                                                        <div className="empty-state">No new matches.</div>
                                                    ) : (
                                                        <div className="alert-list">
                                                            {search.matches.map((match) => (
                                                                <div
                                                                    key={match.id}
                                                                    className="alert-item"
                                                                    onClick={() => navigate(`/${match.type}/${match.slug}`)}
                                                                >
                                                                    <div>
                                                                        <strong>{match.title}</strong>
                                                                        <div className="alert-meta">{match.organization} | {match.type}</div>
                                                                    </div>
                                                                    <span className="alert-date">{formatDate(match.postedAt)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="alert-group">
                                        <div className="alert-group-header">
                                            <h3>Preference alerts</h3>
                                            <span className="alert-count">{alerts.preferences.totalMatches} matches</span>
                                        </div>
                                        {alerts.preferences.matches.length === 0 ? (
                                            <div className="empty-state">No preference alerts yet.</div>
                                        ) : (
                                            <div className="alert-list">
                                                {alerts.preferences.matches.map((match) => (
                                                    <div
                                                        key={match.id}
                                                        className="alert-item"
                                                        onClick={() => navigate(`/${match.type}/${match.slug}`)}
                                                    >
                                                        <div>
                                                            <strong>{match.title}</strong>
                                                            <div className="alert-meta">{match.organization} | {match.type}</div>
                                                        </div>
                                                        <span className="alert-date">{formatDate(match.postedAt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="digest-preview">
                                        <div className="alert-group-header">
                                            <h3>Digest preview</h3>
                                            {digestPreview && (
                                                <span className="alert-window">Generated {formatDateTime(digestPreview.generatedAt)}</span>
                                            )}
                                        </div>
                                        {digestLoading ? (
                                            <div className="admin-loading">Loading digest preview...</div>
                                        ) : digestPreview ? (
                                            digestPreview.preview.length === 0 ? (
                                                <div className="empty-state">No digest items yet.</div>
                                            ) : (
                                                <div className="alert-list">
                                                    {digestPreview.preview.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="alert-item"
                                                            onClick={() => navigate(`/${item.type}/${item.slug}`)}
                                                        >
                                                            <div>
                                                                <strong>{item.title}</strong>
                                                                <div className="alert-meta">{item.organization} | {item.type}</div>
                                                            </div>
                                                            <span className="alert-date">{formatDate(item.postedAt)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            <div className="empty-state">Digest preview is not available.</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state">Unable to load alerts.</div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
        </div>
    );
}

export default ProfilePage;
