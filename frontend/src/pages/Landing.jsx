import { useState, useLayoutEffect } from 'react';
import { Github, Scale, AlertTriangle, Info, Smartphone, Monitor, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { APP_VERSION, APP_RELEASE_TYPE } from '../config';
import { useConfig } from '../context/ConfigContext';
import { Button } from '../components/ui/Button';

// Render Banner Helper with Premium UI
const AppBanner = ({ icon: Icon, title, sub, onClick, className }) => (
    <button
        onClick={(e) => { e.preventDefault(); onClick(); }}
        className={`w-full group relative mb-6 flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${className}`}
    >
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
            <Icon size={24} className="text-white bg-transparent" />
        </div>
        <div className="flex-grow text-left">
            <div className="font-bold text-base text-white">{title}</div>
            <div className="text-sm text-white/70">{sub}</div>
        </div>
        <ChevronRight className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
    </button>
);

const Landing = () => {
    const { t } = useI18n();
    const { guestLogin } = useAuth();
    const navigate = useNavigate();
    const [mounted, setMounted] = useState(false);

    // Use layoutEffect to set mounted state synchronously before paint
    useLayoutEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const onLogin = () => navigate('/login');
    const onRegister = () => navigate('/register');
    const onLegal = () => navigate('/imprint');

    const onGuest = async () => {
        const result = await guestLogin();
        if (result.status === 'success') {
            navigate('/dashboard');
        } else {
            console.error("Guest login failed", result.error);
            alert("Guest login failed");
        }
    };

    // Platform Detection
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isWindows = /windows phone/i.test(userAgent) || /windows/i.test(userAgent);

    // App Detection (via query param ?source=... or standalone mode)
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source'); // 'twa', 'ios', 'windows'
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isApp = source || isStandalone;

    const showAndroidCta = isAndroid && !isApp;
    const showIOSCta = isIOS && !isApp;
    const showWindowsCta = isWindows && !isApp;

    const handleDownload = async (platform) => {
        // Fetch latest release from GitHub and download appropriate asset
        try {
            const response = await fetch('https://api.github.com/repos/FaserF/Solumati/releases/latest');
            if (response.ok) {
                const data = await response.json();
                let asset;
                if (platform === 'android') asset = data.assets.find(a => a.name.endsWith('.apk'));
                if (platform === 'ios') asset = data.assets.find(a => a.name.endsWith('.ipa'));
                if (platform === 'windows') asset = data.assets.find(a => a.name.endsWith('.msixbundle'));

                if (asset) {
                    window.location.href = asset.browser_download_url;
                    return;
                }
            }
            window.open('https://github.com/FaserF/Solumati/releases/latest', '_blank');
        } catch (error) {
            console.error("Failed to fetch release:", error);
            window.open('https://github.com/FaserF/Solumati/releases/latest', '_blank');
        }
    };

    const { globalConfig } = useConfig();

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-zinc-950 to-zinc-950 opacity-80 z-0"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none z-0"></div>

            {/* Content Container */}
            <div className={`z-10 text-center max-w-4xl flex flex-col items-center flex-grow justify-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Logo */}
                <div className="mb-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <img src="/logo/Solumati.png" alt="Solumati Logo" className="relative w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" />
                </div>

                {/* Hero Text */}
                <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200">
                        {t('app.title')}
                    </span>
                </h1>
                <p className="text-xl md:text-2xl text-zinc-400 mb-12 font-light max-w-2xl leading-relaxed">
                    {t('landing.tagline')}
                </p>

                {/* Mobile CTAs */}
                <div className="w-full max-w-md">
                    {showAndroidCta && (
                        <AppBanner
                            platform="android"
                            icon={Smartphone}
                            title={t('landing.get_android', "Get App for Android")}
                            sub={t('landing.download_apk', "Download APK")}
                            onClick={() => handleDownload('android')}
                            className="bg-zinc-900/50 hover:bg-zinc-800/80 border-zinc-700 hover:border-emerald-500/50"
                        />
                    )}
                    {showIOSCta && (
                        <AppBanner
                            platform="ios"
                            icon={Smartphone}
                            title={t('landing.get_ios', "Get App for iOS")}
                            sub={t('landing.download_ipa', "Download for AltStore")}
                            onClick={() => handleDownload('ios')}
                            className="bg-zinc-900/50 hover:bg-zinc-800/80 border-zinc-700 hover:border-blue-500/50"
                        />
                    )}
                    {showWindowsCta && (
                        <AppBanner
                            platform="windows"
                            icon={Monitor}
                            title={t('landing.get_windows', "Get App for Windows")}
                            sub={t('landing.download_msix', "Download Installer")}
                            onClick={() => handleDownload('windows')}
                            className="bg-zinc-900/50 hover:bg-zinc-800/80 border-zinc-700 hover:border-indigo-500/50"
                        />
                    )}
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
                    <Button
                        onClick={onLogin}
                        size="lg"
                        variant="primary"
                        className="rounded-full px-8 text-lg hover:shadow-indigo-500/25 ring-offset-2 ring-offset-zinc-950"
                    >
                        {t('landing.btn_login')}
                    </Button>
                    <Button
                        onClick={onRegister}
                        size="lg"
                        variant="ghost"
                        className="rounded-full px-8 text-lg border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    >
                        {t('landing.btn_register')}
                    </Button>
                    <Button
                        onClick={onGuest}
                        size="lg"
                        variant="ghost"
                        className="rounded-full px-8 text-lg text-zinc-500 hover:text-zinc-300"
                    >
                        {t('landing.btn_guest')}
                    </Button>
                </div>

                {/* Marketing Link */}
                {globalConfig.marketing_enabled && (
                    <button
                        onClick={() => navigate('/about')}
                        className="text-zinc-500 hover:text-indigo-400 transition-colors font-medium text-sm flex items-center gap-2 group"
                    >
                        <Info size={16} />
                        <span className="underline underline-offset-4">{t('landing.more_info', 'Learn more about Solumati')}</span>
                        <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="z-10 w-full p-6 flex justify-between items-end border-t border-zinc-800/50 backdrop-blur-sm">
                <div className="flex gap-6 text-zinc-400 text-sm">
                    <a
                        href="https://github.com/FaserF/Solumati"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-white transition group"
                    >
                        <Github size={18} className="group-hover:text-white" />
                        <span className="hidden md:inline">{t('landing.opensource')}</span>
                    </a>

                    {globalConfig?.support_page?.enabled !== false && (
                        <button onClick={() => navigate('/support')} className="hover:text-white transition flex items-center gap-2">
                            <Monitor size={18} /> {t('landing.support', 'Support')}
                        </button>
                    )}

                    {(globalConfig?.legal?.enabled_imprint !== false || globalConfig?.legal?.enabled_privacy !== false) && (
                        <button onClick={onLegal} className="hover:text-white transition flex items-center gap-2">
                            <Scale size={18} /> {t('landing.legal')}
                        </button>
                    )}
                </div>

                {/* Release Status Badge */}
                {APP_RELEASE_TYPE && APP_RELEASE_TYPE !== 'stable' && (
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${APP_RELEASE_TYPE === 'beta'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                            : 'bg-orange-500/10 border-orange-500/20 text-orange-200'
                            }`}>
                            {APP_RELEASE_TYPE === 'beta' ? <Info size={12} /> : <AlertTriangle size={12} />}
                            {APP_RELEASE_TYPE === 'beta' ? t('landing.beta_access', 'Beta') : 'Nightly'}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600 mt-1">
                            v{APP_VERSION}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Landing;