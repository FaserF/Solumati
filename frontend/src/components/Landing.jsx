import { Lock, Github, Heart, Scale, AlertTriangle, Beaker, Info, Smartphone } from 'lucide-react';
import { APP_VERSION, APP_RELEASE_TYPE } from '../config';

const Landing = ({ onLogin, onRegister, onGuest, onAdmin, onLegal, t }) => {
    const isAndroid = /Android/i.test(navigator.userAgent);

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

                {isAndroid && (
                    <a
                        href="https://github.com/FaserF/Solumati/releases/latest"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-8 flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:scale-105 transition shadow-lg animate-bounce"
                    >
                        <Smartphone size={24} />
                        <div className="text-left">
                            <div className="font-bold text-sm">{t('landing.get_android', "Get the Android App")}</div>
                            <div className="text-xs opacity-90">{t('landing.download_apk', "Download APK")}</div>
                        </div>
                    </a>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mx-auto">
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
        </div>
    );
};

export default Landing;