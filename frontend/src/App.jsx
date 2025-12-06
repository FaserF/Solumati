import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Shield, Heart, MessageCircle, User } from 'lucide-react';

// NOTE: In your local project, this CSS import is handled by Vite/Tailwind.
// For this preview, Tailwind is automatically injected.
// import './index.css';

// Configuration: API URL should be environment variable in prod
const API_URL = "http://localhost:7777";

// Simple frontend i18n loader and helper. Fetches translations from backend and falls back to identity keys.
const FALLBACK = {};

function App() {
    // --- Application State ---
    const [view, setView] = useState('landing');
    const [userId, setUserId] = useState(null);
    const [matches, setMatches] = useState([]);

    // i18n state
    const [i18n, setI18n] = useState({});
    const [lang, setLang] = useState('en');

    const t = (key, vars = {}) => {
        const raw = i18n[key] || FALLBACK[key] || key;
        return Object.keys(vars).reduce((s, k) => s.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, 'g'), vars[k]), raw);
    };

    // --- Registration State ---
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regIntent, setRegIntent] = useState("longterm");
    const [answers, setAnswers] = useState({});

    // Questions config: use translation keys so frontend texts are never hardcoded
    const questions = [
        { id: 0, textKey: 'q.0' },
        { id: 1, textKey: 'q.1' },
        { id: 2, textKey: 'q.2' },
        { id: 3, textKey: 'q.3' },
        // Add more question keys and translations in backend/i18n/*.json
    ];

    useEffect(() => {
        // Detect browser language and request short code
        const navLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
        setLang(navLang);

        const load = async (lng) => {
            try {
                const res = await fetch(`${API_URL}/api/i18n/${lng}`);
                if (res.ok) {
                    const data = await res.json();
                    setI18n(data.translations || {});
                } else {
                    // fallback to listing or default
                    const fallbackRes = await fetch(`${API_URL}/api/i18n`);
                    if (fallbackRes.ok) {
                        const dd = await fallbackRes.json();
                        // attempt to fetch first available
                        const first = (dd.available && dd.available[0]) || 'en';
                        const r2 = await fetch(`${API_URL}/api/i18n/${first}`);
                        if (r2.ok) {
                            const d2 = await r2.json();
                            setI18n(d2.translations || {});
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not load translations from API, using fallback strings.', e);
                // keep FALLBACK
            }
        };
        load(navLang);
    }, []);

    /**
     * Handles user registration.
     * Transforms answer object to array and posts to API.
     */
    const handleRegister = async () => {
        // Defaulting missing answers to 3 (Neutral)
        const answersArray = questions.map(q => parseInt(answers[q.id] || 3));

        console.log("Submitting registration for:", regEmail);

        try {
            const response = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: regEmail,
                    password: regPassword,
                    intent: regIntent,
                    answers: answersArray
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Registration successful, ID:", data.id);
                setUserId(data.id);
                alert(t('alert.registration_success'));
                fetchMatches(data.id);
                setView('dashboard');
            } else {
                const err = await response.json();
                console.error("Registration error:", err);
                alert("Error: " + (err.detail || err.message || JSON.stringify(err)));
            }
        } catch (e) {
            console.error("Network error:", e);
            // Fallback for demo purposes if backend is not running
            alert(t('alert.backend_unreachable'));
            setUserId(999);
            setView('dashboard');
            // Mock matches for UI demo
            setMatches([
                { email: "demo_partner@test.com", score: 95 },
                { email: "soulmate_found@test.com", score: 88 }
            ]);
        }
    };

    /**
     * Fetches compatible matches for the logged-in user.
     */
    const fetchMatches = async (uid) => {
        console.log("Fetching matches for UserID:", uid);
        try {
            const res = await fetch(`${API_URL}/matches/${uid}`);
            const data = await res.json();
            setMatches(data);
        } catch (e) {
            console.error("Error fetching matches:", e);
        }
    };

    // --- UI Components (Views) ---

    const Landing = () => (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">{t('app.title')}</h1>
            <p className="mb-8 text-xl text-gray-400">{t('landing.tagline')}</p>
            <button onClick={() => setView('register')} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full transition">
                {t('landing.start')}
            </button>
        </div>
    );

    const Register = () => (
        <div className="min-h-screen p-8 flex justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('register.title')}</h2>

                {/* Email Input */}
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">{t('label.email')}</label>
                    <input className="w-full p-2 border rounded text-gray-900" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>

                {/* Password Input */}
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">{t('label.password')}</label>
                    <input className="w-full p-2 border rounded text-gray-900" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                </div>

                {/* Intent Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-bold mb-2 text-gray-700">{t('label.intent')}</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setRegIntent('longterm')}
                            className={`flex-1 p-3 rounded border font-medium ${regIntent === 'longterm' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'border-gray-200 text-gray-600'}`}>
                            {t('intent.longterm')}
                        </button>
                        <button
                            onClick={() => setRegIntent('casual')}
                            className={`flex-1 p-3 rounded border font-medium ${regIntent === 'casual' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                            {t('intent.casual')}
                        </button>
                    </div>
                </div>

                {/* Questionnaire */}
                <h3 className="font-bold mt-8 mb-4 text-gray-800">{t('question.prefix')}</h3>
                <div className="space-y-6">
                    {questions.map(q => (
                        <div key={q.id} className="bg-gray-50 p-4 rounded border border-gray-100">
                            <p className="mb-2 font-medium text-gray-700">{t(q.textKey)}</p>
                            <input
                                type="range" min="1" max="5" defaultValue="3"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>{t('scale.no')}</span>
                                <span>{t('scale.neutral')}</span>
                                <span>{t('scale.yes')}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleRegister} className="w-full mt-8 bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">
                    {t('button.submit')}
                </button>
            </div>
        </div>
    );

    const Dashboard = () => (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow p-4 flex justify-between items-center">
                <span className="font-bold text-xl text-pink-600">{t('app.title')}</span>
                <button onClick={() => setView('landing')} className="text-sm text-gray-500 hover:text-gray-800">Logout</button>
            </nav>

            <div className="max-w-4xl mx-auto p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('dashboard.title')}</h2>

                {matches.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-sm">
                        <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>{t('dashboard.no_matches')}</p>
                        <p className="text-xs mt-2">{t('dashboard.test_tip')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map((m, i) => (
                            <div key={i} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition flex justify-between items-center border border-gray-100">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{m.email}</h3>
                                    <p className="text-sm text-gray-500">{t('match.pairing_text')}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-green-500">{m.score}%</div>
                                    <span className="text-xs text-gray-400">{t('match.score_label')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {view === 'landing' && <Landing />}
            {view === 'register' && <Register />}
            {view === 'dashboard' && <Dashboard />}
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);