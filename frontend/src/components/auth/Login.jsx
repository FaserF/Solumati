import { useState } from 'react';
import { Github, Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useNavigate } from 'react-router-dom';
import { API_URL, APP_NAME } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useI18n } from '../../context/I18nContext';

const Login = () => {
    const { t } = useI18n();
    const { globalConfig } = useConfig();
    const { login, finalizeLogin } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Config fallback
    const oauth = globalConfig?.oauth_providers || {};

    const handleOAuth = (provider) => {
        window.location.href = `${API_URL}/auth/oauth/${provider}/login`;
    };

    const handleLogin = async () => {
        const result = await login(email, password);
        if (result.status === 'success') {
            navigate('/dashboard');
        } else if (result.status === '2fa') {
            navigate('/verify-2fa');
        } else {
            const errVal = result.error?.detail || JSON.stringify(result.error);
            alert(t('alert.login_failed', "Login failed: ") + errVal);
        }
    };

    const handlePasskeyLogin = async () => {
        if (!email) { alert("Please enter your username/email first."); return; }

        try {
            // Get Options
            const res = await fetch(`${API_URL}/auth/2fa/webauthn/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email })
            });

            if (!res.ok) {
                const err = await res.json();
                alert("Error: " + (err.detail || "User not found or no passkey."));
                return;
            }

            const data = await res.json();

            // Start Auth
            const asseResp = await startAuthentication(data.options);

            // Verify
            const verifyRes = await fetch(`${API_URL}/auth/2fa/webauthn/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: data.user_id, credential: asseResp })
            });

            if (verifyRes.ok) {
                const userData = await verifyRes.json();
                finalizeLogin(userData); // Use context method
                navigate('/dashboard');
            } else {
                alert("Passkey verification failed.");
            }
        } catch (e) {
            console.error(e);
            alert("Passkey Error: " + e.message);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-8">
                <img src="/logo/android-chrome-192x192.png" alt={APP_NAME} className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg" />
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('login.title')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{t('login.subtitle')}</p>
            </div>

            {/* OAuth Section */}
            <div className="flex flex-col gap-3 mb-8">
                {/* GitHub */}
                <button
                    disabled={!oauth.github}
                    onClick={() => handleOAuth('github')}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${oauth.github
                        ? "bg-[#24292e] text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gray-200 dark:shadow-none"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                >
                    <Github size={20} /> {t('login.btn_github', 'Login with GitHub')}
                </button>

                {/* Google */}
                <button
                    disabled={!oauth.google}
                    onClick={() => handleOAuth('google')}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${oauth.google
                        ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                        : "bg-gray-200 dark:bg-gray-800 border border-transparent text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                >
                    <span className={`font-bold ${oauth.google ? "text-red-500" : "text-gray-400"}`}>G</span> {t('login.btn_google', 'Login with Google')}
                </button>

                {/* Microsoft */}
                <button
                    disabled={!oauth.microsoft}
                    onClick={() => handleOAuth('microsoft')}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${oauth.microsoft
                        ? "bg-[#00a4ef] text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-100 dark:shadow-none"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                >
                    <span className="font-bold">MS</span> {t('login.btn_microsoft', 'Login with Microsoft')}
                </button>

                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-wide font-bold">
                        <span className="px-3 bg-white/0 text-gray-400 dark:text-gray-500 backdrop-blur-sm">{t('login.or_email', 'Or with email')}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{t('label.email_user', 'Email or Username')}</label>
                    <input
                        className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                        placeholder="user / mail@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{t('label.password')}</label>
                    <input
                        className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                <div className="flex justify-end">
                    <button onClick={() => navigate('/forgot-password')} className="text-sm font-bold text-pink-500 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                        {t('login.forgot_pw', 'Forgot Password?')}
                    </button>
                </div>

                <button onClick={handleLogin} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200 dark:shadow-gray-900/20">
                    {t('btn.login')}
                </button>

                <button onClick={handlePasskeyLogin} className="w-full bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                    <Fingerprint /> {t('btn.login_passkey', 'Login with Passkey')}
                </button>

                <button onClick={() => navigate('/')} className="w-full py-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium transition-colors text-sm">
                    {t('btn.back')}
                </button>
            </div>
        </div>
    );
};

export default Login;