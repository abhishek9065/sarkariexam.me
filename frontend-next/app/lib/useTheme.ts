'use client';

import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './theme-context';

const NOOP_THEME: ThemeContextValue = {
    theme: 'light',
    toggleTheme: () => {},
    themeMode: 'light',
    setThemeMode: () => {},
};

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    return context ?? NOOP_THEME;
}
