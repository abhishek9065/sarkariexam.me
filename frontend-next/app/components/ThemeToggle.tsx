'use client';

import { useEffect, useReducer } from 'react';
import { getStoredTheme, setStoredTheme, getEffectiveTheme, applyTheme, watchSystemTheme, type Theme } from '@/app/lib/theme';

export function ThemeToggle() {
    const [, rerender] = useReducer((count: number) => count + 1, 0);
    const theme: Theme = typeof window === 'undefined' ? 'system' : getStoredTheme();

    useEffect(() => {
        const effectiveTheme = getEffectiveTheme(theme);
        applyTheme(effectiveTheme);

        if (theme === 'system') {
            return watchSystemTheme((systemTheme) => {
                applyTheme(systemTheme);
            });
        }
        return undefined;
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setStoredTheme(newTheme);
        applyTheme(getEffectiveTheme(newTheme));
        rerender();
    };

    if (typeof window === 'undefined') {
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
