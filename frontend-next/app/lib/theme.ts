/**
 * Theme Management System
 * Handles dark mode and theme persistence
 */

'use client';

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'sarkari-theme';

export function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }
    return 'system';
}

export function setStoredTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
}

export function applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#f97316');
    }
}

export function initializeTheme(): void {
    const storedTheme = getStoredTheme();
    const effectiveTheme = getEffectiveTheme(storedTheme);
    applyTheme(effectiveTheme);
}

export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
    if (typeof window === 'undefined') return () => {};
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    
    return () => {
        mediaQuery.removeEventListener('change', handler);
    };
}
