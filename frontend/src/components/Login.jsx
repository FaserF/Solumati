import React from 'react';
import { Github, Mail, Unlock } from 'lucide-react'; // Basic icons
import { API_URL } from '../config';

const Login = ({ email, setEmail, password, setPassword, onLogin, onBack, onForgotPassword, t, config }) => {

    // Fallback if config not yet loaded
    const oauth = config?.oauth_providers || {};

    const handleOAuth = (provider) => {
        window.location.href = `${API_URL}/auth/oauth/${provider}/login`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <img src="/logo/android-chrome-192x192.png" alt="Solumati" className="w-16 h-16 mx-auto mb-4 rounded-xl shadow-md" />

                <h2 className="text-3xl font-bold mb-6 text-gray-800">{t('login.title')}</h2>

                {/* OAuth Section */}
                {(oauth.github || oauth.google || oauth.microsoft) && (
                    <div className="flex flex-col gap-3 mb-6">
                        {oauth.github && (
                            <button onClick={() => handleOAuth('github')} className="bg-[#24292e] text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition">
                                <Github size={20} /> Login with GitHub
                            </button>
                        )}
                        {/* Google and MS would use their brand colors. Using generic mocks if icons missing */}
                        {oauth.google && (
                            <button onClick={() => handleOAuth('google')} className="bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition">
                                <span className="font-bold text-red-500">G</span> Login with Google
                            </button>
                        )}
                        {oauth.microsoft && (
                            <button onClick={() => handleOAuth('microsoft')} className="bg-[#00a4ef] text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition">
                                <span className="font-bold">MS</span> Login with Microsoft
                            </button>
                        )}
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-4 text-left">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('label.email_user', 'Email or Username')}</label>
                    <input
                        className="w-full p-4 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="user / mail@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onLogin()}
                    />
                </div>
                <div className="mb-2 text-left">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('label.password')}</label>
                    <input
                        className="w-full p-4 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        type="password"
                        placeholder="***"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onLogin()}
                    />
                </div>

                <div className="text-right mb-6">
                    <button onClick={onForgotPassword} className="text-xs text-pink-500 hover:text-pink-700 font-bold">
                        {t('login.forgot_pw', 'Forgot Password?')}
                    </button>
                </div>

                <button onClick={onLogin} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">
                    {t('btn.login')}
                </button>
                <button onClick={onBack} className="w-full mt-4 text-gray-500 hover:text-black transition">
                    {t('btn.back')}
                </button>
            </div>
        </div>
    );
};

export default Login;