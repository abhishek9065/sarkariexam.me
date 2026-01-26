import { createContext, useContext, useMemo, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'bho' | 'mai';

type TranslationMap = Record<string, string>;

const translations: Record<Language, TranslationMap> = {
    en: {
        'nav.home': 'Home',
        'nav.job': 'Jobs',
        'nav.result': 'Result',
        'nav.admit-card': 'Admit Card',
        'nav.answer-key': 'Answer Key',
        'nav.admission': 'Admission',
        'nav.syllabus': 'Syllabus',
        'nav.bookmarks': '❤️ My Bookmarks',
        'nav.community': 'Community',
        'nav.search': 'Search',
        'nav.profile': 'Profile',
        'nav.login': 'Login',
        'hero.eyebrow': 'Government job information aggregator',
        'hero.title': 'Centralized job notifications from official sources.',
        'hero.subtitle': 'We aggregate information from government websites and public notifications. Always verify details from original sources before applying.',
        'hero.browseJobs': 'Browse Jobs',
        'hero.latestResults': 'Latest Results',
        'hero.pill.admit': 'Admit Cards',
        'hero.pill.answer': 'Answer Keys',
        'hero.pill.syllabus': 'Syllabus',
        'hero.pill.admission': 'Admissions',
        'featured.heading': 'Quick Access Categories',
        'sections.title': 'Latest Government Notifications',
        'sections.subtitle': 'Browse by category to find relevant opportunities',
        'section.viewMore': 'View More',
        'section.noItems': 'No items available at the moment.',
        'category.listings': 'listings',
        'category.saveTitle': 'Save this search',
        'category.saveHint': 'Get alerts when matching posts arrive.',
        'category.saveAction': 'Save search',
        'category.saveNeedFilters': 'Add a keyword or filter before saving.',
        'category.saveSuccess': 'Saved! You will see alerts in your profile.',
        'category.saveError': 'Unable to save this search.',
        'category.noMatches': 'No items match your filters.',
        'detail.notFoundTitle': 'Not Found',
        'detail.notFoundBody': "The item you're looking for doesn't exist.",
        'detail.goHome': 'Go Home',
        'footer.company': 'Company Information',
        'footer.about': 'About Us',
        'footer.contact': 'Contact Us',
        'footer.privacy': 'Privacy Policy',
        'footer.disclaimer': 'Disclaimer',
        'footer.sources': 'Information Sources',
        'footer.quickAccess': 'Quick Access',
        'footer.latestJobs': 'Latest Jobs',
        'footer.results': 'Results',
        'footer.admit': 'Admit Cards',
        'footer.answer': 'Answer Keys',
        'footer.disclaimerTitle': 'Important Disclaimer:',
        'footer.legalNotice': 'Always verify information from official sources before applying.',
    },
    hi: {
        'nav.home': 'होम',
        'nav.job': 'नौकरियाँ',
        'nav.result': 'परिणाम',
        'nav.admit-card': 'प्रवेश पत्र',
        'nav.answer-key': 'उत्तर कुंजी',
        'nav.admission': 'प्रवेश',
        'nav.syllabus': 'सिलेबस',
        'nav.bookmarks': '❤️ मेरे बुकमार्क',
        'nav.community': 'समुदाय',
        'nav.search': 'खोजें',
        'nav.profile': 'प्रोफ़ाइल',
        'nav.login': 'लॉगिन',
        'hero.eyebrow': 'सरकारी नौकरी सूचना केंद्र',
        'hero.title': 'आधिकारिक स्रोतों से केंद्रीकृत सूचनाएँ।',
        'hero.subtitle': 'हम सरकारी वेबसाइटों और सार्वजनिक सूचनाओं से जानकारी एकत्र करते हैं। आवेदन से पहले आधिकारिक स्रोत से सत्यापन करें।',
        'hero.browseJobs': 'नौकरियाँ देखें',
        'hero.latestResults': 'लेटेस्ट परिणाम',
        'hero.pill.admit': 'प्रवेश पत्र',
        'hero.pill.answer': 'उत्तर कुंजी',
        'hero.pill.syllabus': 'सिलेबस',
        'hero.pill.admission': 'प्रवेश',
        'featured.heading': 'त्वरित पहुँच श्रेणियाँ',
        'sections.title': 'नवीनतम सरकारी सूचनाएँ',
        'sections.subtitle': 'श्रेणी के अनुसार अवसर देखें',
        'section.viewMore': 'और देखें',
        'section.noItems': 'इस समय कोई आइटम उपलब्ध नहीं है।',
        'category.listings': 'लिस्टिंग',
        'category.saveTitle': 'यह खोज सहेजें',
        'category.saveHint': 'नए मिलते-जुलते पोस्ट आने पर अलर्ट पाएँ।',
        'category.saveAction': 'खोज सहेजें',
        'category.saveNeedFilters': 'सहेजने से पहले कीवर्ड या फ़िल्टर जोड़ें।',
        'category.saveSuccess': 'सहेजा गया! प्रोफ़ाइल में अलर्ट मिलेंगे।',
        'category.saveError': 'खोज सहेज नहीं पाए।',
        'category.noMatches': 'आपके फ़िल्टर से कोई परिणाम नहीं मिला।',
        'detail.notFoundTitle': 'नहीं मिला',
        'detail.notFoundBody': 'यह आइटम उपलब्ध नहीं है।',
        'detail.goHome': 'होम जाएँ',
        'footer.company': 'कंपनी जानकारी',
        'footer.about': 'हमारे बारे में',
        'footer.contact': 'संपर्क करें',
        'footer.privacy': 'गोपनीयता नीति',
        'footer.disclaimer': 'अस्वीकरण',
        'footer.sources': 'जानकारी के स्रोत',
        'footer.quickAccess': 'त्वरित पहुँच',
        'footer.latestJobs': 'नौकरियाँ',
        'footer.results': 'परिणाम',
        'footer.admit': 'प्रवेश पत्र',
        'footer.answer': 'उत्तर कुंजी',
        'footer.disclaimerTitle': 'महत्वपूर्ण अस्वीकरण:',
        'footer.legalNotice': 'आवेदन से पहले आधिकारिक स्रोत से सत्यापन करें।',
    },
    bho: {
        'nav.home': 'घर',
        'nav.job': 'नौकरी',
        'nav.result': 'परिणाम',
        'nav.admit-card': 'एडमिट कार्ड',
        'nav.answer-key': 'उत्तर कुंजी',
        'nav.admission': 'प्रवेश',
        'nav.syllabus': 'सिलेबस',
        'nav.bookmarks': '❤️ हमार बुकमार्क',
        'nav.community': 'समुदाय',
        'nav.search': 'खोजी',
        'nav.profile': 'प्रोफाइल',
        'nav.login': 'लॉगिन',
        'hero.eyebrow': 'सरकारी नौकरी जानकारी केंद्र',
        'hero.title': 'आधिकारिक स्रोत से केंद्रीकृत सूचना।',
        'hero.subtitle': 'हम सरकारी वेबसाइटन आ सार्वजनिक सूचना से जानकारी जुटावत बानी। आवेदन से पहिले आधिकारिक स्रोत देखीं।',
        'hero.browseJobs': 'नौकरी देखीं',
        'hero.latestResults': 'नया परिणाम',
        'hero.pill.admit': 'एडमिट कार्ड',
        'hero.pill.answer': 'उत्तर कुंजी',
        'hero.pill.syllabus': 'सिलेबस',
        'hero.pill.admission': 'प्रवेश',
        'featured.heading': 'झटपट श्रेणी',
        'sections.title': 'नया सरकारी सूचना',
        'sections.subtitle': 'श्रेणी अनुसार अवसर खोजीं',
        'section.viewMore': 'आउर देखीं',
        'section.noItems': 'अभी कौनो आइटम नइखे।',
        'category.listings': 'लिस्टिंग',
        'category.saveTitle': 'ई खोज सेव करीं',
        'category.saveHint': 'नया मिलान वाला पोस्ट आवे पर अलर्ट पाईब।',
        'category.saveAction': 'खोज सेव करीं',
        'category.saveNeedFilters': 'सेव करे से पहिले कीवर्ड या फिल्टर जोड़ीं।',
        'category.saveSuccess': 'सेव हो गइल! प्रोफाइल में अलर्ट मिली।',
        'category.saveError': 'खोज सेव नइखे हो सकल।',
        'category.noMatches': 'रउआ फिल्टर से कौनो परिणाम नइखे।',
        'detail.notFoundTitle': 'नइखे मिलल',
        'detail.notFoundBody': 'जे आइटम खोजत बानी उ उपलब्ध नइखे।',
        'detail.goHome': 'घर जाईं',
        'footer.company': 'कंपनी जानकारी',
        'footer.about': 'हमनी के बारे में',
        'footer.contact': 'संपर्क',
        'footer.privacy': 'गोपनीयता नीति',
        'footer.disclaimer': 'अस्वीकरण',
        'footer.sources': 'जानकारी के स्रोत',
        'footer.quickAccess': 'झटपट पहुँच',
        'footer.latestJobs': 'नौकरी',
        'footer.results': 'परिणाम',
        'footer.admit': 'एडमिट कार्ड',
        'footer.answer': 'उत्तर कुंजी',
        'footer.disclaimerTitle': 'जरूरी अस्वीकरण:',
        'footer.legalNotice': 'आवेदन से पहिले आधिकारिक स्रोत देखीं।',
    },
    mai: {
        'nav.home': 'घर',
        'nav.job': 'नौकरी',
        'nav.result': 'परिणाम',
        'nav.admit-card': 'एडमिट कार्ड',
        'nav.answer-key': 'उत्तर कुंजी',
        'nav.admission': 'प्रवेश',
        'nav.syllabus': 'सिलेबस',
        'nav.bookmarks': '❤️ हमर बुकमार्क',
        'nav.community': 'समुदाय',
        'nav.search': 'खोजू',
        'nav.profile': 'प्रोफाइल',
        'nav.login': 'लॉगिन',
        'hero.eyebrow': 'सरकारी नौकरी जानकारी केंद्र',
        'hero.title': 'आधिकारिक स्रोत सँ केंद्रीकृत सूचना।',
        'hero.subtitle': 'हम सरकारी वेबसाइट आ सार्वजनिक सूचना सँ जानकारी जुटाइ छी। आवेदन सँ पहिने आधिकारिक स्रोत जरूर देखू।',
        'hero.browseJobs': 'नौकरी देखू',
        'hero.latestResults': 'नव परिणाम',
        'hero.pill.admit': 'एडमिट कार्ड',
        'hero.pill.answer': 'उत्तर कुंजी',
        'hero.pill.syllabus': 'सिलेबस',
        'hero.pill.admission': 'प्रवेश',
        'featured.heading': 'त्वरित श्रेणी',
        'sections.title': 'नव सरकारी सूचना',
        'sections.subtitle': 'श्रेणी अनुसार अवसर देखू',
        'section.viewMore': 'आओर देखू',
        'section.noItems': 'एखन कोनो आइटम उपलब्ध नहि अछि।',
        'category.listings': 'लिस्टिंग',
        'category.saveTitle': 'ई खोज सहेजूं',
        'category.saveHint': 'मेल खाइत पोस्ट आए पर अलर्ट पाबू।',
        'category.saveAction': 'खोज सहेजूं',
        'category.saveNeedFilters': 'सहेजबा से पहिले कीवर्ड वा फिल्टर जोड़ू।',
        'category.saveSuccess': 'सहेजल गेल! प्रोफाइल मे अलर्ट भेटत।',
        'category.saveError': 'खोज सहेज नहि सकल।',
        'category.noMatches': 'अहाँक फिल्टर सँ कोनो परिणाम नहि भेटल।',
        'detail.notFoundTitle': 'नहि भेटल',
        'detail.notFoundBody': 'जे आइटम खोजि रहल छी, ओ उपलब्ध नहि अछि।',
        'detail.goHome': 'घर जाउ',
        'footer.company': 'कंपनी जानकारी',
        'footer.about': 'हमर बारे मे',
        'footer.contact': 'सम्पर्क',
        'footer.privacy': 'गोपनीयता नीति',
        'footer.disclaimer': 'अस्वीकरण',
        'footer.sources': 'जानकारी स्रोत',
        'footer.quickAccess': 'त्वरित पहुँच',
        'footer.latestJobs': 'नौकरी',
        'footer.results': 'परिणाम',
        'footer.admit': 'एडमिट कार्ड',
        'footer.answer': 'उत्तर कुंजी',
        'footer.disclaimerTitle': 'महत्वपूर्ण अस्वीकरण:',
        'footer.legalNotice': 'आवेदन सँ पहिने आधिकारिक स्रोत देखू।',
    },
};

const DEFAULT_LANG: Language = 'en';
const STORAGE_KEY = 'preferredLanguage';

type LanguageContextValue = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const getInitialLanguage = (): Language => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
        if (stored && translations[stored]) return stored;
    } catch {
        // ignore storage errors
    }

    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('hi')) return 'hi';
    return DEFAULT_LANG;
};

const getTranslation = (lang: Language, key: string) => {
    return translations[lang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>(getInitialLanguage());

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch {
            // ignore storage errors
        }
    }, [language]);

    const value = useMemo<LanguageContextValue>(() => ({
        language,
        setLanguage,
        t: (key: string) => getTranslation(language, key),
    }), [language]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
