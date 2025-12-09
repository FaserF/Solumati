import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Github } from 'lucide-react';

const Register = ({
    realName, setRealName,
    email, setEmail,
    password, setPassword,
    answers, setAnswers,
    questions,
    onRegister, onBack, t, config
}) => {
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [allowPassword, setAllowPassword] = useState(true);
    const [loadingConfig, setLoadingConfig] = useState(!config);
    const [oauthConfig, setOauthConfig] = useState(config?.oauth_providers || {});

    useEffect(() => {
        if (config) {
            setRegistrationEnabled(config.registration_enabled);
            setAllowPassword(config.allow_password_registration !== false); // Default to true if undefined
            setOauthConfig(config.oauth_providers);
            setLoadingConfig(false);
            return;
        }

        const checkConfig = async () => {
            try {
                const res = await fetch(`${API_URL}/public-config`);
                if (res.ok) {
                    const data = await res.json();
                    setRegistrationEnabled(data.registration_enabled);
                    setAllowPassword(data.allow_password_registration !== false);
                    setOauthConfig(data.oauth_providers || {});
                }
            } catch (e) {
                console.warn("Could not fetch config", e);
            } finally {
                setLoadingConfig(false);
            }
        };
        checkConfig();
    }, [config]);

    const handleOAuth = (provider) => {
        window.location.href = `${API_URL}/auth/oauth/${provider}/login`;
    };

    if (loadingConfig) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    // Completely disabled
    if (!registrationEnabled) {
        return (
            <div className="text-center p-8">
                <img src="/logo/android-chrome-192x192.png" alt="Solumati" className="w-16 h-16 mx-auto mb-4 rounded-xl shadow-md grayscale" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('register.disabled_title')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('register.disabled_msg')}
                </p>
                <button onClick={onBack} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold hover:opacity-80 transition">
                    {t('register.btn_back_home')}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
            <div className="text-center mb-8">
                <img src="/logo/android-chrome-192x192.png" alt="Solumati" className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg" />
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('register.title')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Create your account to start matching.</p>
            </div>

            {/* OAuth Section */}
            {(oauthConfig.github || oauthConfig.google || oauthConfig.microsoft) && (
                <div className="mb-8">
                    <div className="flex flex-col gap-3">
                        {oauthConfig.github && (
                            <button onClick={() => handleOAuth('github')} className="bg-[#24292e] text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-gray-200 dark:shadow-none">
                                <Github size={20} /> Register with GitHub
                            </button>
                        )}
                        {oauthConfig.google && (
                            <button onClick={() => handleOAuth('google')} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                                <span className="font-bold text-red-500">G</span> Register with Google
                            </button>
                        )}
                        {oauthConfig.microsoft && (
                            <button onClick={() => handleOAuth('microsoft')} className="bg-[#00a4ef] text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-100 dark:shadow-none">
                                <span className="font-bold">MS</span> Register with Microsoft
                            </button>
                        )}
                    </div>

                    {allowPassword && (
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-wide font-bold">
                                <span className="px-3 bg-white/0 text-gray-400 dark:text-gray-500 backdrop-blur-sm">Or with email</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!allowPassword && (
                <p className="text-center text-gray-500 mb-6 italic text-sm">
                    Password registration is disabled. Please use one of the providers above.
                </p>
            )}

            {allowPassword && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{t('label.realname')}</label>
                        <input className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                            placeholder="Max" value={realName} onChange={e => setRealName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{t('label.email')}</label>
                        <input className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                            placeholder="max@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{t('label.password')}</label>
                        <input className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                            type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    <div className="pt-6">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 ml-1">{t('header.personality')}</h3>
                        {questions.map(q => (
                            <div key={q.id} className="mb-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-transparent dark:border-white/5">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{q.text}</p>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={answers[q.id] || 3}
                                    className="w-full accent-pink-600 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none dark:bg-gray-700"
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: parseInt(e.target.value) }))}
                                />
                                <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase">
                                    <span>{t('scale.no', 'No')}</span><span>{t('scale.yes', 'Yes')}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={onRegister} className="w-full mt-6 bg-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-pink-700 active:scale-[0.98] transition-all shadow-xl shadow-pink-500/20">
                        {t('btn.register_now')}
                    </button>
                </div>
            )}


            <button onClick={onBack} className="w-full py-2 mt-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium transition-colors text-sm">
                {t('btn.cancel')}
            </button>
        </div>
    );
};

export default Register;