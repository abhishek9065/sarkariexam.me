import { useState } from 'react';
import type { ContentType } from '../../types';
import { API_BASE } from '../../utils/constants';

interface JobAlertsProps {
    onSuccess?: () => void;
}

const CATEGORIES = [
    { value: 'job', label: '💼 Jobs' },
    { value: 'result', label: '📊 Results' },
    { value: 'admit-card', label: '🎫 Admit Cards' },
    { value: 'answer-key', label: '📝 Answer Keys' },
    { value: 'admission', label: '🎓 Admissions' },
    { value: 'syllabus', label: '📚 Syllabus' },
];

export function JobAlerts({ onSuccess }: JobAlertsProps) {
    const [email, setEmail] = useState('');
    const [submittedEmail, setSubmittedEmail] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<Set<ContentType>>(new Set(['job', 'result']));
    const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleCategory = (type: ContentType) => {
        const newSet = new Set(selectedCategories);
        if (newSet.has(type)) {
            newSet.delete(type);
        } else {
            newSet.add(type);
        }
        setSelectedCategories(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || selectedCategories.size === 0) {
            setError('Please enter email and select at least one category');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    categories: Array.from(selectedCategories),
                    frequency,
                }),
            });

            if (!res.ok) throw new Error('Failed to subscribe');

            setSuccess(true);
            setSubmittedEmail(email);
            setEmail('');
            onSuccess?.();
        } catch (err) {
            setError('Failed to subscribe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="job-alerts success">
                <div className="success-message">
                    <span className="success-icon">✅</span>
                    <h3>Successfully Subscribed!</h3>
                    <p>You'll receive job alerts at {submittedEmail || email}</p>
                    <button onClick={() => { setSuccess(false); setSubmittedEmail(''); }}>Subscribe Another</button>
                </div>
            </div>
        );
    }

    return (
        <div className="job-alerts">
            <div className="alerts-header">
                <h2>🔔 Job Alerts</h2>
                <p>Get notified about new jobs, results, and more!</p>
            </div>

            <form onSubmit={handleSubmit} className="alerts-form">
                <div className="form-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Categories to Subscribe</label>
                    <div className="category-chips">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.value}
                                type="button"
                                className={`category-chip ${selectedCategories.has(cat.value as ContentType) ? 'selected' : ''}`}
                                onClick={() => toggleCategory(cat.value as ContentType)}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>Alert Frequency</label>
                    <div className="frequency-options">
                        <label className={`frequency-option ${frequency === 'daily' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="frequency"
                                value="daily"
                                checked={frequency === 'daily'}
                                onChange={() => setFrequency('daily')}
                            />
                            <span>📆 Daily Digest</span>
                        </label>
                        <label className={`frequency-option ${frequency === 'weekly' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="frequency"
                                value="weekly"
                                checked={frequency === 'weekly'}
                                onChange={() => setFrequency('weekly')}
                            />
                            <span>📅 Weekly Summary</span>
                        </label>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="subscribe-btn" disabled={loading}>
                    {loading ? 'Subscribing...' : '🔔 Subscribe to Alerts'}
                </button>
            </form>
        </div>
    );
}
