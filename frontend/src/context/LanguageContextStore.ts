import { createContext, useContext } from 'react';

export type Language = 'en' | 'hi' | 'bho' | 'mai';

export type LanguageContextValue = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
