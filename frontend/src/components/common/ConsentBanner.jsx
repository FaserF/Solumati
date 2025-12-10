import { useState, useEffect } from 'react';
import { Cookie, Shield, X } from 'lucide-react';

const ConsentBanner = ({ t, onNavigate }) => {
    // const { t } = useTranslation(); // Removed dependency
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Small delay for smooth entrance
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = (type) => {
        localStorage.setItem('cookie_consent', type);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-slide-up">
            <div className="max-w-4xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6 flex flex-col md:flex-row items-center gap-6">

                {/* Icon */}
                <div className="p-3 bg-pink-50 dark:bg-pink-500/10 rounded-xl hidden md:block">
                    <Cookie className="text-pink-500" size={32} />
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center md:justify-start gap-2">
                        <span className="md:hidden"><Cookie size={20} className="text-pink-500" /></span>
                        Cookies & Privacy
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 md:mb-0">
                        {t('cookie.text', 'We use cookies to ensure you get the best experience on our website.')}
                        <br className="hidden md:block" />
                        <span className="text-xs mt-1 block">
                            <button onClick={() => onNavigate('privacy')} className="text-pink-600 hover:underline bg-transparent border-0 p-0 cursor-pointer">{t('cookie.privacy_link')}</button> •
                            <button onClick={() => onNavigate('imprint')} className="text-pink-600 hover:underline bg-transparent border-0 p-0 cursor-pointer ml-1">{t('cookie.imprint_link')}</button>
                        </span>
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={() => handleAccept('essential')}
                        className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                        {t('cookie.essential_only', 'Essential Only')}
                    </button>
                    <button
                        onClick={() => handleAccept('all')}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-pink-500/20 whitespace-nowrap"
                    >
                        {t('cookie.accept_all', 'Accept All')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsentBanner;
