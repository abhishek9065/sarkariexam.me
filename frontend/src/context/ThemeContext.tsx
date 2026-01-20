/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark'; // Always dark
export type ThemeMode = 'dark'; // Always dark

interface ThemeContextType {
    theme: Theme;
    themeMode: ThemeMode;
    toggleTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Always dark theme - no light mode
    const [themeMode] = useState<ThemeMode>('dark');
    const [theme] = useState<Theme>('dark');

    useEffect(() => {
        // Always set dark theme
        document.documentElement.setAttribute('data-theme', 'dark');
        // Clear any old theme preference
        localStorage.removeItem('themeMode');
    }, []);

    // No-op functions since we only support dark mode
    const toggleTheme = () => { };
    const setThemeMode = () => { };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}
