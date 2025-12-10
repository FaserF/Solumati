import { useState, useEffect } from 'react';

const NotificationPermission = ({ t }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if browser supports notifications
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        // Check current permission
        // We only show if permission is 'default' (not granted or denied yet)
        if (Notification.permission === 'default') {
            // Check if we have already shown it in this session or recently?
            // For now, show on every load until decision is made
            const dismissed = localStorage.getItem('notification_dismissed');
            if (!dismissed) {
                // Small delay to not overwhelm on load
                const timer = setTimeout(() => setIsVisible(true), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const handleEnable = () => {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                new Notification(t('notification.welcome_title', 'Notifications Enabled!'), {
                    body: t('notification.welcome_body', 'You will now receive updates about matches and messages.'),
                    icon: '/pwa-192x192.png'
                });
            }
            setIsVisible(false);
        });
    };

    const handleLater = () => {
        setIsVisible(false);
        // Persist dismissal to avoid annoying user instantly again?
        // Let's set a flag in local storage
        localStorage.setItem('notification_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-auto border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        🔔
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('notification.title', 'Enable Notifications?')}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                        {t('notification.explanation', 'Get instant updates when you receive new matches or messages. We promise not to spam you!')}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleEnable}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all duration-200"
                        >
                            {t('notification.enable', 'Enable Notifications')}
                        </button>

                        <button
                            onClick={handleLater}
                            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                        >
                            {t('notification.later', 'Maybe Later')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationPermission;
