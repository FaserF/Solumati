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
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    // Completely disabled (Maintenance mode or global registration off)
    if (!registrationEnabled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <img src="/logo/android-chrome-192x192.png" alt="Solumati" className="w-16 h-16 mx-auto mb-4 rounded-xl shadow-md grayscale" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('register.disabled_title')}</h2>
                    <p className="text-gray-600 mb-6">
                        {t('register.disabled_msg')}
                    </p>
                    <button onClick={onBack} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition">
                        {t('register.btn_back_home')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg h-auto max-h-screen overflow-y-auto">
                <div className="text-center mb-6">
                    <img src="/logo/android-chrome-192x192.png" alt="Solumati" className="w-14 h-14 mx-auto mb-2 rounded-xl shadow-sm" />
                    <h2 className="text-2xl font-bold text-gray-800">{t('register.title')}</h2>
                </div>

                {/* OAuth Section */}
                {(oauthConfig.github || oauthConfig.google || oauthConfig.microsoft) && (
                    <div className="mb-8">
                        <div className="flex flex-col gap-3">
                            {oauthConfig.github && (
                                <button onClick={() => handleOAuth('github')} className="bg-[#24292e] text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition">
                                    <Github size={20} /> Register with GitHub
                                </button>
                            )}
                            {oauthConfig.google && (
                                <button onClick={() => handleOAuth('google')} className="bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
                                    <span className="font-bold text-red-500">G</span> Register with Google
                                </button>
                            )}
                            {oauthConfig.microsoft && (
                                <button onClick={() => handleOAuth('microsoft')} className="bg-[#00a4ef] text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition">
                                    <span className="font-bold">MS</span> Register with Microsoft
                                </button>
                            )}
                        </div>

                        {allowPassword && (
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or register with email</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!allowPassword && (
                    <p className="text-center text-gray-500 mb-6 italic">
                        Password registration is disabled. Please use one of the providers above.
                    </p>
                )}

                {allowPassword && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('label.realname')}</label>
                            <input className="w-full p-3 border rounded-lg" placeholder="Max" value={realName} onChange={e => setRealName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('label.email')}</label>
                            <input className="w-full p-3 border rounded-lg" placeholder="max@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('label.password')}</label>
                            <input className="w-full p-3 border rounded-lg" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        <div className="pt-4">
                            <h3 className="font-bold text-gray-700 mb-2">{t('header.personality')}</h3>
                            {questions.map(q => (
                                <div key={q.id} className="mb-3 bg-gray-50 p-3 rounded">
                                    <p className="text-sm mb-2">{q.text}</p>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={answers[q.id] || 3}
                                        className="w-full accent-pink-600 cursor-pointer"
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: parseInt(e.target.value) }))}
                                    />
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>{t('scale.no', 'No')}</span><span>{t('scale.yes', 'Yes')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={onRegister} className="w-full mt-6 bg-pink-600 text-white py-4 rounded-lg font-bold hover:bg-pink-700 transition shadow-lg">
                            {t('btn.register_now')}
                        </button>
                    </div>
                )}


                <button onClick={onBack} className="w-full mt-2 text-sm text-gray-500">
                    {t('btn.cancel')}
                </button>
            </div>
        </div>
    );
};

export default Register;