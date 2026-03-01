import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LanguageContext, type LanguageCode, type LanguageContextValue } from './language-context';

const STORAGE_KEY = 'ui_language';

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
    en: {
        'nav.home': 'Home',
        'nav.jobs': 'Latest Jobs',
        'nav.results': 'Results',
        'nav.admitCard': 'Admit Card',
        'nav.answerKey': 'Answer Key',
        'nav.admission': 'Admission',
        'nav.syllabus': 'Syllabus',
        'nav.more': 'More',
        'nav.apps': 'Mobile Apps',
        'header.tagline': 'Your Gateway to Government Careers',
        'header.trending': 'Trending',
        'header.signIn': 'Sign In',
        'header.register': 'Register',
        'header.profile': 'Profile',
        'header.bookmarks': 'Bookmarks',
        'header.admin': 'Admin Panel',
        'header.signOut': 'Sign Out',
        'header.search': 'Search',
        'language.en': 'English',
        'language.hi': 'Hindi',
    },
    hi: {
        'nav.home': 'होम',
        'nav.jobs': 'लेटेस्ट जॉब्स',
        'nav.results': 'रिजल्ट',
        'nav.admitCard': 'एडमिट कार्ड',
        'nav.answerKey': 'आंसर की',
        'nav.admission': 'एडमिशन',
        'nav.syllabus': 'सिलेबस',
        'nav.more': 'और',
        'nav.apps': 'मोबाइल ऐप्स',
        'header.tagline': 'सरकारी करियर का भरोसेमंद प्लेटफॉर्म',
        'header.trending': 'ट्रेंडिंग',
        'header.signIn': 'साइन इन',
        'header.register': 'रजिस्टर',
        'header.profile': 'प्रोफाइल',
        'header.bookmarks': 'बुकमार्क्स',
        'header.admin': 'एडमिन पैनल',
        'header.signOut': 'साइन आउट',
        'header.search': 'सर्च',
        'language.en': 'English',
        'language.hi': 'हिन्दी',
    },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<LanguageCode>('en');

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
        if (stored === 'en' || stored === 'hi') {
            setLanguageState(stored);
        }
    }, []);

    const setLanguage = useCallback((lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguageState((prev) => {
            const next = prev === 'en' ? 'hi' : 'en';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    const value = useMemo<LanguageContextValue>(() => ({
        language,
        setLanguage,
        toggleLanguage,
        t: (key: string) => TRANSLATIONS[language][key] || TRANSLATIONS.en[key] || key,
    }), [language]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

