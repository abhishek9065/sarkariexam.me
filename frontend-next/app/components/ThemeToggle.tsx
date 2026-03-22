'use client';

import { useEffect, useState } from 'react';
import { getStoredTheme, setStoredTheme, getEffectiveTheme, applyTheme, watchSystemTheme, type Theme } from '@/app/lib/theme';

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setTheme(getStoredTheme());
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const effectiveTheme = getEffectiveTheme(theme);
        applyTheme(effectiveTheme);

        if (theme === 'system') {
            return watchSystemTheme((systemTheme) => {
                applyTheme(systemTheme);
            });
        }
    }, [theme, mounted]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        setStoredTheme(newTheme);
    };

    if (!mounted) {
        return <div className="theme-toggle-skeleton" />;
    }

    return (
        <div className="theme-toggle">
            <button
                onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
                className="theme-toggle-button"
                aria-label="Toggle theme"
                title={`Current theme: ${theme}`}
            >
                {getEffectiveTheme(theme) === 'dark' ? '🌙' : '☀️'}
            </button>
        </div>
    );
}
