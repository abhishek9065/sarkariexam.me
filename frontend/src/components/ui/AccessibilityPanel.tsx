import { useEffect, useState } from 'react';

type AccessibilitySettings = {
    fontScale: '1' | '1.1' | '1.2';
    contrast: 'default' | 'high';
    reduceMotion: boolean;
    dyslexiaFont: boolean;
};

const STORAGE_KEY = 'accessibilitySettings';

const DEFAULT_SETTINGS: AccessibilitySettings = {
    fontScale: '1',
    contrast: 'default',
    reduceMotion: false,
    dyslexiaFont: false,
};

const loadSettings = (): AccessibilitySettings => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw) as AccessibilitySettings;
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export function AccessibilityPanel() {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<AccessibilitySettings>(() => loadSettings());

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // ignore storage errors
        }

        const root = document.documentElement;
        root.setAttribute('data-font-scale', settings.fontScale);
        root.setAttribute('data-contrast', settings.contrast);
        root.setAttribute('data-reduce-motion', settings.reduceMotion ? 'true' : 'false');
        root.setAttribute('data-dyslexia', settings.dyslexiaFont ? 'true' : 'false');
    }, [settings]);

    const reset = () => {
        setSettings(DEFAULT_SETTINGS);
        setOpen(false);
    };

    return (
        <div className={`accessibility-panel ${open ? 'open' : ''}`}>
            <button
                className="accessibility-toggle"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Accessibility options"
                aria-expanded={open}
            >
                ♿
            </button>
            {open && (
                <div className="accessibility-card" role="dialog" aria-label="Accessibility settings">
                    <div className="accessibility-header">
                        <h4>Accessibility</h4>
                        <button className="accessibility-close" onClick={() => setOpen(false)} aria-label="Close">
                            ✕
                        </button>
                    </div>

                    <div className="accessibility-group">
                        <span className="accessibility-label">Text size</span>
                        <div className="accessibility-options">
                            {(['1', '1.1', '1.2'] as const).map((value) => (
                                <button
                                    key={value}
                                    className={settings.fontScale === value ? 'active' : ''}
                                    onClick={() => setSettings((prev) => ({ ...prev, fontScale: value }))}
                                >
                                    {value === '1' ? 'Normal' : value === '1.1' ? 'Large' : 'Extra'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="accessibility-group">
                        <span className="accessibility-label">Contrast</span>
                        <div className="accessibility-options">
                            {(['default', 'high'] as const).map((value) => (
                                <button
                                    key={value}
                                    className={settings.contrast === value ? 'active' : ''}
                                    onClick={() => setSettings((prev) => ({ ...prev, contrast: value }))}
                                >
                                    {value === 'default' ? 'Default' : 'High'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="accessibility-toggles">
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.reduceMotion}
                                onChange={(e) => setSettings((prev) => ({ ...prev, reduceMotion: e.target.checked }))}
                            />
                            Reduce motion
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.dyslexiaFont}
                                onChange={(e) => setSettings((prev) => ({ ...prev, dyslexiaFont: e.target.checked }))}
                            />
                            Dyslexia-friendly font
                        </label>
                    </div>

                    <button className="accessibility-reset" onClick={reset}>
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
}

export default AccessibilityPanel;
