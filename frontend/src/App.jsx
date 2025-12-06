import React, { useState, useEffect } from 'react';
import { Shield, Heart, User, Lock, AlertTriangle, EyeOff, CheckCircle } from 'lucide-react';

const API_URL = "http://localhost:7777";

// --- Fallback Translations (in case backend is slow or keys missing) ---
// This ensures the app is usable immediately while adhering to the "no hardcoded text" rule structure.
const FALLBACK = {
    'app.title': 'Solumati',
    'landing.tagline': 'Stop Swiping. Start Connecting.',
    'landing.btn_login': 'Anmelden',
    'landing.btn_register': 'Registrieren',
    'landing.btn_guest': 'Als Gast surfen',
    'login.title': 'Willkommen zurück',
    'label.email': 'E-Mail',
    'label.password': 'Passwort',
    'btn.login': 'Einloggen',
    'btn.back': 'Zurück',
    'register.title': 'Profil erstellen',
    'label.realname': 'Vorname',
    'header.personality': 'Persönlichkeits-Check',
    'scale.no': 'Nein',
    'scale.yes': 'Ja',
    'btn.register_now': 'Kostenlos Registrieren',
    'btn.cancel': 'Abbrechen',
    'dashboard.guest_warning': 'Gastmodus: Bilder sind unscharf & Chat ist deaktiviert.',
    'dashboard.no_matches': 'Keine Matches gefunden...',
    'dashboard.match_score': 'Match Score',
    'admin.title': 'Admin Konsole',
    'admin.status.active': 'Aktiv',
    'admin.status.inactive': 'Inaktiv',
    'admin.btn.deactivate': 'Sperren',
    'admin.btn.activate': 'Aktivieren',
    'admin.btn.delete': 'Löschen',
    'admin.access_title': 'Admin Panel Access'
};

// --- Sub-Components (Defined OUTSIDE App to fix focus/remount issues) ---

const Landing = ({ onLogin, onRegister, onGuest, onAdmin, t }) => (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black opacity-90"></div>

        <div className="z-10 text-center max-w-3xl">
            <h1 className="text-6xl md:text-8xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse">
                {t('app.title')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 font-light">
                {t('landing.tagline')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mx-auto">
                <button onClick={onLogin} className="bg-white text-gray-900 font-bold py-3 px-6 rounded-full hover:scale-105 transition transform shadow-lg">
                    {t('landing.btn_login')}
                </button>
                <button onClick={onRegister} className="bg-transparent border-2 border-pink-500 text-pink-500 font-bold py-3 px-6 rounded-full hover:bg-pink-500 hover:text-white transition transform shadow-lg">
                    {t('landing.btn_register')}
                </button>
                <button onClick={onGuest} className="bg-gray-800 text-gray-400 font-medium py-3 px-6 rounded-full hover:bg-gray-700 hover:text-white transition transform border border-gray-700">
                    {t('landing.btn_guest')}
                </button>
            </div>
        </div>

        <button onClick={onAdmin} className="absolute bottom-4 right-4 text-gray-700 hover:text-gray-500 transition">
            <Lock size={20} />
        </button>
    </div>
);

const Login = ({ email, setEmail, password, setPassword, onLogin, onBack, t }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">{t('login.title')}</h2>
            <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('label.email')}</label>
                <input
                    className="w-full p-4 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="mail@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
            </div>
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('label.password')}</label>
                <input
                    className="w-full p-4 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    type="password"
                    placeholder="***"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
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

const Register = ({
    realName, setRealName,
    email, setEmail,
    password, setPassword,
    answers, setAnswers,
    questions,
    onRegister, onBack, t
}) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg h-auto max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('register.title')}</h2>

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
                            {/* Controlled input with value prop fixes the slider issue */}
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

