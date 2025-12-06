import React, { useState, useEffect } from 'react';
import { API_URL, FALLBACK } from './config';

// Import Components
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';

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
    // Removed adminData state here as it is managed inside AdminPanel now

    // --- I18n State ---
    const [i18n, setI18n] = useState({});

    const t = (key, defaultText = "") => {
        return i18n[key] || FALLBACK[key] || defaultText || key;
    };

    // --- Verification Logic (Check URL params) ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('verify_code') || window.location.pathname === '/verify') {
            // Handle simple verification via API call if needed,
            // but usually backend renders a page or we call API here.
            // For now: Just log.
            console.log("Verification intent detected");
        }

        const lang = navigator.language.split('-')[0] || 'en';
        fetch(`${API_URL}/api/i18n/${lang}`)
            .then(res => res.json())
            .then(data => setI18n(data.translations || {}))
            .catch(e => console.warn("Could not load translations", e));
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
        } catch (e) {
            console.error(e);
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
                    setUser({ user_id: data.id, username: data.username });
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
        // Try to fetch matches for Guest ID 0 to check if guest mode is allowed
        try {
            const res = await fetch(`${API_URL}/matches/0`);
            if (res.ok) {
                const data = await res.json();
                setMatches(data);
                setIsGuest(true);
                setUser({ user_id: 0, username: t('user.guest', "Gast") });
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

    const handleAdminLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPass })
            });
            if (res.ok) {
                setView('adminPanel');
            } else {
                alert("Zugriff verweigert.");
            }
        } catch (e) { alert("Serverfehler"); }
    };

    if (view === 'landing') return (
        <Landing
            onLogin={() => setView('login')}
            onRegister={() => setView('register')}
            onGuest={handleGuest}
            onAdmin={() => setView('adminLogin')}
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
            onLogout={() => setView('landing')}
            onRegisterClick={() => setView('register')}
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