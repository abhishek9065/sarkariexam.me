import { useState } from 'react';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export function SubscribeBox() {
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
                    <button type="submit" disabled={status === 'loading'} className={status}>
                        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
                    </button>
                </div>

                {message && <div className={`subscribe-message ${status}`}>{message}</div>}
            </form>
        </div>
    );
}
