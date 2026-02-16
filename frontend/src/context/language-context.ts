import { createContext } from 'react';

export type LanguageCode = 'en' | 'hi';

export interface LanguageContextValue {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    toggleLanguage: () => void;
    t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
