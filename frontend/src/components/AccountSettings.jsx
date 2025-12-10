import React, { useState, useEffect } from 'react';
import { Lock, Mail, Trash2, ChevronLeft, Eye, EyeOff, Shield, Smartphone, Fingerprint, Bell, Moon, Sun, Smartphone as PhoneIcon, RefreshCcw, AlertTriangle, Link as LinkIcon, Github, Chrome, Globe } from 'lucide-react';
import { API_URL, APP_VERSION } from '../config';
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
    const [connectedAccounts, setConnectedAccounts] = useState([]);

    // --- 2FA State ---
    const [securityState, setSecurityState] = useState({
        current_method: 'none',
        has_totp: false,
        has_passkeys: false
    });

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

                    // Update Security State
                    setSecurityState({
                        current_method: userData.two_factor_method || 'none',
                        has_totp: userData.has_totp || false,
                        has_passkeys: userData.has_passkeys || false
                    });
                }

                // Fetch Connected Accounts
                const connRes = await fetch(`${API_URL}/auth/oauth/connections`, { headers });
                if (connRes.ok) {
                    setConnectedAccounts(await connRes.json());
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
            return alert(t('alert.pw_mismatch', "New passwords do not match!"));
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
            alert(t('alert.totp_enabled', "TOTP successfully enabled!"));
            setTotpSetup(null);
        } else { alert(t('alert.invalid_code', "Invalid Code")); }
    };

    const enableEmail2FA = async () => {
        try {
            const res = await fetch(`${API_URL}/users/2fa/setup/email`, { method: 'POST', headers });
            if (res.ok) alert(t('alert.email_2fa_enabled', "Email 2FA successfully enabled!"));
            else {
                const err = await res.json();
                alert(t('alert.error', "Error: ") + err.detail);
            }
        } catch (e) { alert(t('alert.network_error', "Network Error")); }
    };

    const enablePasskey = async () => {
        setLoading(true);
        try {
            // Get options
            const resp = await fetch(`${API_URL}/users/2fa/setup/webauthn/register/options`, { method: 'POST', headers });
            if (!resp.ok) throw new Error("Failed to get registration options");

            const options = await resp.json();
            console.log("WebAuthn Options:", options);
            if (!options || !options.challenge) throw new Error("Invalid registration options received");

            const attResp = await startRegistration(options);

            const verifyResp = await fetch(`${API_URL}/users/2fa/setup/webauthn/register/verify`, {
                method: 'POST', headers, body: JSON.stringify({ credential: attResp })
            });
            if (verifyResp.ok) alert(t('alert.passkey_success', "Passkey registered successfully!"));
            else alert(t('alert.registration_failed', "Registration failed."));
        } catch (e) {
            console.error("Passkey Error:", e);
            alert(t('alert.passkey_error', "Passkey Error: ") + e.message);
        }
        setLoading(false);
    };

    const disable2FA = async () => {
        if (!window.confirm(t('settings.delete_confirm'))) return;
        await fetch(`${API_URL}/users/2fa/disable`, { method: 'POST', headers });
        alert(t('alert.2fa_disabled', "2FA Disabled."));
        setSecurityState({ current_method: 'none', has_totp: false, has_passkeys: false });
    };

    const removeMethod = async (method) => {
        if (!window.confirm(t('settings.delete_confirm'))) return;
        try {
            const res = await fetch(`${API_URL}/users/2fa/methods/${method}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                const data = await res.json();

                // Construct new local state
                setSecurityState(prev => {
                    const newState = { ...prev, current_method: data.active_method };
                    if (method === 'totp') newState.has_totp = false;
                    if (method === 'passkey') newState.has_passkeys = false;
                    return newState;
                });
            } else {
                alert("Error removing method.");
            }
        } catch (e) { console.error(e); alert("Network Error"); }
    };

    // --- OAuth Handlers ---
    const handleConnect = (provider) => {
        // Redirect to OAuth login with state param to indicate linking
        const state = `link:${user.user_id}`;
        window.location.href = `${API_URL}/auth/oauth/${provider}/login?state=${state}`;
    };

    const handleDisconnect = async (provider) => {
        if (!window.confirm(t('settings.disconnect_confirm', 'Disconnect this account?'))) return;
        try {
            const res = await fetch(`${API_URL}/auth/oauth/connections/${provider}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                setConnectedAccounts(prev => prev.filter(a => a.provider !== provider));
            } else {
                const err = await res.json();
                alert("Error: " + err.detail);
            }
        } catch (e) { alert("Network Error"); }
    };

    const isConnected = (provider) => {
        return connectedAccounts.some(a => a.provider === provider);
    }

    // --- Permissions Checks ---
    const canDeleteAccount = user.role !== 'guest' && user.role !== 'admin';
    const canEditAccount = user.role !== 'guest' && !user.is_guest;

    // Check if 2FA is already active (Legacy/Global check, mostly unused now in favor of securityState)
    // const has2FA = user.two_factor_method && user.two_factor_method !== 'none';

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

                    <button
                        onClick={() => setActiveTab('account')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition ${activeTab === 'account' ? 'bg-black dark:bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
                    >
                        {t('settings.tab_account', 'Account & Security')}
                    </button>
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
                        {!canEditAccount && (
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                                <AlertTriangle size={18} />
                                {t('settings.guest_readonly', 'Guest accounts are read-only.')}
                            </div>
                        )}

                        {/* Ghost Mode (Visibility) */}
                        {user.role !== 'admin' && user.role !== 'guest' && !user.is_guest && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border dark:border-gray-700">
                                <h2 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                                    <EyeOff className="text-gray-600 dark:text-gray-400" /> {t('settings.ghost_mode', 'Ghost Mode')}
                                </h2>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-gray-800 dark:text-gray-200">{t('settings.ghost_mode_label', 'Hide Profile')}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-300">{t('settings.ghost_mode_desc', 'You will not be visible to others and cannot see matches.')}</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={user.is_visible_in_matches === false}
                                            onChange={(e) => {
                                                // If checked (true), we want is_visible_in_matches = false
                                                // If unchecked (false), we want is_visible_in_matches = true
                                                const shouldBeHidden = e.target.checked;

                                                // Optimistic update locally? We need to call API.
                                                // We can reuse a generic update function or call fetch directly.
                                                // Let's call fetch directly similar to handleUpdate but for this specific field.
                                                // Actually, handleUpdate uses 'email' and 'password' state.
                                                // We better create a specific handler.

                                                const updateVisibility = async () => {
                                                    try {
                                                        const res = await fetch(`${API_URL}/users/${user.user_id}/account`, {
                                                            method: 'PUT',
                                                            headers,
                                                            body: JSON.stringify({ is_visible_in_matches: !shouldBeHidden })
                                                        });
                                                        if (res.ok) {
                                                            // We need to update local user state or trigger a refresh?
                                                            // AccountSettings receives 'user' prop. It cannot mutate it directly to affect parent.
                                                            // Ideally AccountSettings should have an onUpdateUser callback or similar.
                                                            // But for now, we can maybe reload? Or just alert success.
                                                            // The user prop won't change until parent re-renders.
                                                            // Let's alert and maybe refresh page or rely on user navigation.
                                                            // BETTER: The user prop in AccountSettings is static?
                                                            // Dashboard re-fetches logic?
                                                            // Actually, let's just make the request. The UI toggle might lag if we don't have local state.
                                                            // Let's add local state for this toggle initialized from user prop.
                                                        }
                                                    } catch (e) { console.error(e); }
                                                };
                                                updateVisibility();
                                                // We can't easily update the parent 'user' object from here without a huge refactor.
                                                // So the toggle visually might snap back if we don't manage it locally.
                                                // Let's rely on the fact that we changed it server side.
                                                // But for better UX, we should force a reload or update context.
                                                // Since we don't have a global user context setter passed down everywhere easily (App.jsx hassetUser),
                                                // and we passed onLogout, onBack... maybe we just alert "Saved".
                                                alert(t('settings.saved', "Settings saved."));
                                                window.location.reload(); // Brute force update so App.jsx fetches fresh user data?
                                                // Or better: AccountSettings didn't have setUser.
                                                // App.jsx passes `user` state.
                                                // Verification plan says "Toggle ON -> Verify saved".
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* 2FA Section - Granular Managment */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border-l-4 border-purple-500 dark:border-purple-400">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                                <Shield className="text-purple-600 dark:text-purple-400" /> {t('settings.2fa_title', 'Two-Factor Authentication (2FA)')}
                            </h2>

                            {/* Setup/Verify UI (Overlay/Inline) */}
                            {totpSetup ? (
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                                    <h3 className="font-bold mb-2 dark:text-white">{t('settings.scan_qr', 'Scan QR Code')}</h3>
                                    <div className="bg-white p-2 inline-block mb-4 border rounded">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(totpSetup.uri)}`} alt="QR" />
                                    </div>
                                    <p className="text-xs font-mono mb-4 break-all text-gray-500 dark:text-gray-300">{t('settings.secret', 'Secret:')} {totpSetup.secret}</p>
                                    <input
                                        className="w-full p-2 border rounded mb-2 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white"
                                        placeholder="123456"
                                        value={totpCode}
                                        onChange={e => setTotpCode(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={verifyTotp} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700">{t('btn.verify', 'Verify')}</button>
                                        <button onClick={() => setTotpSetup(null)} className="text-gray-500 dark:text-gray-400 px-4 py-2 hover:text-gray-700 dark:hover:text-white">{t('btn.cancel', 'Cancel')}</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* App Authenticator (TOTP) */}
                                    <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-750">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg"><Smartphone size={20} /></div>
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-gray-200">Authenticator App</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {securityState.has_totp ? (
                                                        <span className="text-green-600 font-bold flex items-center gap-1">Enabled {securityState.current_method === 'totp' && "(Active)"}</span>
                                                    ) : "Not configured"}
                                                </div>
                                            </div>
                                        </div>
                                        {securityState.has_totp ? (
                                            <button
                                                onClick={() => removeMethod('totp')}
                                                disabled={!canEditAccount}
                                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition"
                                                title="Remove TOTP"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <button onClick={startTotp} disabled={!canEditAccount} className="px-3 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow-sm text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">
                                                Setup
                                            </button>
                                        )}
                                    </div>

                                    {/* Passkeys */}
                                    <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-750">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Fingerprint size={20} /></div>
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-gray-200">Passkeys</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {securityState.has_passkeys ? (
                                                        <span className="text-green-600 font-bold flex items-center gap-1">Enabled {securityState.current_method === 'passkey' && "(Active)"}</span>
                                                    ) : "Not configured"}
                                                </div>
                                            </div>
                                        </div>
                                        {securityState.has_passkeys ? (
                                            <button
                                                onClick={() => removeMethod('passkey')}
                                                disabled={!canEditAccount}
                                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition"
                                                title="Remove Passkeys"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <button onClick={enablePasskey} disabled={!canEditAccount} className="px-3 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow-sm text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">
                                                Add
                                            </button>
                                        )}
                                    </div>

                                    {/* Email 2FA */}
                                    {globalConfig.email_2fa_enabled && (
                                        <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-750">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-lg"><Mail size={20} /></div>
                                                <div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">Email Verification</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {securityState.current_method === 'email' ? (
                                                            <span className="text-green-600 font-bold">Active Method</span>
                                                        ) : "Available"}
                                                    </div>
                                                </div>
                                            </div>
                                            {securityState.current_method === 'email' ? (
                                                <button
                                                    onClick={() => removeMethod('email')}
                                                    disabled={!canEditAccount}
                                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition"
                                                    title="Turn Off Email 2FA"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <button onClick={enableEmail2FA} disabled={!canEditAccount} className="px-3 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded shadow-sm text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">
                                                    Use This
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Email / PW Change */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border dark:border-gray-700">
                            {/* Email */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-2">{t('settings.change_mail')}</label>
                                <div className={`flex items-center border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 ${!canEditAccount ? 'opacity-50' : ''}`}>
                                    <Mail size={18} className="text-gray-400 dark:text-gray-300" />
                                    <input
                                        className="w-full p-3 bg-transparent focus:outline-none text-gray-900 dark:text-white"
                                        placeholder="new@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        disabled={!canEditAccount}
                                    />
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-300 uppercase mb-2">{t('settings.change_pw')}</label>
                                <div className={`flex items-center border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 mb-2 ${!canEditAccount ? 'opacity-50' : ''}`}>
                                    <Lock size={18} className="text-gray-400 dark:text-gray-300" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full p-3 bg-transparent focus:outline-none text-gray-900 dark:text-white"
                                        placeholder={t('settings.new_pw')}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        disabled={!canEditAccount}
                                    />
                                    <button
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white focus:outline-none p-1"
                                        type="button"
                                        disabled={!canEditAccount}
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className={`flex items-center border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 ${!canEditAccount ? 'opacity-50' : ''}`}>
                                    <Lock size={18} className="text-gray-400 dark:text-gray-300" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        className="w-full p-3 bg-transparent focus:outline-none text-gray-900 dark:text-white"
                                        placeholder={t('settings.confirm_pw', "Confirm New Password")}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        disabled={!canEditAccount}
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
                                    className="w-full p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-gray-500 focus:outline-none mb-4 disabled:opacity-50"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    disabled={!canEditAccount}
                                />
                                <button onClick={handleUpdate} disabled={loading || !canEditAccount} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? "..." : t('btn.save')}
                                </button>
                            </div>
                        </div>

                        {/* Connected Accounts */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border dark:border-gray-700">
                            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                                <LinkIcon className="text-blue-500" /> {t('settings.connected_accounts', 'Connected Accounts')}
                            </h2>
                            <div className="space-y-3">
                                {/* GitHub */}
                                <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <Github size={20} className="text-gray-700 dark:text-gray-300" />
                                        <span className="font-bold dark:text-white">GitHub</span>
                                    </div>
                                    {isConnected('github') ? (
                                        <button onClick={() => handleDisconnect('github')} className="text-sm text-red-500 hover:underline">{t('btn.disconnect', 'Disconnect')}</button>
                                    ) : (
                                        <button onClick={() => handleConnect('github')} className="text-sm text-blue-600 hover:underline font-bold">{t('btn.connect', 'Connect')}</button>
                                    )}
                                </div>
                                {/* Google */}
                                <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <Chrome size={20} className="text-red-500" />
                                        <span className="font-bold dark:text-white">Google</span>
                                    </div>
                                    {isConnected('google') ? (
                                        <button onClick={() => handleDisconnect('google')} className="text-sm text-red-500 hover:underline">{t('btn.disconnect', 'Disconnect')}</button>
                                    ) : (
                                        <button onClick={() => handleConnect('google')} className="text-sm text-blue-600 hover:underline font-bold">{t('btn.connect', 'Connect')}</button>
                                    )}
                                </div>
                                {/* Microsoft */}
                                <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <Globe size={20} className="text-blue-500" />
                                        <span className="font-bold dark:text-white">Microsoft</span>
                                    </div>
                                    {isConnected('microsoft') ? (
                                        <button onClick={() => handleDisconnect('microsoft')} className="text-sm text-red-500 hover:underline">{t('btn.disconnect', 'Disconnect')}</button>
                                    ) : (
                                        <button onClick={() => handleConnect('microsoft')} className="text-sm text-blue-600 hover:underline font-bold">{t('btn.connect', 'Connect')}</button>
                                    )}
                                </div>
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
                    <p>
                        <a href={`https://github.com/FaserF/Solumati/releases/tag/${globalConfig?.backend_version}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-gray-500">
                            Solumati v{globalConfig?.backend_version || "..."}
                        </a>
                        <span> (FE: </span>
                        <a href={`https://github.com/FaserF/Solumati/releases/tag/v${APP_VERSION}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-gray-500">
                            {APP_VERSION}
                        </a>)
                    </p>
                    <p>All rights reserved.</p>
                </div>
            </div>
        </div >
    );
};

export default AccountSettings;