const Dashboard = ({ user, matches, isGuest, onLogout, onRegisterClick, t }) => (
    <div className="min-h-screen bg-gray-50">
        {isGuest && (
            <div className="bg-yellow-400 text-yellow-900 p-3 text-center font-bold flex justify-center items-center gap-2 shadow-sm sticky top-0 z-50">
                <AlertTriangle size={20} />
                {t('dashboard.guest_warning')}
                <button onClick={onRegisterClick} className="ml-4 bg-black text-white text-xs px-3 py-1 rounded hover:bg-gray-800">
                    {t('landing.btn_register')}
                </button>
            </div>
        )}

        <nav className="bg-white shadow p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Heart className="text-pink-600 fill-current" />
                <span className="font-bold text-xl text-gray-800">{t('app.title')}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-gray-600 text-sm hidden md:inline">
                    {/* Fallback for username display */}
                    {user?.username}
                </span>
                <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-500 font-medium">
                    {t('btn.back')} (Logout)
                </button>
            </div>
        </nav>

        <div className="max-w-4xl mx-auto p-6 md:p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">{t('dashboard.title', 'Deine Matches')}</h2>

            {matches.length === 0 ? (
                <div className="text-center py-12 text-gray-400">{t('dashboard.no_matches')}</div>
            ) : (
                <div className="grid gap-4">
                    {matches.map((m, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition">
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className={`w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 ${isGuest ? 'filter blur-sm opacity-50' : ''}`}>
                                    {isGuest ? <EyeOff className="text-gray-400" /> : <User className="text-pink-500 w-8 h-8" />}
                                </div>

                                <div>
                                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                        {m.username}
                                        {!isGuest && <CheckCircle size={16} className="text-blue-500" />}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {isGuest ? "***" : t('match.pairing_text', 'Passt zu dir')}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 text-right w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 flex md:block justify-between items-center">
                                <span className="md:hidden font-bold text-gray-600">{t('dashboard.match_score')}:</span>
                                <div>
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                                        {m.score}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const AdminLogin = ({ adminPass, setAdminPass, onLogin, onBack, t }) => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-sm text-white shadow-2xl">
            <div className="flex justify-center mb-6">
                <div className="bg-red-500/20 p-4 rounded-full">
                    <Shield size={48} className="text-red-500" />
                </div>
            </div>
            <h2 className="text-center text-2xl font-bold mb-6">{t('admin.access_title')}</h2>
            <input
                className="w-full mb-4 p-3 rounded bg-gray-900 border border-gray-600 text-white focus:border-red-500 focus:outline-none"
                type="password"
                placeholder="Master Password"
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
            />
            <button onClick={onLogin} className="w-full bg-red-600 hover:bg-red-700 py-3 rounded font-bold transition">
                Entsperren
            </button>
            <button onClick={onBack} className="w-full mt-4 text-gray-500 text-sm hover:text-white transition">
                {t('btn.cancel')}
            </button>
        </div>
    </div>
);

const AdminPanel = ({ adminData, onAction, onLogout, t }) => (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <Shield className="text-red-600" />
                    {t('admin.title')}
                </h1>
                <button onClick={onLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium transition">
                    Logout
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Username</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">E-Mail</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminData.map(u => (
                                <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                                    <td className="p-4 text-gray-600">#{u.id}</td>
                                    <td className="p-4 font-bold text-gray-800">{u.username}</td>
                                    <td className="p-4 text-gray-500">{u.email}</td>
                                    <td className="p-4">
                                        {u.is_active ?
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{t('admin.status.active')}</span> :
                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">{t('admin.status.inactive')}</span>
                                        }
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {u.is_active ? (
                                            <button onClick={() => onAction(u.id, "deactivate")} className="text-orange-500 hover:text-orange-700 text-sm font-medium">
                                                {t('admin.btn.deactivate')}
                                            </button>
                                        ) : (
                                            <button onClick={() => onAction(u.id, "reactivate")} className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                                                {t('admin.btn.activate')}
                                            </button>
                                        )}
                                        <button onClick={() => onAction(u.id, "delete")} className="text-red-500 hover:text-red-700 text-sm font-medium ml-2">
                                            {t('admin.btn.delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);

// --- Main App Component ---

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
    // Rendering isolated components with props to prevent re-mounts on input change

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