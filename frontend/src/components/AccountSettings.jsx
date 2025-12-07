import React, { useState, useEffect } from 'react';
import { Lock, Mail, Trash2, ChevronLeft, Eye, EyeOff, Shield, Smartphone, Fingerprint, Bell, Moon, Sun, Smartphone as PhoneIcon } from 'lucide-react';
import { API_URL } from '~/config.js';

// Function to get the WebAuthn registration function (runtime check)
const getStartRegistration = () => {
    if (typeof startRegistration !== 'function') {
        console.error("WebAuthn browser function (startRegistration) is not available globally.");
        return null;
    }
    return startRegistration;
};

const AccountSettings = ({ user, onBack, onLogout, t }) => {
    // --- Tabs ---
    const [activeTab, setActiveTab] = useState('app'); // 'app' or 'account'

    // --- Account State ---
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);

    // --- App Settings State ---
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [theme, setTheme] = useState("system");

    const [loading, setLoading] = useState(false);

    // 2FA States
    const [totpSetup, setTotpSetup] = useState(null);
    const [totpCode, setTotpCode] = useState("");

    const headers = {
        'Content-Type': 'application/json',
        'X-User-ID': user.user_id.toString()
    };

    // Initialize state from user object if available, or fetch fresh settings
    useEffect(() => {
        // Parse settings string from user object if it exists (passed from App.jsx)
        if (user.app_settings) {
            try {
                const s = typeof user.app_settings === 'string' ? JSON.parse(user.app_settings) : user.app_settings;
                setNotificationsEnabled(s.notifications_enabled || false);
                setTheme(s.theme || "system");
            } catch (e) { console.error("Error parsing settings", e); }
        }
    }, [user]);

    // --- App Settings Handlers ---
    const saveAppPrefs = async (newPrefs) => {
        try {
            // Optimistic Update
            if (newPrefs.notifications_enabled !== undefined) setNotificationsEnabled(newPrefs.notifications_enabled);
            if (newPrefs.theme !== undefined) setTheme(newPrefs.theme);

            const payload = {
                ...newPrefs
            };

            // Handle Push Subscription logic here if enabled
            if (newPrefs.notifications_enabled === true) {
                // Check browser support
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                    alert("Push Notifications are not supported in this browser.");
                    setNotificationsEnabled(false);
                    return;
                }

                // Request Permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert("Permission denied.");
                    setNotificationsEnabled(false);
                    return;
                }

                // In a real implementation, we would subscribe here using VAPID key
                // const reg = await navigator.serviceWorker.ready;
                // const sub = await reg.pushManager.subscribe({ ... });
                // payload.push_subscription = sub;
                console.log("Push Permission granted. Ready for subscription logic.");
            }

            await fetch(`${API_URL}/users/${user.user_id}/preferences`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

        } catch (e) { console.error("Failed to save prefs", e); }
    };

    // --- Account Handlers ---
    const handleUpdate = async () => {
        if (!currentPassword) return console.error(t('settings.curr_pw') + " required");
        setLoading(true);
        try {
            const body = { current_password: currentPassword };
            if (email) body.email = email;
            if (password) body.password = password;

            const res = await fetch(`${API_URL}/users/${user.user_id}/account`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                console.log(t('settings.success'));
                if (data.reverify_needed) onLogout();
            } else {
                const err = await res.json();
                console.error("Error: " + err.detail);
            }
        } catch (e) { console.error("Network Error", e); }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!window.confirm(t('settings.delete_confirm'))) return;
        const pwd = window.prompt(t('settings.curr_pw'));
        if (!pwd) return;
        try {
            const res = await fetch(`${API_URL}/users/${user.user_id}`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ password: pwd })
            });
            if (res.ok) {
                onLogout();
            } else {
                const err = await res.json();
                console.error("Deletion Error: " + err.detail);
            }
        } catch (e) { console.error("Network Error", e); }
    };

    // --- 2FA Handlers (Same as before) ---
    const startTotp = async () => {
        const res = await fetch(`${API_URL}/users/2fa/setup/totp`, { method: 'POST', headers });
        if (res.ok) { setTotpSetup(await res.json()); }
    };

    const verifyTotp = async () => {
        const res = await fetch(`${API_URL}/users/2fa/verify/totp`, {
            method: 'POST', headers, body: JSON.stringify({ token: totpCode })
        });
        if (res.ok) { setTotpSetup(null); }
        else { console.error("Invalid Code"); }
    };

    const enableEmail2FA = async () => {
        try {
            const res = await fetch(`${API_URL}/users/2fa/setup/email`, { method: 'POST', headers });
            if (res.ok) console.log("Email 2FA Enabled!");
        } catch (e) { console.error("Error", e); }
    };

    const enablePasskey = async () => {
        setLoading(true);
        try {
            const startRegistration = getStartRegistration();
            if (!startRegistration) throw new Error("Passkey unavailable");

            const resp = await fetch(`${API_URL}/users/2fa/setup/webauthn/register/options`, { method: 'POST', headers });
            const options = await resp.json();
            const attResp = await startRegistration(options);
            const verifyResp = await fetch(`${API_URL}/users/2fa/setup/webauthn/register/verify`, {
                method: 'POST', headers, body: JSON.stringify({ credential: attResp })
            });
            if (verifyResp.ok) console.log("Passkey Registered!");
        } catch (e) { console.error("Passkey Error: " + e.message); }
        setLoading(false);
    };

    const disable2FA = async () => {
        if (!window.confirm(t('settings.delete_confirm'))) return;
        await fetch(`${API_URL}/users/2fa/disable`, { method: 'POST', headers });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="max-w-xl mx-auto w-full p-4 flex-grow">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-black mb-6">
                    <ChevronLeft size={20} /> {t('btn.back')}
                </button>

                <h1 className="text-2xl font-bold mb-6 text-gray-800">{t('settings.title')}</h1>

                {/* Tab Navigation */}
                <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm border">
                    <button
                        onClick={() => setActiveTab('app')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'app' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {t('settings.tab_app', 'App Settings')}
                    </button>
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'account' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {t('settings.tab_account', 'Account & Security')}
                    </button>
                </div>

                {/* === APP SETTINGS TAB === */}
                {activeTab === 'app' && (
                    <div className="space-y-6">
                        {/* Push Notifications */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Bell className="text-pink-600" /> {t('settings.push_title', 'Benachrichtigungen')}
                            </h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-gray-800">{t('settings.push_label', 'Push-Benachrichtigungen')}</div>
                                    <div className="text-xs text-gray-500">{t('settings.push_desc', 'Erhalte Updates zu neuen Matches und Nachrichten.')}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={notificationsEnabled}
                                        onChange={(e) => saveAppPrefs({ notifications_enabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Theme Settings (Example of extended functionality) */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <PhoneIcon className="text-blue-600" /> {t('settings.display_title', 'Darstellung')}
                            </h2>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => saveAppPrefs({ theme: 'light' })}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${theme === 'light' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Sun size={20} />
                                    <span className="text-xs font-bold">Light</span>
                                </button>
                                <button
                                    onClick={() => saveAppPrefs({ theme: 'dark' })}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Moon size={20} />
                                    <span className="text-xs font-bold">Dark</span>
                                </button>
                                <button
                                    onClick={() => saveAppPrefs({ theme: 'system' })}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${theme === 'system' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Smartphone size={20} />
                                    <span className="text-xs font-bold">Auto</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === ACCOUNT TAB === */}
                {activeTab === 'account' && (
                    <div className="space-y-6">
                        {/* 2FA Section */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-500">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Shield className="text-purple-600" /> {t('settings.2fa_title')}
                            </h2>

                            {!totpSetup ? (
                                <div className="space-y-3">
                                    <button onClick={startTotp} className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <span className="font-bold flex items-center gap-2"><Smartphone size={18} /> {t('settings.btn_setup_totp')}</span>
                                    </button>
                                    <button onClick={enableEmail2FA} className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <span className="font-bold flex items-center gap-2"><Mail size={18} /> {t('settings.btn_setup_email')}</span>
                                    </button>
                                    <button onClick={enablePasskey} className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                                        <span className="font-bold flex items-center gap-2"><Fingerprint size={18} /> {t('settings.btn_setup_passkey')}</span>
                                    </button>
                                    <button onClick={disable2FA} className="w-full text-center text-red-500 text-sm font-bold mt-2">
                                        {t('settings.btn_disable_2fa')}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-bold mb-2">Scan QR Code</h3>
                                    <div className="bg-white p-2 inline-block mb-4 border">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(totpSetup.uri)}`} alt="QR" />
                                    </div>
                                    <p className="text-xs font-mono mb-4 break-all text-gray-500">Secret: {totpSetup.secret}</p>
                                    <input
                                        className="w-full p-2 border rounded mb-2"
                                        placeholder="123456"
                                        value={totpCode}
                                        onChange={e => setTotpCode(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={verifyTotp} className="bg-purple-600 text-white px-4 py-2 rounded font-bold">Verify</button>
                                        <button onClick={() => setTotpSetup(null)} className="text-gray-500 px-4 py-2">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Email / PW Change */}
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('settings.change_mail')}</label>
                                <div className="flex items-center border rounded-lg bg-gray-50 px-3">
                                    <Mail size={18} className="text-gray-400" />
                                    <input
                                        className="w-full p-3 bg-transparent focus:outline-none"
                                        placeholder="new@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('settings.change_pw')}</label>
                                <div className="flex items-center border rounded-lg bg-gray-50 px-3">
                                    <Lock size={18} className="text-gray-400" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full p-3 bg-transparent focus:outline-none"
                                        placeholder={t('settings.new_pw')}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                                        type="button"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">{t('settings.curr_pw')}</label>
                                <input
                                    type="password"
                                    className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-black focus:outline-none mb-4"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                />
                                <button onClick={handleUpdate} disabled={loading} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800">
                                    {loading ? "..." : t('btn.save')}
                                </button>
                            </div>
                        </div>

                        {/* Delete Account */}
                        <button onClick={handleDelete} className="w-full text-red-600 border border-red-200 bg-red-50 py-3 rounded-lg font-bold hover:bg-red-100 flex justify-center items-center gap-2">
                            <Trash2 size={18} /> {t('settings.delete_acc')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountSettings;