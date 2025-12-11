import { Github, Scale, AlertTriangle, Info, Smartphone, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { APP_VERSION, APP_RELEASE_TYPE } from '../config';
import { useConfig } from '../context/ConfigContext';

// Render Banner Helper
const AppBanner = ({ icon: Icon, title, sub, onClick, color }) => (
    <a
        href="#"
        onClick={(e) => { e.preventDefault(); onClick(); }}
        className={`mb-8 flex items-center gap-2 ${color} text-white px-6 py-3 rounded-xl hover:scale-105 transition shadow-lg animate-bounce`}
    >
        <Icon size={24} />
        <div className="text-left">
            <div className="font-bold text-sm">{title}</div>
            <div className="text-xs opacity-90">{sub}</div>
        </div>
    </a>
);

const Landing = () => {
    const { t } = useI18n();
    const { guestLogin } = useAuth();
    const navigate = useNavigate();

    const onLogin = () => navigate('/login');
    const onRegister = () => navigate('/register');
    // const onAdmin = () => navigate('/login');  // Unused
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
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black opacity-90"></div>

            <div className="z-10 text-center max-w-3xl flex flex-col items-center flex-grow justify-center">
                <div className="mb-6 w-32 h-32 md:w-48 md:h-48 relative animate-pulse">
                    <img src="/logo/Solumati.png" alt="Solumati Logo" className="w-full h-full object-contain drop-shadow-2xl" />
                </div>

                <h1 className="text-6xl md:text-8xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse">
                    {t('app.title')}
                </h1>
                <p className="text-xl md:text-2xl text-gray-300 mb-12 font-light">
                    {t('landing.tagline')}
                </p>

                {showAndroidCta && (
                    <AppBanner
                        platform="android"
                        icon={Smartphone}
                        title={t('landing.get_android', "Get the Android App")}
                        sub={t('landing.download_apk', "Download APK")}
                        onClick={() => handleDownload('android')}
                        color="bg-gradient-to-r from-green-500 to-emerald-600"
                    />
                )}
                {showIOSCta && (
                    <AppBanner
                        platform="ios"
                        icon={Smartphone}
                        title={t('landing.get_ios', "Get the iOS App")}
                        sub={t('landing.download_ipa', "Download IPA (AltStore)")}
                        onClick={() => handleDownload('ios')}
                        color="bg-gradient-to-r from-blue-500 to-blue-600"
                    />
                )}
                {showWindowsCta && (
                    <AppBanner
                        platform="windows"
                        icon={Monitor}
                        title={t('landing.get_windows', "Get the Windows App")}
                        sub={t('landing.download_msix', "Download App")}
                        onClick={() => handleDownload('windows')}
                        color="bg-gradient-to-r from-blue-600 to-indigo-600"
                    />
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mx-auto mb-8">
                    <button onClick={onLogin} className="bg-white text-gray-900 font-bold py-3 px-6 rounded-full hover:scale-105 transition transform shadow-lg">
                        {t('landing.btn_login')}
                    </button>
                    <button onClick={onRegister} className="bg-transparent border-2 border-pink-500 text-pink-500 font-bold py-3 px-6 rounded-full hover:bg-pink-500 hover:text-white transition transform shadow-lg">
                        {t('landing.btn_register')}
                    </button>
                    <button onClick={onGuest} className="bg-gray-800 text-gray-400 font-medium py-3 px-6 rounded-full hover:bg-gray-700 hover:text-white transition transform border border-gray-700">
                        {t('landing.btn_guest')}
                    </button>
                </div>

                {/* Marketing Link */}
                {globalConfig.marketing_enabled && (
                    <button
                        onClick={() => navigate('/about')}
                        className="text-gray-400 hover:text-pink-400 underline underline-offset-4 transition-colors font-medium text-sm flex items-center gap-1"
                    >
                        <Info size={14} />
                        {t('landing.more_info', 'More Information')}
                    </button>
                )}
            </div>

            <div className="z-10 w-full p-6 flex justify-between items-end text-gray-500 text-xs md:text-sm">
                <div className="flex gap-4">
                    <a
                        href="https://github.com/FaserF/Solumati"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-white transition group"
                    >
                        <Github size={20} className="group-hover:text-white" />
                        <span className="hidden md:inline">{t('landing.opensource')}</span>
                    </a>
                    <button onClick={onLegal} className="hover:text-white transition flex items-center gap-1">
                        <Scale size={16} /> {t('landing.legal')}
                    </button>
                </div>

                {/* Release Status Badge (Beta / Nightly) */}
                {APP_RELEASE_TYPE && APP_RELEASE_TYPE !== 'stable' && (
                    <div className="flex flex-col items-end animate-fade-in-up">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border shadow-lg ${APP_RELEASE_TYPE === 'beta'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                            }`}>
                            {APP_RELEASE_TYPE === 'beta' ? <Info size={14} /> : <AlertTriangle size={14} />}
                            <span className="text-xs font-bold uppercase tracking-wider">
                                {APP_RELEASE_TYPE === 'beta' ? t('landing.beta_access', 'Beta Access') : 'Nightly Build'}
                            </span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-600 mt-1 mr-2 opacity-60">
                            v{APP_VERSION}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default Landing;