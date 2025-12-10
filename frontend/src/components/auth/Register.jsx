import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useI18n } from '../../context/I18nContext';

const Register = () => {
    const { t } = useI18n();
    const { globalConfig, fetchConfig } = useConfig();
    const { register } = useAuth();
    const navigate = useNavigate();

    // Local State
    const [realName, setRealName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Config State
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const [allowPassword, setAllowPassword] = useState(true);
    const [oauthConfig, setOauthConfig] = useState({});
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Sync with globalConfig
    useEffect(() => {
        if (globalConfig) {
            setRegistrationEnabled(globalConfig.registration_enabled);
            setAllowPassword(globalConfig.allow_password_registration !== false);
            setOauthConfig(globalConfig.oauth_providers || {});
            setLoadingConfig(false);
        } else {
            // Fallback fetch if config is missing?
            // ConfigProvider handles fetching, but maybe it hasn't finished?
            // Since ConfigProvider renders children always, globalConfig might be initial state.
            // We can rely on it updating.
        }
    }, [globalConfig]);


    const handleOAuth = (provider) => {
        window.location.href = `${API_URL}/auth/oauth/${provider}/login`;
    };

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            alert(t('alert.pw_mismatch', "Passwords do not match!"));
            return;
        }

        // Hardcoded generic questions for now, since they were passed as props previously
        // Ideally we should move questions definition to a shared constant or fetch them?
        // App.jsx defined them.
        const questions = [
            { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }
        ];
        // Default answers (all 3)
        const answersArray = questions.map(q => 3);

        const payload = {
            email,
            password,
            real_name: realName,
            intent: "longterm", // Default
            answers: answersArray
        };

        const result = await register(payload);
        if (result.status === 'success') {
            alert(t('alert.welcome', `Welcome`) + `, ${result.data.username}!`);
            navigate('/dashboard');
        } else if (result.status === 'pending_verification') {
            alert(t('register.check_mail', "Account created! Please check your email to activate your account."));
            navigate('/');
        } else {
            const errVal = typeof result.error?.detail === 'object' ? JSON.stringify(result.error.detail) : result.error?.detail || JSON.stringify(result.error);
            alert(t('alert.error', "Error: ") + errVal);
        }
    };

    if (loadingConfig && !globalConfig) { // Show loading if no config at all
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    if (!registrationEnabled) {
        return (
            <div className="text-center p-8">
                <img src="/logo/android-chrome-192x192.png" alt="Solumati" className="w-16 h-16 mx-auto mb-4 rounded-xl shadow-md grayscale" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('register.disabled_title')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('register.disabled_msg')}
                </p>
                <button onClick={() => navigate('/')} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold hover:opacity-80 transition">
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
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">{t('settings.confirm_pw', 'Confirm Password')}</label>
                        <input className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                            type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>

                    <div className="pt-2">
                        {/* Hidden fields / default values for now.
                             Ideally questions should be re-implemented if needed.
                             For now, we default to 3.
                         */}
                    </div>

                    <button onClick={handleRegister} className="w-full mt-6 bg-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-pink-700 active:scale-[0.98] transition-all shadow-xl shadow-pink-500/20">
                        {t('btn.register_now')}
                    </button>
                </div>
            )}


            <button onClick={() => navigate('/')} className="w-full py-2 mt-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium transition-colors text-sm">
                {t('btn.cancel')}
            </button>
        </div>
    );
};

export default Register;