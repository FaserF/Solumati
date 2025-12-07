import React, { useState, useEffect } from 'react';
import { API_URL, FALLBACK } from './config';

// Import Components
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
// Removed legacy AdminLogin import

function App() {
    // --- Global State ---
    const [view, setView] = useState('landing');
    const [user, setUser] = useState(null);
    const [matches, setMatches] = useState([]);
    const [isGuest, setIsGuest] = useState(false);

    // --- Form State ---
    const [emailOrUser, setEmailOrUser] = useState(""); // Changed from email to emailOrUser
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState(""); // Still needed for register
    const [realName, setRealName] = useState("");
    const [intent, setIntent] = useState("longterm");
    const [answers, setAnswers] = useState({});

    // --- I18n State ---
    const [i18n, setI18n] = useState({});

    const t = (key, defaultText = "") => {
        return i18n[key] || FALLBACK[key] || defaultText || key;
    };

    // --- Verification & Language Logic ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('verify_code') || window.location.pathname === '/verify') {
            console.log("Verification intent detected");
        }

        // --- I18N FETCHING DEBUGGING ---
        const browserLang = navigator.language;
        const shortLang = browserLang.split('-')[0] || 'en';
        console.log(`[App] Browser language detected: ${browserLang} -> Requesting: ${shortLang}`);

        fetch(`${API_URL}/api/i18n/${shortLang}`)
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("[App] Translations loaded:", data);
                if (!data.translations || Object.keys(data.translations).length === 0) {
                    console.warn("[App] Received empty translations object. Falling back to default.");
                }
                setI18n(data.translations || {});
            })
            .catch(e => {
                console.error("[App] Could not load translations. Check Network/CORS.", e);
            });
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
                body: JSON.stringify({ login: emailOrUser, password }) // Changed field name
            });
            if (res.ok) {
                const data = await res.json();
                console.log("[App] Login success:", data);
                setUser(data);
                setIsGuest(false);
                fetchMatches(data.user_id);
                setView('dashboard');
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
                    alert("Account erstellt! Bitte überprüfe deine E-Mails, um den Account zu aktivieren.");
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
                setUser({ user_id: 0, username: t('user.guest', "Gast"), role: 'user' });
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

    if (view === 'landing') return (
        <Landing
            onLogin={() => setView('login')}
            onRegister={() => setView('register')}
            onGuest={handleGuest}
            onAdmin={() => setView('login')} // Admin now uses central login
            t={t}
        />
    );

    if (view === 'login') return (
        <Login
            email={emailOrUser} setEmail={setEmailOrUser}
            password={password} setPassword={setPassword}
            onLogin={handleLogin}
            onBack={() => setView('landing')}
            t={t}
        />
    );

    if (view === 'register') return (
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
    );

    if (view === 'dashboard') return (
        <Dashboard
            user={user}
            matches={matches}
            isGuest={isGuest}
            onLogout={() => { setUser(null); setView('landing'); }}
            onRegisterClick={() => setView('register')}
            onAdminClick={() => setView('adminPanel')}
            t={t}
        />
    );

    if (view === 'adminPanel') return (
        <AdminPanel
            user={user}
            onLogout={() => { setUser(null); setView('landing'); }}
            onBack={() => setView('dashboard')}
            t={t}
        />
    );

    return null;
}

export default App;