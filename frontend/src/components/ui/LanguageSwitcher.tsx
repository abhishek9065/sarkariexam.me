import { useLanguage, type Language } from '../../context/LanguageContext';

const LANGUAGE_LABELS: Record<Language, string> = {
    en: 'English',
    hi: 'हिंदी',
    bho: 'भोजपुरी',
    mai: 'मैथिली',
};

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <label className="language-switcher" aria-label="Select language">
            <span className="language-icon" aria-hidden="true">🌐</span>
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
            >
                {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export default LanguageSwitcher;
