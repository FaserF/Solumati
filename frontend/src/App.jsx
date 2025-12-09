import React, { useState, useEffect } from 'react';
import { API_URL, FALLBACK } from './config';
import { ThemeProvider } from './components/ThemeContext';

// Import Components
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import AccountSettings from './components/AccountSettings';
import Legal from './components/Legal';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import TwoFactorAuth from './components/TwoFactorAuth';
import Discover from './components/Discover';
import Questionnaire from './components/Questionnaire';

// Import Extracted Components
import MaintenancePage from './components/MaintenancePage';
import VerificationBanner from './components/common/VerificationBanner';
import AuthLayout from './components/layout/AuthLayout';

function App() {
    // --- Global State ---
    const [view, setView] = useState('landing');
    const [user, setUser] = useState(null);
    const [matches, setMatches] = useState([]);
    const [isGuest, setIsGuest] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    // Global Config
    const [globalConfig, setGlobalConfig] = useState({
        test_mode: false,
        registration_enabled: true,
        email_2fa_enabled: false,
        legal: {}
    });

    // --- 2FA State ---
    const [tempAuth, setTempAuth] = useState(null);

    // --- Form State ---
    const [emailOrUser, setEmailOrUser] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [realName, setRealName] = useState("");
    const [intent, setIntent] = useState("longterm");
    const [answers, setAnswers] = useState({});

    // --- Verification & Reset State ---
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [verificationMsg, setVerificationMsg] = useState("");
    const [resetToken, setResetToken] = useState(null);
    const [maintenanceReason, setMaintenanceReason] = useState('startup');

    // --- I18n State ---
    const [i18n, setI18n] = useState({});

    const t = (key, defaultText = "") => {
        return i18n[key] || FALLBACK[key] || defaultText || key;
    };

    // --- Startup: Verification, I18n, Config ---
    useEffect(() => {
        const fetchConfig = () => {
            fetch(`${API_URL}/public-config`)
                .then(res => {
                    if (res.status === 503) {
                        setMaintenanceMode(true);
                        setMaintenanceReason('startup');
                        throw new Error("Maintenance Mode");
                    }
                    return res.json();
                })
                .then(data => {
                    setGlobalConfig(data);
                    if (data.maintenance_mode) {
                        setMaintenanceMode(true);
                        setMaintenanceReason('manual');
                    } else if (maintenanceMode) {
                        setMaintenanceMode(false);
                    }
                })
                .catch(e => {
                    console.error("Config fetch error", e);
                    if (e.message === "Maintenance Mode" || e.name === "TypeError") {
                        setMaintenanceMode(true);
                        setMaintenanceReason('startup');
                    }
                });
        };

        // Initial Fetch
        fetchConfig();

        // Polling if in maintenance mode (every 5 seconds)
        let interval;
        if (maintenanceMode) {
            interval = setInterval(fetchConfig, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [maintenanceMode]);

    // --- Translations & URL Handling (Run Once) ---
    useEffect(() => {
        // Fetch Translations
        const browserLang = navigator.language;
        const shortLang = browserLang.split('-')[0] || 'en';
        console.log(`[App] Browser language detected: ${browserLang} -> Requesting: ${shortLang}`);

        fetch(`${API_URL}/api/i18n/${shortLang}`)
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setI18n(data.translations || {});
            })
            .catch(e => {
                console.error("[App] Could not load translations.", e);
            });

        // --- URL Param Handling (Verify & Reset) ---
        const params = new URLSearchParams(window.location.search);

        // 1. Password Reset Token
        const rToken = params.get('reset_token');
        if (rToken) {
            setResetToken(rToken);
            setView('reset_pw');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        // 2. Verification
        const verifyId = params.get('id');
        const verifyCode = params.get('code');

        if (verifyId && verifyCode) {
            setVerificationStatus('loading');
            fetch(`${API_URL}/verify?id=${verifyId}&code=${verifyCode}`, { method: 'POST' })
                .then(async res => {
                    const data = await res.json();
                    if (res.ok) {
                        setVerificationStatus('success');
                        setVerificationMsg(t('verify.success', 'Email successfully verified!'));
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        // Handle OAuth verify redirect
                        finishLogin(data);
                        // Note: finishLogin is defined below, this might be hoisting-dependent or cause issue if defined later.
                        // Check definition order. finishLogin is const, so not hoisted.
                        // Actually, finishLogin relies on state setters.
                        // REFACTOR: We might need to move this logic or ensure finishLogin is available.
                        // In the original code, `finishLogin` was defined AFTER this useEffect.
                        // React components function body runs top-down. `useEffect` callback runs AFTER render.
                        // So checking `finishLogin` inside `useEffect` is fine as long as `finishLogin` is defined in the component scope.
                    }
                });
        }
    }, []);


    const questions = [
        { id: 0, text: t('q.0', "I prefer quiet evenings.") },
        { id: 1, text: t('q.1', "Career is more important than family.") },
        { id: 2, text: t('q.2', "Faith/Spirituality is important to me.") },
        { id: 3, text: t('q.3', "I enjoy discussing politics.") }
    ];

    // Helper to finalize login (used by handleLogin and 2FA)
    const finishLogin = (data) => {
        console.log("[App] Login success:", data);
        setUser(data);
        setIsGuest(data.role === 'guest' || data.is_guest);
        setVerificationStatus(null);
        setTempAuth(null);

        // --- Apply Theme from Login Data (if available) ---
        if (data.app_settings) {
            try {
                const s = JSON.parse(data.app_settings);
                if (s.theme) {
                    const root = document.documentElement;
                    if (s.theme === 'dark') root.classList.add('dark');
                    else if (s.theme === 'light') root.classList.remove('dark');
                    else {
                        // System
                        if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
                        else root.classList.remove('dark');
                    }
                }
            } catch (e) { console.error("Theme apply error", e); }
        }

        if (data.role === 'admin') {
            setView('adminPanel');
        } else {
            fetchMatches(data.user_id);
            setView('dashboard');
        }
    };

    const handleLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: emailOrUser, password })
            });
            if (res.ok) {
                const data = await res.json();

                // --- 2FA Interception ---
                if (data.require_2fa) {
                    console.log("[App] 2FA required for user", data.user_id);
                    setTempAuth(data);
                    setView('verify_2fa');
                    return;
                }

                finishLogin(data);

            } else {
                const err = await res.json();
                console.warn("[App] Login failed:", err);
                alert(t('alert.login_failed', "Login failed: ") + (err.detail || JSON.stringify(err)));
            }
        } catch (e) {
            console.error("[App] Login network error:", e);
            alert(t('alert.network_error', "Connection error to server."));
        }
    };

    const handleRegister = async () => {
        const answersArray = questions.map(q => parseInt(answers[q.id] || 3));

        try {
            const res = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    real_name: realName,
                    intent,
                    answers: answersArray
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.is_verified) {
                    alert(t('alert.welcome', `Welcome`) + `, ${data.username}!`);
                    setUser({ user_id: data.id, username: data.username, role: data.role });
                    setIsGuest(false);
                    fetchMatches(data.id);
                    setView('dashboard');
                } else {
                    alert(t('register.check_mail', "Account created! Please check your email to activate your account."));
                    setView('landing');
                }
            } else {
                const err = await res.json();
                const errorMsg = typeof err.detail === 'object' ? JSON.stringify(err.detail, null, 2) : err.detail;
                alert(t('alert.error', "Error: ") + errorMsg);
            }
        } catch (e) {
            console.error(e);
            alert(t('alert.register_fail_network', "Registration failed (Network error)."));
        }
    };

    const handleGuest = async () => {
        try {
            const res = await fetch(`${API_URL}/matches/0`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data);
                setIsGuest(true);
                setUser({ user_id: 0, username: t('user.guest', "Guest"), role: 'guest' });
                setView('dashboard');
            } else {
                const err = await res.json();
                if (res.status === 403) {
                    alert(t('alert.guest_disabled', "Guest mode is disabled. Please register."));
                } else {
                    alert(t('alert.guest_error', "Error logging in as guest."));
                }
            }
        } catch (e) {
            console.error(e);
            alert(t('alert.server_error', "Server Error"));
        }
    };

    const fetchMatches = async (uid) => {
        try {
            const res = await fetch(`${API_URL}/matches/${uid}`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data);
            }
        } catch (e) { console.error("Match fetch failed", e); }
    };

    // View Categories
    const isLanding = view === 'landing';
    const isLegal = ['legal', 'imprint', 'privacy'].includes(view);
    const isAuthCardView = ['login', 'register', 'forgot_pw', 'reset_pw', 'verify_2fa'].includes(view);

    // Import extracted components
    // Note: In a real environment, imports would be at the top. I'll ensure they are added there cleanly next.
    // For now, I'm modifying the render block.

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isAuthCardView ? 'animated-gradient overflow-hidden relative' : 'bg-gray-50 dark:bg-[#121212]'}`}>
            {maintenanceMode && view !== 'login' && (!user || user.role !== 'admin') && (
                <MaintenancePage
                    type={maintenanceReason}
                    onAdminLogin={() => setView('login')}
                />
            )}

            {(!maintenanceMode || view === 'login' || (user && user.role === 'admin')) && (
                <div className="w-full h-full min-h-screen">
                    <VerificationBanner
                        status={verificationStatus}
                        message={verificationMsg}
                        onClose={() => setVerificationStatus(null)}
                    />

                    <div className="w-full h-full min-h-screen">

                        {/* 1. Landing View (Full Screen) */}
                        {isLanding && (
                            <Landing
                                onLogin={() => setView('login')}
                                onRegister={() => setView('register')}
                                onGuest={handleGuest}
                                onAdmin={() => setView('login')}
                                onLegal={() => setView('legal')}
                                t={t}
                            />
                        )}

                        {/* 2. Legal View (Document Style) */}
                        {isLegal && (
                            <div className="container mx-auto max-w-4xl p-8 min-h-screen flex flex-col justify-center">
                                <div className="glass-panel">
                                    <Legal
                                        type={view === 'legal' ? 'imprint' : view}
                                        config={globalConfig.legal}
                                        onBack={() => user ? setView('dashboard') : setView('landing')}
                                        t={t}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. Auth Views (Split Screen on Desktop) */}
                        {isAuthCardView && (
                            <AuthLayout t={t}>
                                {view === 'login' && <Login email={emailOrUser} setEmail={setEmailOrUser} password={password} setPassword={setPassword} onLogin={handleLogin} onLoginSuccess={finishLogin} onBack={() => setView('landing')} onForgotPassword={() => setView('forgot_pw')} t={t} config={globalConfig} />}
                                {view === 'register' && <Register realName={realName} setRealName={setRealName} email={email} setEmail={setEmail} password={password} setPassword={setPassword} answers={answers} setAnswers={setAnswers} questions={questions} onRegister={handleRegister} onBack={() => setView('landing')} t={t} config={globalConfig} />}
                                {view === 'forgot_pw' && <ForgotPassword onBack={() => setView('login')} t={t} />}
                                {view === 'reset_pw' && <ResetPassword token={resetToken} onSuccess={() => setView('login')} t={t} />}
                                {view === 'verify_2fa' && tempAuth && <TwoFactorAuth tempAuth={tempAuth} onVerified={finishLogin} onCancel={() => { setTempAuth(null); setView('login'); }} t={t} />}
                            </AuthLayout>
                        )}

                        {/* 4. Dashboard / Main App Layout */}
                        {!isLanding && !isLegal && !isAuthCardView && (
                            <div className="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8 min-h-screen flex flex-col">
                                {view === 'dashboard' && <Dashboard user={user} matches={matches} isGuest={isGuest} testMode={globalConfig.test_mode} onLogout={() => { setUser(null); setView('landing'); }} onRegisterClick={() => setView('register')} onAdminClick={() => setView('adminPanel')} onProfileClick={() => setView('profile')} onSwipeClick={() => setView('swipe')} onQuestionnaireClick={() => setView('questionnaire')} onImprintClick={() => setView('imprint')} onPrivacyClick={() => setView('privacy')} t={t} />}
                                {view === 'profile' && user && <UserProfile user={user} onBack={() => setView('dashboard')} onOpenSettings={() => setView('settings')} t={t} />}
                                {view === 'swipe' && user && <Discover user={user} onBack={() => setView('dashboard')} t={t} />}
                                {view === 'questionnaire' && user && <Questionnaire user={user} onComplete={() => { setView('dashboard'); alert("Profile updated!"); }} t={t} />}
                                {view === 'settings' && user && <AccountSettings user={user} globalConfig={globalConfig} onBack={() => setView('profile')} onLogout={() => { setUser(null); setView('landing'); }} onResetPassword={() => { setUser(null); setView('forgot_pw'); }} t={t} />}
                                {view === 'adminPanel' && <AdminPanel user={user} testMode={globalConfig.test_mode} onLogout={() => { setUser(null); setView('landing'); }} onBack={() => setView('dashboard')} t={t} />}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}

export default () => (
    <ThemeProvider>
        <App />
    </ThemeProvider>
);