import { useState } from 'react';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

export function SubscribeBox() {
    const [email, setEmail] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [emailSuggestion, setEmailSuggestion] = useState('');

    const categoryOptions = [
        { value: 'job', label: 'Job Notifications' },
        { value: 'result', label: 'Results & Merit Lists' },
        { value: 'admit-card', label: 'Admit Cards & Hall Tickets' },
        { value: 'answer-key', label: 'Answer Keys & Solutions' },
        { value: 'admission', label: 'College Admissions' },
        { value: 'syllabus', label: 'Syllabus & Exam Patterns' },
    ];

    const validateForm = () => {
        const errors: string[] = [];
        
        if (!email.trim()) {
            errors.push('Email address is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Please enter a valid email address');
        }
        
        if (!privacyAccepted) {
            errors.push('You must accept the privacy policy to subscribe');
        }

        if (categories.length === 0) {
            errors.push('Please select at least one notification type');
        }

        return errors.length === 0;
    };

    const handleCategoryToggle = (cat: string) => {
        setCategories(prev =>
            prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
        );
    };

    const detectEmailSuggestion = (value: string) => {
        const domainTypos: Record<string, string> = {
            'gmial.com': 'gmail.com',
            'gamil.com': 'gmail.com',
            'gmal.com': 'gmail.com',
            'hotnail.com': 'hotmail.com',
            'hotmai.com': 'hotmail.com',
            'yaho.com': 'yahoo.com',
            'yhoo.com': 'yahoo.com',
            'outlok.com': 'outlook.com',
            'outllok.com': 'outlook.com',
        };

        const parts = value.split('@');
        if (parts.length !== 2) {
            setEmailSuggestion('');
            return;
        }

        const [name, domain] = parts;
        const suggestion = domainTypos[domain.toLowerCase()];
        if (suggestion) {
            setEmailSuggestion(`${name}@${suggestion}`);
        } else {
            setEmailSuggestion('');
        }
    };

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setStatus('error');
            setMessage('Please fix the errors below');
            return;
        }

        setStatus('loading');
        setMessage('');
        setValidationErrors([]);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const subscriptionData = {
                email: email.trim(),
                categories: categories.length > 0 ? categories : ['all'],
                privacyAccepted,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${apiBase}/api/subscriptions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(subscriptionData),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('✅ Subscription successful! Check your email to verify your subscription.');
                setEmail('');
                setCategories([]);
                setPrivacyAccepted(false);
            } else {
                setStatus('error');
                setMessage(result.error || 'Subscription failed. Please try again.');
            }
        } catch (err) {
            setStatus('error');
            if (err instanceof Error && err.name === 'AbortError') {
                setMessage('Request timed out. Please try again.');
            } else {
                setMessage('Network error. Please check your connection and try again.');
            }

        }
    };

    return (
        <div className="subscribe-box">
            <h3>📧 Get Email Notifications</h3>
            <p>Subscribe to receive the latest job alerts directly in your inbox!</p>

            <form onSubmit={handleSubscribe} className="subscribe-form">
                <fieldset className="subscribe-categories">
                    <legend className="category-legend">Select notification categories (leave empty to receive all types):</legend>
                    {categoryOptions.map(cat => (
                        <label key={cat.value} className="category-checkbox">
                            <input
                                type="checkbox"
                                checked={categories.includes(cat.value)}
                                onChange={() => handleCategoryToggle(cat.value)}
                                aria-describedby="category-hint"
                            />
                            <span className="checkbox-label">{cat.label}</span>
                        </label>
                    ))}
                    <p id="category-hint" className="category-hint">If no categories are selected, you'll receive notifications for all types.</p>
                </fieldset>

                <div className="subscribe-input-row">
                    <label htmlFor="email-input" className="email-label">Email address:</label>
                    <input
                        id="email-input"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => {
                            const value = e.target.value;
                            setEmail(value);
                            detectEmailSuggestion(value);
                        }}
                        disabled={status === 'loading'}
                        aria-required="true"
                        aria-describedby={message ? 'subscription-message category-hint' : 'category-hint'}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        list=""
                        required
                    />
                    {emailSuggestion && (
                        <button
                            type="button"
                            className="email-suggestion"
                            onClick={() => {
                                setEmail(emailSuggestion);
                                setEmailSuggestion('');
                            }}
                        >
                            Did you mean {emailSuggestion}?
                        </button>
                    )}
                    <button 
                        type="submit" 
                        disabled={status === 'loading'} 
                        className={`subscribe-btn ${status === 'loading' ? 'loading' : ''}`}
                        aria-label="Subscribe to receive email notifications for selected categories"
                    >
                        {status === 'loading' ? (
                            <>
                                <span className="loading-spinner" aria-hidden="true"></span>
                                <span>Subscribing...</span>
                            </>
                        ) : (
                            <>
                                <span className="subscribe-icon" aria-hidden="true">📧</span>
                                <span>Subscribe</span>
                            </>
                        )}
                    </button>
                </div>

                {message && <div className={`subscribe-message ${status}`}>{message}</div>}
            </form>
        </div>
    );
}
