import React, { useState, useEffect } from 'react';
import { API_URL, FALLBACK } from './config';

// Import Components
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import AccountSettings from './components/AccountSettings';
import Legal from './components/Legal';

function App() {
    // --- Global State ---
    const [view, setView] = useState('landing');
    const [user, setUser] = useState(null);
    const [matches, setMatches] = useState([]);
    const [isGuest, setIsGuest] = useState(false);

    // --- Form State ---
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [realName, setRealName] = useState("");
    const [intent, setIntent] = useState("longterm");
    const [answers, setAnswers] = useState({});

    // --- Admin State ---
    const [adminPass, setAdminPass] = useState("");

    // --- I18n State ---
    const [i18n, setI18n] = useState({});

    const t = (key, defaultText = "") => {
        return i18n[key] || FALLBACK[key] || defaultText || key;
    };

    useEffect(() => {
        const browserLang = navigator.language;
        const shortLang = browserLang.split('-')[0] || 'en';

        fetch(`${API_URL}/api/i18n/${shortLang}`)
            .then(res => res.ok ? res.json() : {})
            .then(data => setI18n(data.translations || {}))
            .catch(console.error);
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
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setIsGuest(false);
                fetchMatches(data.user_id);
                setView('dashboard');
            } else {
                const err = await res.json();
                alert(t('alert.login_failed', "Login fehlgeschlagen: ") + (err.detail || JSON.stringify(err)));
            }
        } catch (e) { alert("Verbindungsfehler zum Server."); }
    };

    const handleRegister = async () => {
        const answersArray = questions.map(q => parseInt(answers[q.id] || 3));
        try {
            const res = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, real_name: realName, intent, answers: answersArray })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.is_verified) {
                    setUser({ user_id: data.id, username: data.username });
                    setIsGuest(false);
                    fetchMatches(data.id);
                    setView('dashboard');
                } else {
                    alert("Account erstellt! Bitte überprüfe deine E-Mails.");
                    setView('landing');
                }
            } else {
                const err = await res.json();
                alert("Fehler: " + err.detail);
            }
        } catch (e) { alert("Registrierung fehlgeschlagen."); }
    };

    const handleGuest = async () => {
        try {
            const res = await fetch(`${API_URL}/matches/0`);
            if (res.ok) {
                setMatches(await res.json());
                setIsGuest(true);
                setUser({ user_id: 0, username: t('user.guest', "Gast") });
                setView('dashboard');
            } else {
                alert("Gastmodus ist leider deaktiviert.");
            }
        } catch (e) { alert("Serverfehler"); }
    };

    const fetchMatches = async (uid) => {
        try {
            const res = await fetch(`${API_URL}/matches/${uid}`);
            if (res.ok) setMatches(await res.json());
        } catch (e) { console.error("Match fetch failed", e); }
    };

    const handleAdminLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPass })
            });
            if (res.ok) setView('adminPanel');
            else alert("Zugriff verweigert.");
        } catch (e) { alert("Serverfehler"); }
    };

    const handleLogout = () => {
        setUser(null);
        setView('landing');
        setEmail("");
        setPassword("");
    };

    if (view === 'legal') return <Legal onBack={() => setView('landing')} t={t} />;

    if (view === 'landing') return (
        <Landing
            onLogin={() => setView('login')}
            onRegister={() => setView('register')}
            onGuest={handleGuest}
            onAdmin={() => setView('adminLogin')}
            onLegal={() => setView('legal')}
            t={t}
        />
    );

    if (view === 'login') return (
        <Login
            email={email} setEmail={setEmail}
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
            onLogout={handleLogout}
            onRegisterClick={() => setView('register')}
            onProfileClick={() => setView('profile')}
            t={t}
        />
    );

    if (view === 'profile') return (
        <UserProfile
            user={user}
            onBack={() => setView('dashboard')}
            onOpenSettings={() => setView('settings')}
            t={t}
        />
    );

    if (view === 'settings') return (
        <AccountSettings
            user={user}
            onBack={() => setView('profile')}
            onLogout={handleLogout}
            t={t}
        />
    );

    if (view === 'adminLogin') return (
        <AdminLogin
            adminPass={adminPass} setAdminPass={setAdminPass}
            onLogin={handleAdminLogin}
            onBack={() => setView('landing')}
            t={t}
        />
    );

    if (view === 'adminPanel') return (
        <AdminPanel
            onLogout={() => setView('landing')}
            t={t}
        />
    );

    return null;
}

export default App;