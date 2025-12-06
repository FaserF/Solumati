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
    const [adminData, setAdminData] = useState([]);

    // --- I18n State ---
    const [i18n, setI18n] = useState({});

    // Helper: Translate key, fallback to args or FALLBACK dict or key itself
    const t = (key, defaultText = "") => {
        return i18n[key] || FALLBACK[key] || defaultText || key;
    };

    // Load translations
    useEffect(() => {
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

    // --- Actions ---

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
                alert(t('alert.login_failed', "Login fehlgeschlagen: ") + err.detail);
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
                alert(t('alert.welcome', `Willkommen`) + `, ${data.username}!`);
                setUser({ user_id: data.id, username: data.username });
                setIsGuest(false);
                fetchMatches(data.id);
                setView('dashboard');
            } else {
                const err = await res.json();
                alert("Fehler: " + err.detail);
            }
        } catch (e) { alert("Registrierung fehlgeschlagen."); }
    };

    const handleGuest = () => {
        setIsGuest(true);
        setUser({ username: t('user.guest', "Gast") });
        setView('dashboard');
        setMatches([
            { username: "PremiumUser#12", score: 98 },
            { username: "Anna#44", score: 85 }
        ]);
    };

    const handleAdminLogin = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPass })
            });
            if (res.ok) {
                fetchAdminData();
                setView('adminPanel');
            } else {
                alert("Zugriff verweigert.");
            }
        } catch (e) { alert("Serverfehler"); }
    };

    const fetchAdminData = async () => {
        const res = await fetch(`${API_URL}/admin/users`);
        const data = await res.json();
        setAdminData(data);
    };

    const adminAction = async (id, action) => {
        if (!confirm(`Benutzer wirklich ${action}?`)) return;
        await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        fetchAdminData();
    };

    const fetchMatches = async (uid) => {
        const res = await fetch(`${API_URL}/matches/${uid}`);
        if (res.ok) setMatches(await res.json());
    };

    // --- Render Logic ---

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
            adminData={adminData}
            onAction={adminAction}
            onLogout={() => setView('landing')}
            t={t}
        />
    );

    return null;
}

export default App;