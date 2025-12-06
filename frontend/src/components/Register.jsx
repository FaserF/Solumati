import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';

const Register = ({
    realName, setRealName,
    email, setEmail,
    password, setPassword,
    answers, setAnswers,
    questions,
    onRegister, onBack, t
}) => {
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [loadingConfig, setLoadingConfig] = useState(true);

    useEffect(() => {
        const checkConfig = async () => {
            try {
                const res = await fetch(`${API_URL}/public-config`);
                if (res.ok) {
                    const data = await res.json();
                    setRegistrationEnabled(data.registration_enabled);
                }
            } catch (e) {
                console.warn("Could not fetch config", e);
            } finally {
                setLoadingConfig(false);
            }
        };
        checkConfig();
    }, []);

    if (loadingConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
        );
    }

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
                                    <span>{t('scale.no')}</span><span>{t('scale.yes')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={onRegister} className="w-full mt-6 bg-pink-600 text-white py-4 rounded-lg font-bold hover:bg-pink-700 transition shadow-lg">
                    {t('btn.register_now')}
                </button>
                <button onClick={onBack} className="w-full mt-2 text-sm text-gray-500">
                    {t('btn.cancel')}
                </button>
            </div>
        </div>
    );
};

export default Register;