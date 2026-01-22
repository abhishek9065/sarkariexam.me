import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './OnboardingModal.css';

const apiBase = import.meta.env.VITE_API_BASE ?? '';

type ProfileOptions = {
    categories: string[];
    qualifications: string[];
    locations: string[];
};

type ProfilePayload = {
    preferredCategories?: string[];
    preferredLocations?: string[];
    preferredQualifications?: string[];
    onboardingCompleted?: boolean;
    profileComplete?: boolean;
};

export function OnboardingModal() {
    const { token, isAuthenticated } = useAuth();
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [options, setOptions] = useState<ProfileOptions | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);

    useEffect(() => {
        if (!token || !isAuthenticated) return;
        let isActive = true;
        setLoading(true);
        Promise.all([
            fetch(`${apiBase}/api/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${apiBase}/api/profile/options`)
        ])
            .then(async ([profileRes, optionsRes]) => {
                if (!isActive) return;
                if (!profileRes.ok || !optionsRes.ok) return;
                const profile = await profileRes.json();
                const opts = await optionsRes.json();
                const data = profile.data;
                if (data?.onboardingCompleted) {
                    setShow(false);
                    return;
                }
                setSelectedCategories(data?.preferredCategories ?? []);
                setSelectedLocations(data?.preferredLocations ?? []);
                setSelectedQualifications(data?.preferredQualifications ?? []);
                setOptions({
                    categories: opts.data?.categories ?? [],
                    qualifications: opts.data?.qualifications ?? [],
                    locations: opts.data?.locations ?? [],
                });
                setShow(true);
            })
            .catch(console.error)
            .finally(() => {
                if (isActive) setLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [token, isAuthenticated]);

    const hasSelections = useMemo(() => (
        selectedCategories.length > 0 ||
        selectedLocations.length > 0 ||
        selectedQualifications.length > 0
    ), [selectedCategories, selectedLocations, selectedQualifications]);

    const toggleItem = (value: string, list: string[], setter: (next: string[]) => void) => {
        if (list.includes(value)) {
            setter(list.filter((item) => item !== value));
        } else {
            setter([...list, value]);
        }
    };

    const saveOnboarding = async (skip = false) => {
        if (!token) return;
        setSaving(true);
        try {
            const payload: ProfilePayload = {
                preferredCategories: skip ? [] : selectedCategories,
                preferredLocations: skip ? [] : selectedLocations,
                preferredQualifications: skip ? [] : selectedQualifications,
                onboardingCompleted: true,
                profileComplete: skip ? false : hasSelections,
            };

            const res = await fetch(`${apiBase}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShow(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!show || !options) return null;

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal">
                <div className="onboarding-header">
                    <h2>Personalize your updates</h2>
                    <p>Choose the categories and interests you care about. You can update these anytime in Profile.</p>
                </div>

                {loading ? (
                    <div className="onboarding-loading">Loading preferences...</div>
                ) : (
                    <div className="onboarding-content">
                        <div className="onboarding-section">
                            <h3>Categories</h3>
                            <div className="onboarding-chips">
                                {options.categories.map((category) => (
                                    <button
                                        key={category}
                                        className={`onboarding-chip ${selectedCategories.includes(category) ? 'active' : ''}`}
                                        onClick={() => toggleItem(category, selectedCategories, setSelectedCategories)}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="onboarding-section">
                            <h3>Locations</h3>
                            <div className="onboarding-chips">
                                {options.locations.map((location) => (
                                    <button
                                        key={location}
                                        className={`onboarding-chip ${selectedLocations.includes(location) ? 'active' : ''}`}
                                        onClick={() => toggleItem(location, selectedLocations, setSelectedLocations)}
                                    >
                                        {location}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="onboarding-section">
                            <h3>Qualifications</h3>
                            <div className="onboarding-chips">
                                {options.qualifications.map((qualification) => (
                                    <button
                                        key={qualification}
                                        className={`onboarding-chip ${selectedQualifications.includes(qualification) ? 'active' : ''}`}
                                        onClick={() => toggleItem(qualification, selectedQualifications, setSelectedQualifications)}
                                    >
                                        {qualification}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="onboarding-actions">
                    <button className="admin-btn secondary" onClick={() => saveOnboarding(true)} disabled={saving}>
                        Skip for now
                    </button>
                    <button className="admin-btn primary" onClick={() => saveOnboarding(false)} disabled={saving}>
                        {saving ? 'Saving...' : 'Save preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OnboardingModal;
