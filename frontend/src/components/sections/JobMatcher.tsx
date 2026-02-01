import { useState, useEffect } from 'react';
import { prefetchAnnouncementDetail } from '../../utils/prefetch';
import { formatNumber } from '../../utils/formatters';

interface UserProfile {
    age: number;
    qualification: string;
    location: string;
    category: string; // General, OBC, SC, ST, EWS
    gender: string;
}

interface MatchedJob {
    id: string;
    title: string;
    slug: string;
    organization: string;
    category: string;
    totalPosts: number;
    deadline: string;
    location: string;
    minQualification: string;
    ageLimit: string;
    matchScore: number;
    matchReasons: string[];
}

const QUALIFICATIONS = [
    '10th Pass',
    '12th Pass',
    'ITI',
    'Diploma',
    'Graduate',
    'Post Graduate',
    'PhD',
];

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const GENDERS = ['Male', 'Female', 'Other'];

const LOCATIONS = [
    'All India',
    'Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Haryana',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
    'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
    'Uttar Pradesh', 'West Bengal',
];

export function JobMatcher() {
    const [profile, setProfile] = useState<UserProfile>({
        age: 25,
        qualification: 'Graduate',
        location: 'All India',
        category: 'General',
        gender: 'Male',
    });
    const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const apiBase = import.meta.env.VITE_API_BASE ?? '';

    const handleSearch = async () => {
        setLoading(true);
        setSearched(true);

        try {
            const params = new URLSearchParams({
                age: profile.age.toString(),
                qualification: profile.qualification,
                location: profile.location,
                category: profile.category,
                gender: profile.gender,
            });

            const response = await fetch(`${apiBase}/api/jobs/match?${params}`);
            if (response.ok) {
                const data = await response.json();
                setMatchedJobs(data.data || []);
            }
        } catch (error) {
            console.error('Error matching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = () => {
        localStorage.setItem('userProfile', JSON.stringify(profile));
        alert('Profile saved! You will receive alerts for matching jobs.');
    };

    // Load saved profile
    useEffect(() => {
        const saved = localStorage.getItem('userProfile');
        if (saved) {
            try {
                setProfile(JSON.parse(saved));
            } catch {
                // Invalid JSON in localStorage, use defaults
            }
        }
    }, []);

    return (
        <div className="job-matcher">
            <div className="matcher-header">
                <h2>🎯 Find Jobs Matching Your Profile</h2>
                <p>Enter your details to see eligible government jobs</p>
            </div>

            <div className="profile-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>Age (Years)</label>
                        <input
                            type="number"
                            min="18"
                            max="65"
                            value={profile.age}
                            onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 18 })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Qualification</label>
                        <select
                            value={profile.qualification}
                            onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
                        >
                            {QUALIFICATIONS.map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <select
                            value={profile.location}
                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        >
                            {LOCATIONS.map(l => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            value={profile.category}
                            onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Gender</label>
                        <select
                            value={profile.gender}
                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        >
                            {GENDERS.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group form-actions">
                        <button className="btn-match" onClick={handleSearch} disabled={loading}>
                            {loading ? '🔍 Searching...' : '🎯 Find Matching Jobs'}
                        </button>
                        <button className="btn-save" onClick={saveProfile}>
                            💾 Save Profile
                        </button>
                    </div>
                </div>
            </div>

            {searched && (
                <div className="match-results">
                    <h3>
                        {matchedJobs.length > 0
                            ? `✅ ${matchedJobs.length} Jobs Match Your Profile`
                            : '❌ No matching jobs found'}
                    </h3>

                    {matchedJobs.length > 0 && (
                        <div className="matched-jobs-list">
                            {matchedJobs.map((job) => (
                                <div key={job.id} className="matched-job-card">
                                    <div className="match-score">
                                        <span className="score">{job.matchScore}%</span>
                                        <span className="label">Match</span>
                                    </div>
                                    <div className="job-info">
                                        <h4>
                                            <a
                                                href={`/job/${job.slug}`}
                                                onMouseEnter={() => prefetchAnnouncementDetail(job.slug)}
                                                onFocus={() => prefetchAnnouncementDetail(job.slug)}
                                            >
                                                {job.title}
                                            </a>
                                        </h4>
                                        <div className="job-meta">
                                            <span>🏢 {job.organization}</span>
                                            <span>📍 {job.location || 'All India'}</span>
                                            <span>👥 {formatNumber(job.totalPosts ?? undefined)} Posts</span>
                                        </div>
                                        <div className="match-reasons">
                                            {job.matchReasons.map((reason, i) => (
                                                <span key={i} className="reason-badge">✓ {reason}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="job-deadline">
                                        <span className="deadline-label">Last Date</span>
                                        <span className="deadline-date">
                                            {new Date(job.deadline).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default JobMatcher;
