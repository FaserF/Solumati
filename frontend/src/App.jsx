import React, { useState, useEffect } from 'react';
import { API_URL, FALLBACK } from './config';
import { CheckCircle, XCircle } from 'lucide-react';

// Import Components
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

function App() {
    // --- Global State ---
    const [view, setView] = useState('landing');
    const [user, setUser] = useState(null);
    const [matches, setMatches] = useState([]);
    const [isGuest, setIsGuest] = useState(false);

    // Global Config
    const [testMode, setTestMode] = useState(false);

    // --- Form State ---
    const [emailOrUser, setEmailOrUser] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [realName, setRealName] = useState("");
    const [intent, setIntent] = useState("longterm");
    const [answers, setAnswers] = useState({});

    // --- Verification State ---
    const [verificationStatus, setVerificationStatus] = useState(null); // 'success', 'error', 'loading'
    const [verificationMsg, setVerificationMsg] = useState("");

    // --- I18n State ---
    const [i18n, setI18n] = useState({});

    const t = (key, defaultText = "") => {
        return i18n[key] || FALLBACK[key] || defaultText || key;
    };

    // --- Startup: Verification, I18n, Config ---
    useEffect(() => {
        // Fetch Global Config (TestMode etc)
        fetch(`${API_URL}/public-config`)
            .then(res => res.json())
            .then(data => {
                setTestMode(data.test_mode || false);
            })
            .catch(e => console.error("Config fetch error", e));

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

        // --- Verification Logic ---
        const params = new URLSearchParams(window.location.search);
        const verifyId = params.get('id');
        const verifyCode = params.get('code');

        if (verifyId && verifyCode) {
            setVerificationStatus('loading');
            // Call API to verify
            fetch(`${API_URL}/verify?id=${verifyId}&code=${verifyCode}`, { method: 'POST' })
                .then(async res => {
                    const data = await res.json();
                    if (res.ok) {
                        setVerificationStatus('success');
                        setVerificationMsg(t('verify.success', 'E-Mail erfolgreich verifiziert!'));
                        // Remove params from URL without refresh to be clean
                        window.history.replaceState({}, document.title, window.location.pathname);
                    } else {
                        setVerificationStatus('error');
                        setVerificationMsg(data.detail || t('verify.error', 'Verifizierungslink ungültig oder abgelaufen.'));
                    }
                })
                .catch(() => {
                    setVerificationStatus('error');
                    setVerificationMsg("Netzwerkfehler bei der Verifizierung.");
                });
        }
    }, []);

    const questions = [
        { id: 0, text: t('q.0', "Ich bevorzuge ruhige Abende.") },
        { id: 1, text: t('q.1', "Karriere ist wichtiger als Familie.") },
        { id: 2, text: t('q.2', "Glaube/Spiritualität ist mir wichtig.") },
        { id: 3, text: t('q.3', "Ich diskutiere gerne Politik.") }
    ];

    const handleLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: emailOrUser, password })
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[App] Login success:", data);
                setUser(data);
                setIsGuest(data.role === 'guest' || data.is_guest);
                // Clear verification banners on login
                setVerificationStatus(null);

                if (data.role === 'admin') {
                    setView('adminPanel');
                } else {
                    fetchMatches(data.user_id);
                    setView('dashboard');
                }

            } else {
                const err = await res.json();
                console.warn("[App] Login failed:", err);
                alert(t('alert.login_failed', "Login fehlgeschlagen: ") + (err.detail || JSON.stringify(err)));
            }
        } catch (e) {
            console.error("[App] Login network error:", e);
            alert("Verbindungsfehler zum Server.");
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
                    alert(t('alert.welcome', `Willkommen`) + `, ${data.username}!`);
                    setUser({ user_id: data.id, username: data.username, role: data.role });
                    setIsGuest(false);
                    fetchMatches(data.id);
                    setView('dashboard');
                } else {
                    // Show message and go to landing
                    alert(t('register.check_mail', "Account erstellt! Bitte überprüfe deine E-Mails, um den Account zu aktivieren."));
                    setView('landing');
                }
            } else {
                const err = await res.json();
                const errorMsg = typeof err.detail === 'object' ? JSON.stringify(err.detail, null, 2) : err.detail;
                alert("Fehler: " + errorMsg);
            }
        } catch (e) {
            console.error(e);
            alert("Registrierung fehlgeschlagen (Netzwerkfehler).");
        }
    };

    const handleGuest = async () => {
        try {
            const res = await fetch(`${API_URL}/matches/0`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data);
                setIsGuest(true);
                setUser({ user_id: 0, username: t('user.guest', "Gast"), role: 'guest' });
                setView('dashboard');
            } else {
                const err = await res.json();
                if (res.status === 403) {
                    alert("Gastmodus ist leider deaktiviert. Bitte registriere dich.");
                } else {
                    alert("Fehler beim Gast-Login.");
                }
            }
        } catch (e) { console.error(e); alert("Serverfehler"); }
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

    // --- Verification Banner ---
    const renderVerificationBanner = () => {
        if (!verificationStatus) return null;

        const isSuccess = verificationStatus === 'success';
        const bgColor = isSuccess ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800';
        const Icon = isSuccess ? CheckCircle : XCircle;

        return (
            <div className={`fixed top-0 left-0 right-0 p-4 border-b-2 ${bgColor} flex items-center justify-center gap-2 z-50 shadow-md animate-fade-in-down`}>
                <Icon size={20} />
                <span className="font-bold">{verificationMsg}</span>
                <button
                    onClick={() => setVerificationStatus(null)}
                    className="ml-4 text-sm underline opacity-70 hover:opacity-100"
                >
                    {t('btn.close', 'Schließen')}
                </button>
            </div>
        );
    };

    return (
        <>
            {renderVerificationBanner()}

            {view === 'landing' && (
                <Landing
                    onLogin={() => setView('login')}
                    onRegister={() => setView('register')}
                    onGuest={handleGuest}
                    onAdmin={() => setView('login')} // Admin login is same entry point but different logic if needed, or separate
                    onLegal={() => alert("Impressum/Datenschutz placeholder")} // Should route to component
                    t={t}
                />
            )}

            {view === 'login' && (
                <Login
                    email={emailOrUser} setEmail={setEmailOrUser}
                    password={password} setPassword={setPassword}
                    onLogin={handleLogin}
                    onBack={() => setView('landing')}
                    t={t}
                />
            )}

            {view === 'register' && (
                <Register
                    realName={realName} setRealName={setRealName}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    answers={answers} setAnswers={setAnswers}
                    questions={questions}
                    onRegister={handleRegister}
                    onBack={() => setView('landing')}
                    t={t}
                />
            )}

            {view === 'dashboard' && (
                <Dashboard
                    user={user}
                    matches={matches}
                    isGuest={isGuest}
                    testMode={testMode}
                    onLogout={() => { setUser(null); setView('landing'); }}
                    onRegisterClick={() => setView('register')}
                    onAdminClick={() => setView('adminPanel')}
                    t={t}
                />
            )}

            {view === 'adminPanel' && (
                <AdminPanel
                    user={user}
                    testMode={testMode}
                    onLogout={() => { setUser(null); setView('landing'); }}
                    onBack={() => setView('dashboard')}
                    t={t}
                />
            )}
        </>
    );
}

export default App;