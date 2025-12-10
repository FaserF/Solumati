import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL, FALLBACK } from '../config';

const I18nContext = createContext();

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }) => {
    const [i18n, setI18n] = useState({});

    useEffect(() => {
        // Fetch Translations
        const browserLang = navigator.language;
        const shortLang = browserLang.split('-')[0] || 'en';
        console.log(`[I18n] Browser language detected: ${browserLang} -> Requesting: ${shortLang}`);

        fetch(`${API_URL}/api/i18n/${shortLang}`)
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setI18n(data.translations || {});
            })
            .catch(e => {
                console.error("[I18n] Could not load translations.", e);
            });
    }, []);

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
        <I18nContext.Provider value={{ t, i18n }}>
            {children}
        </I18nContext.Provider>
    );
};
