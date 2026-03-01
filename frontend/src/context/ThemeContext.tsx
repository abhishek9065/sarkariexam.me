import { useEffect, useState, type ReactNode } from 'react';

import { ThemeContext, type Theme } from './theme-context';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'light';
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
    const setThemeMode = (nextTheme: Theme) => setTheme(nextTheme);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, themeMode: theme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}
