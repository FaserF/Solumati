import React, { useState, useEffect } from 'react';
import { Lock, Mail, Trash2, ChevronLeft, Eye, EyeOff, Shield, Smartphone, Fingerprint, Bell, Moon, Sun, Smartphone as PhoneIcon, RefreshCcw } from 'lucide-react';
import { API_URL } from '../config';
import { startRegistration } from '@simplewebauthn/browser';
import { useTheme } from './ThemeContext';

const AccountSettings = ({ user, onBack, onLogout, onResetPassword, t, globalConfig }) => {
    if (!user) return null;
    // --- Tabs ---
    const [activeTab, setActiveTab] = useState('app');

    // --- Account State ---
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);

    // --- App Settings State ---
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // Use Global Theme Context
    const { theme, setTheme } = useTheme();

    const [loading, setLoading] = useState(false);
    const [totpSetup, setTotpSetup] = useState(null);
    const [totpCode, setTotpCode] = useState("");

    const headers = {
        'Content-Type': 'application/json',
        'X-User-ID': user.user_id.toString()
    };

    // --- 1. Fetch User Data on Mount ---
    useEffect(() => {
        const fetchUserData = async () => {
            // ... Code to fetch user data ...
            // We need to keep this but we have to be careful about setting 'theme'
            // If we fetch user prefs, we should update the context
            try {
                const res = await fetch(`${API_URL}/users/${user.user_id}`, { headers });
                if (res.ok) {
                    const userData = await res.json();
                    setEmail(userData.email || "");

                    if (userData.app_settings) {
                        try {
                            const s = typeof userData.app_settings === 'string' ? JSON.parse(userData.app_settings) : userData.app_settings;
                            setNotificationsEnabled(s.notifications_enabled || false);
                            if (s.theme) setTheme(s.theme);
                        } catch (e) { console.error("Error parsing settings", e); }
                    }
                }
            } catch (e) { console.error("Failed to load user profile", e); }
        };
        fetchUserData();
    }, [user.user_id]);

    // Removed local useEffect for theme application as ThemeContext handles it

    // --- App Settings Handlers ---
    const saveAppPrefs = async (newPrefs) => {
        try {
            // Update State
            if (newPrefs.notifications_enabled !== undefined) setNotificationsEnabled(newPrefs.notifications_enabled);
            if (newPrefs.theme !== undefined) setTheme(newPrefs.theme);

            const payload = { ...newPrefs };

            // Handle Push Subscription
            if (newPrefs.notifications_enabled === true) {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                    console.warn("Push Notifications not supported.");
                    // Don't alert blocking errors, just revert toggle visually or warn gently
                    alert("Push Notifications are not supported in this browser environment.");
                    setNotificationsEnabled(false);
                    return;
                }

                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert("Permission denied. Please enable notifications.");
                    setNotificationsEnabled(false);
                    return;
                }
            }

            // Fire and forget (or await)
            await fetch(`${API_URL}/users/${user.user_id}/preferences`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

        } catch (e) { console.error("Failed to save prefs", e); }
    };

    // --- Account Handlers ---
    const handleUpdate = async () => {
        if (!currentPassword) return alert(t('settings.curr_pw') + " required");

        if (password && password !== confirmPassword) {
            return alert("New passwords do not match!");
        }

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
                alert(t('settings.success'));
                if (data.reverify_needed) onLogout();
                else {
                    setPassword("");
                    setConfirmPassword("");
                    setCurrentPassword("");
                }
            } else {
                const err = await res.json();
                alert("Error: " + err.detail);
            }
        } catch (e) { console.error("Network Error", e); alert("Network Error"); }
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
                alert("Deletion Error: " + err.detail);
            }
        } catch (e) { console.error("Network Error", e); }
    };

    // --- 2FA Handlers ---
    const startTotp = async () => {
        const res = await fetch(`${API_URL}/users/2fa/setup/totp`, { method: 'POST', headers });
        if (res.ok) { setTotpSetup(await res.json()); }
    };

    const verifyTotp = async () => {
        const res = await fetch(`${API_URL}/users/2fa/verify/totp`, {
            method: 'POST', headers, body: JSON.stringify({ token: totpCode })
        });
        if (res.ok) {
            alert("TOTP successfully enabled!");
            setTotpSetup(null);
        } else { alert("Invalid Code"); }
    };

    const enableEmail2FA = async () => {
        try {
            const res = await fetch(`${API_URL}/users/2fa/setup/email`, { method: 'POST', headers });
            if (res.ok) alert("Email 2FA successfully enabled!");
            else {
                const err = await res.json();
                alert("Error: " + err.detail);
            }
        } catch (e) { alert("Network Error"); }
    };

    const enablePasskey = async () => {
        setLoading(true);
        try {
            // Get options
            const resp = await fetch(`${API_URL}/users/2fa/setup/webauthn/register/options`, { method: 'POST', headers });
            if (!resp.ok) throw new Error("Failed to get registration options");

            const options = await resp.json();

            const startRegistration = getStartRegistration();
            if (!startRegistration) throw new Error("Passkey library not loaded.");

            const attResp = await startRegistration(options);

            const verifyResp = await fetch(`${API_URL}/users/2fa/setup/webauthn/register/verify`, {
                method: 'POST', headers, body: JSON.stringify({ credential: attResp })
            });
            if (verifyResp.ok) alert("Passkey registered successfully!");
            else alert("Registration failed.");
        } catch (e) {
            console.error("Passkey Error:", e);
            alert("Passkey Error: " + e.message);
        }
        setLoading(false);
    };

    const disable2FA = async () => {
        if (!window.confirm(t('settings.delete_confirm'))) return;
        await fetch(`${API_URL}/users/2fa/disable`, { method: 'POST', headers });
        alert("2FA Disabled.");
    };

    // --- Permissions Checks ---
    const canDeleteAccount = user.role !== 'guest' && user.role !== 'admin';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-xl mx-auto w-full p-4 flex-grow">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white mb-6">
                    <ChevronLeft size={20} /> {t('btn.back')}
                </button>

                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{t('settings.title')}</h1>

                {/* Tab Navigation */}
                <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 mb-6 shadow-sm border dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('app')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'app' ? 'bg-black dark:bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
                    >
                        {t('settings.tab_app', 'App Settings')}
                    </button>

                    {/* Guest Check: Disable Account Tab if Guest */}
                    {user.role !== 'guest' && !user.is_guest ? (
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'account' ? 'bg-black dark:bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
                        >
                            {t('settings.tab_account', 'Account & Security')}
                        </button>
                    ) : (
                        <div className="flex-1 py-2 text-sm font-medium text-gray-300 dark:text-gray-600 text-center cursor-not-allowed" title="Not available for guests">
                            {t('settings.tab_account', 'Account & Security')}
                        </div>
                    )}
                </div>

                {/* === APP SETTINGS TAB === */}
                {activeTab === 'app' && (
                    <div className="space-y-6">
                        {/* Push Notifications */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border dark:border-gray-700">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                                <Bell className="text-pink-600" /> {t('settings.push_title', 'Benachrichtigungen')}
                            </h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200">{t('settings.push_label', 'Push-Benachrichtigungen')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-300">{t('settings.push_desc', 'Erhalte Updates zu neuen Matches und Nachrichten.')}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={notificationsEnabled}
                                        onChange={(e) => saveAppPrefs({ notifications_enabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 dark:peer-focus:ring-pink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Theme Settings */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border dark:border-gray-700">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                                <PhoneIcon className="text-blue-600" /> {t('settings.display_title', 'Darstellung')}
                            </h2>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => saveAppPrefs({ theme: 'light' })}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition ${theme === 'light' ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900 dark:text-pink-100' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
                                >
                                    <Sun size={20} />
                                    <span className="text-xs font-bold">Light</span>
                                </button>
                                <button
                                    onClick={() => saveAppPrefs({ theme: 'dark' })}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition ${theme === 'dark' ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900 dark:text-pink-100' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
                                >
                                    <Moon size={20} />
                                    <span className="text-xs font-bold">Dark</span>
                                </button>
                                <button
                                    onClick={() => saveAppPrefs({ theme: 'system' })}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition ${theme === 'system' ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900 dark:text-pink-100' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
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
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border-l-4 border-purple-500 dark:border-purple-400">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                                <Shield className="text-purple-600 dark:text-purple-400" /> {t('settings.2fa_title')}
                            </h2>

                            {!totpSetup ? (
                                <div className="space-y-3">
                                    <button onClick={startTotp} className="w-full flex items-center justify-between p-4 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-200">
                                        <span className="font-bold flex items-center gap-2"><Smartphone size={18} /> {t('settings.btn_setup_totp')}</span>
                                    </button>

                                    {globalConfig.email_2fa_enabled && (
                                        <button onClick={enableEmail2FA} className="w-full flex items-center justify-between p-4 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-200">
                                            <span className="font-bold flex items-center gap-2"><Mail size={18} /> {t('settings.btn_setup_email')}</span>
                                        </button>
                                    )}

                                    <button onClick={enablePasskey} className="w-full flex items-center justify-between p-4 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-200">
                                        <span className="font-bold flex items-center gap-2"><Fingerprint size={18} /> {t('settings.btn_setup_passkey')}</span>
                                    </button>
                                    <button onClick={disable2FA} className="w-full text-center text-red-500 text-sm font-bold mt-2 hover:text-red-400">
                                        {t('settings.btn_disable_2fa')}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <h3 className="font-bold mb-2 dark:text-white">Scan QR Code</h3>
                                    <div className="bg-white p-2 inline-block mb-4 border rounded">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(totpSetup.uri)}`} alt="QR" />
                                    </div>
                                    <p className="text-xs font-mono mb-4 break-all text-gray-500 dark:text-gray-300">Secret: {totpSetup.secret}</p>
                                    <input
                                        className="w-full p-2 border rounded mb-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                        placeholder="123456"
                                        value={totpCode}
                                        onChange={e => setTotpCode(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={verifyTotp} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700">Verify</button>
                                        <button onClick={() => setTotpSetup(null)} className="text-gray-500 dark:text-gray-400 px-4 py-2 hover:text-gray-700 dark:hover:text-white">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Email / PW Change */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border dark:border-gray-700">
                            {/* Email */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-2">{t('settings.change_mail')}</label>
                                <div className="flex items-center border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 px-3">
                                    <Mail size={18} className="text-gray-400 dark:text-gray-300" />
                                    <input
                                        className="w-full p-3 bg-transparent focus:outline-none dark:text-white"
                                        placeholder="new@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-2">{t('settings.change_pw')}</label>
                                <div className="flex items-center border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 mb-2">
                                    <Lock size={18} className="text-gray-400 dark:text-gray-300" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full p-3 bg-transparent focus:outline-none dark:text-white"
                                        placeholder={t('settings.new_pw')}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white focus:outline-none p-1"
                                        type="button"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex items-center border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 px-3">
                                    <Lock size={18} className="text-gray-400 dark:text-gray-300" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full p-3 bg-transparent focus:outline-none dark:text-white"
                                        placeholder="Confirm New Password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                                <button onClick={onResetPassword} className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1 font-medium">
                                    <RefreshCcw size={12} /> {t('settings.btn_reset_pw', 'Reset Password (Logout)')}
                                </button>
                            </div>

                            {/* Current Password & Save */}
                            <div className="border-t dark:border-gray-700 pt-6 mt-6">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase mb-2">{t('settings.curr_pw')}</label>
                                <input
                                    type="password"
                                    className="w-full p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-gray-500 focus:outline-none mb-4"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                />
                                <button onClick={handleUpdate} disabled={loading} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition">
                                    {loading ? "..." : t('btn.save')}
                                </button>
                            </div>
                        </div>

                        {/* Delete Account */}
                        {canDeleteAccount && (
                            <button onClick={handleDelete} className="w-full text-red-600 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 py-3 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 flex justify-center items-center gap-2 transition">
                                <Trash2 size={18} /> {t('settings.delete_acc')}
                            </button>
                        )}
                    </div>
                )}
                <div className="mt-8 pt-6 border-t text-center text-xs text-gray-400">
                    <p>Solumati v{globalConfig?.backend_version || "..."} (FE: {APP_VERSION})</p>
                    <p>All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;