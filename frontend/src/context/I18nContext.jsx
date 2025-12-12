import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL, FALLBACK } from '../config';

const I18nContext = createContext();

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }) => {
    const [i18n, setI18n] = useState({});
    const [language, setLanguage] = useState(localStorage.getItem('app_lang') || navigator.language.split('-')[0] || 'en');

    const fetchTranslations = (lang) => {
        console.log(`[I18n] Fetching translations for: ${lang}`);
        fetch(`${API_URL}/api/i18n/${lang}`)
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setI18n(data.translations || {});
                setLanguage(lang);
                localStorage.setItem('app_lang', lang);
                document.documentElement.lang = lang;
            })
            .catch(e => {
                console.error("[I18n] Could not load translations.", e);
                // Fallback to EN if failed
                if (lang !== 'en') fetchTranslations('en');
            });
    };

    useEffect(() => {
        fetchTranslations(language);
    }, []); // Only on mount, we use changeLanguage for updates

    const changeLanguage = (lang) => {
        fetchTranslations(lang);
    };

    const t = (key, defaultText = "") => {
        // 1. Try Exact Match (Legacy flat keys like "app.title")
        if (i18n[key]) return i18n[key];

        // 2. Try Nested Match (New keys like "cookie.text")
        const keys = key.split('.');
        let value = i18n;
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) break;
        }
        if (value && typeof value === 'string') return value;

        // 3. Fallback Exact Match
        if (FALLBACK[key]) return FALLBACK[key];

        // 4. Fallback Nested Match
        let fallback = FALLBACK;
        for (const k of keys) {
            fallback = fallback?.[k];
            if (fallback === undefined) break;
        }

        return (fallback && typeof fallback === 'string') ? fallback : (defaultText || key);
    };

    return (
        <I18nContext.Provider value={{ t, i18n, language, changeLanguage }}>
            {children}
        </I18nContext.Provider>
    );
};
