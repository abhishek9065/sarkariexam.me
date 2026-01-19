import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header, Navigation, Footer, SkeletonLoader } from '../components';
import { API_BASE } from '../utils';
import type { TabType } from '../utils/constants';
import type { Announcement } from '../types';
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
    notificationFrequency: 'instant' | 'daily' | 'weekly';
    profileComplete: boolean;
    onboardingCompleted: boolean;
}

interface ProfileOptions {
    categories: string[];
    qualifications: string[];
    ageGroups: string[];
    educationLevels: string[];
    notificationFrequencies: string[];
    locations: string[];
}

interface Recommendation extends Announcement {
    matchScore: number;
    matchReasons: Record<string, number>;
}

export function ProfilePage() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [options, setOptions] = useState<ProfileOptions | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'preferences' | 'notifications' | 'recommendations'>('preferences');

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
                            {profile?.profileComplete && <span className="badge complete">✓ Profile Complete</span>}
                        </div>
                    </div>

                    <div className="profile-tabs">
                        <button
                            className={activeSection === 'preferences' ? 'active' : ''}
                            onClick={() => setActiveSection('preferences')}
                        >
                            🎯 Preferences
                        </button>
                        <button
                            className={activeSection === 'recommendations' ? 'active' : ''}
                            onClick={() => setActiveSection('recommendations')}
                        >
                            💼 For You
                        </button>
                        <button
                            className={activeSection === 'notifications' ? 'active' : ''}
                            onClick={() => setActiveSection('notifications')}
                        >
                            🔔 Notifications
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
                                            onChange={() => saveProfile({ notificationFrequency: freq as any })}
                                        />
                                        <span>{freq.charAt(0).toUpperCase() + freq.slice(1)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
        </div>
    );
}

export default ProfilePage;
