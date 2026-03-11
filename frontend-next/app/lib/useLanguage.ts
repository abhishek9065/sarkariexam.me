'use client';

import { useContext } from 'react';

import { LanguageContext, type LanguageContextValue } from './language-context';

const NOOP_LANG: LanguageContextValue = {
    language: 'en',
    setLanguage: () => {},
    toggleLanguage: () => {},
    t: (key: string) => key,
};

export function useLanguage(): LanguageContextValue {
    const context = useContext(LanguageContext);
    return context ?? NOOP_LANG;
}
