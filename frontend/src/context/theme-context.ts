import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    themeMode: Theme;
    setThemeMode: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
    theme: 'light',
    toggleTheme: () => { },
    themeMode: 'light',
    setThemeMode: () => { },
});
