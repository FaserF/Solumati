import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { Shield, Smartphone, Mail, Fingerprint, HelpCircle, ArrowLeft } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

const TwoFactorAuth = () => {
    const { tempAuth, finalizeLogin, logout } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();

    // 1. Declare all hooks first (Rules of Hooks)
    const [view, setView] = useState('verify'); // Default, will update in effect
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Handle missing auth (redirect)
    useEffect(() => {
        if (!tempAuth) {
            navigate('/login');
        } else if (tempAuth.available_methods && tempAuth.available_methods.length > 1) {
            setView('select_method');
        }
    }, [tempAuth, navigate]);

    // 3. Early return for rendering only (after hooks)
    if (!tempAuth) return null;

    const onVerified = (data) => {
        finalizeLogin(data);
        navigate('/dashboard');
    };
    const onCancel = () => {
        logout();
        navigate('/login');
    };

    // Auto-trigger passkey if method matches (only in verify view)
    useEffect(() => {
        if (view === 'verify' && tempAuth.method === 'passkey') {
            handlePasskey();
        }
    }, [view, tempAuth.method]);

    const handleMethodSelect = (method) => {
        tempAuth.method = method; // Update local ref of method
        setView('verify');
    };

    // --- HANDLERS ---

    const handleVerifySubmit = async () => {
        if (!code && tempAuth.method !== 'passkey') return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_URL}/auth/2fa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: tempAuth.user_id, code })
            });
            if (res.ok) onVerified(await res.json());
            else setError(t('2fa.error'));
        } catch (e) { setError("Network Error"); }
        setLoading(false);
    };

    const handlePasskey = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_URL}/auth/2fa/webauthn/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: tempAuth.user_id })
            });
            const data = await resp.json();
            const asseResp = await startAuthentication(data.options);
            const verifyResp = await fetch(`${API_URL}/auth/2fa/webauthn/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: tempAuth.user_id, credential: asseResp })
            });
            if (verifyResp.ok) onVerified(await verifyResp.json());
            else setError("Passkey verification failed.");
        } catch (e) { console.error(e); setError("Passkey error: " + e.message); }
        setLoading(false);
    };

    const handleEmergencyReset = async () => {
        if (!password) return;
        setLoading(true); setError(null);
        try {
            // We need username. `tempAuth` usually has it if passed from App/Login
            const username = tempAuth.username || tempAuth.email;
            if (!username) { setError("Username missing for reset."); setLoading(false); return; }

            const res = await fetch(`${API_URL}/auth/admin/emergency-flag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                onCancel(); // Force logout/reset view
            } else {
                setError(data.detail || "Reset failed");
            }
        } catch (e) { setError("Network Error"); }
        setLoading(false);
    };

    const handleResetInit = async () => {
        if (!password) return;
        setLoading(true); setError(null);
        try {
            const username = tempAuth.username || tempAuth.email;
            if (!username) { setError("Username missing."); setLoading(false); return; }

            const res = await fetch(`${API_URL}/auth/reset-2fa/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                setCode(""); // Clear 2FA code input for reuse
                setView('reset_verify');
            } else {
                const err = await res.json();
                setError(err.detail);
            }
        } catch (e) { setError("Network Error"); }
        setLoading(false);
    };

    const handleResetConfirm = async () => {
        if (!code) return;
        setLoading(true); setError(null);
        try {
            const username = tempAuth.username || tempAuth.email;
            const res = await fetch(`${API_URL}/auth/reset-2fa/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, code })
            });
            if (res.ok) {
                alert("2FA Reset Success! Please login again.");
                onCancel();
            } else {
                const err = await res.json();
                setError(err.detail);
            }
        } catch (e) { setError("Network Error"); }
        setLoading(false);
    };


    // --- RENDERS ---
    const renderHeader = (icon, title, desc) => (
        <>
            <div className="mb-4 flex justify-center">
                <div className="bg-pink-100 p-4 rounded-full text-pink-600">{icon}</div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">{title}</h2>
            {desc && <p className="text-gray-500 mb-6 text-sm">{desc}</p>}
        </>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center animate-in zoom-in-95 duration-300">

                {/* BACK BUTTON (If not verify) */}
                {view !== 'verify' && (
                    <button onClick={() => { setView('verify'); setError(null); }} className="absolute top-4 left-4 text-gray-400 hover:text-black mt-8 ml-8">
                        <ArrowLeft />
                    </button>
                )}

                {/* 0. SELECT METHOD VIEW */}
                {view === 'select_method' && (
                    <div className="space-y-4">
                        <div className="mb-4 flex justify-center">
                            <div className="bg-pink-100 p-4 rounded-full text-pink-600"><Shield size={32} /></div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-800">{t('2fa.select_method_title', 'Select 2FA Method')}</h2>
                        <p className="text-gray-500 mb-6 text-sm">Please choose how you want to authenticate.</p>

                        {tempAuth.available_methods.includes('totp') && (
                            <button onClick={() => handleMethodSelect('totp')} className="w-full p-4 border rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                                <span className="font-bold text-gray-700 flex items-center gap-2"><Smartphone size={20} /> Authenticator App</span>
                                <span className="text-gray-400 group-hover:text-black">&rarr;</span>
                            </button>
                        )}
                        {tempAuth.available_methods.includes('passkey') && (
                            <button onClick={() => handleMethodSelect('passkey')} className="w-full p-4 border rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                                <span className="font-bold text-gray-700 flex items-center gap-2"><Fingerprint size={20} /> Passkey</span>
                                <span className="text-gray-400 group-hover:text-black">&rarr;</span>
                            </button>
                        )}
                        {tempAuth.available_methods.includes('email') && (
                            <button onClick={() => handleMethodSelect('email')} className="w-full p-4 border rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                                <span className="font-bold text-gray-700 flex items-center gap-2"><Mail size={20} /> Email Code</span>
                                <span className="text-gray-400 group-hover:text-black">&rarr;</span>
                            </button>
                        )}
                    </div>
                )}

                {/* 1. VERIFY VIEW */}
                {view === 'verify' && (
                    <>
                        {renderHeader(
                            tempAuth.method === 'totp' ? <Smartphone size={32} /> : tempAuth.method === 'email' ? <Mail size={32} /> : <Fingerprint size={32} />,
                            t('2fa.title'),
                            tempAuth.method === 'passkey' ? t('2fa.desc_passkey') : t('2fa.desc_totp')
                        )}

                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}

                        {tempAuth.method !== 'passkey' && (
                            <input key="verify-code" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                placeholder="123456" maxLength={6} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifySubmit()} />
                        )}

                        {tempAuth.method === 'passkey' ? (
                            <button onClick={handlePasskey} disabled={loading} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition mb-2">{t('2fa.btn_passkey')}</button>
                        ) : (
                            <button onClick={handleVerifySubmit} disabled={loading} className="w-full bg-pink-600 text-white py-4 rounded-lg font-bold hover:bg-pink-700 transition">{loading ? "..." : t('2fa.btn_verify')}</button>
                        )}

                        <button onClick={() => setView('menu')} className="mt-6 text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mx-auto">
                            <HelpCircle size={14} /> {t('2fa.trouble_logging_in', 'Trouble logging in?')}
                        </button>
                    </>
                )}

                {/* 2. MENU VIEW */}
                {view === 'menu' && (
                    <div className="space-y-3 pt-6">
                        <h3 className="text-xl font-bold mb-4">{t('2fa.recovery_title', 'Account Recovery')}</h3>
                        <button onClick={() => setView('reset_init')} className="w-full p-4 border rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                            <span className="font-bold text-gray-700">{t('2fa.lost_device', 'Lost 2FA Device?')}</span>
                            <span className="text-gray-400 group-hover:text-black">{t('2fa.reset_via_email', 'Reset via Email')} &rarr;</span>
                        </button>
                        <button onClick={() => setView('emergency')} className="w-full p-4 border border-red-100 rounded-xl hover:bg-red-50 flex items-center justify-between group">
                            <span className="font-bold text-red-600">{t('2fa.admin_emergency', 'Admin Emergency')}</span>
                            <span className="text-red-400 group-hover:text-red-700">{t('2fa.server_reset', 'Server Reset')} &rarr;</span>
                        </button>
                    </div>
                )}

                {/* 3. STANDARD RESET INIT (Password) */}
                {view === 'reset_init' && (
                    <>
                        {renderHeader(<Mail size={32} />, t('2fa.reset_title', 'Reset 2FA'), t('2fa.reset_desc', 'Enter your password to receive a reset code via email.'))}
                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}
                        <input key="reset-password" type="password" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            placeholder={t('label.password', 'Password')} value={password} onChange={e => setPassword(e.target.value)} />
                        <button onClick={handleResetInit} disabled={loading} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">{loading ? t('2fa.status_sending', 'Sending...') : t('2fa.btn_send_code', 'Send Code')}</button>
                    </>
                )}

                {/* 4. STANDARD RESET CONFIRM (Code) */}
                {view === 'reset_verify' && (
                    <>
                        {renderHeader(<Shield size={32} />, t('2fa.enter_code_title', 'Enter Code'), t('2fa.enter_code_desc', 'Enter the 6-digit code sent to your email.'))}
                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}
                        <input key="reset-code" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            placeholder="123456" maxLength={6} value={code} onChange={e => setCode(e.target.value)} />
                        <button onClick={handleResetConfirm} disabled={loading} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">{loading ? t('2fa.status_verifying', 'Verifying...') : t('2fa.btn_reset', 'Reset 2FA')}</button>
                    </>
                )}

                {/* 5. EMERGENCY RESET */}
                {view === 'emergency' && (
                    <>
                        {renderHeader(<Shield size={32} />, t('2fa.emergency_title', 'Emergency Reset'), t('2fa.emergency_desc', 'Admin: Enter password to flag account for reset on next reboot.'))}
                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}
                        <input key="emergency-password" type="password" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            placeholder={t('label.password', 'Admin Password')} value={password} onChange={e => setPassword(e.target.value)} />
                        <button onClick={handleEmergencyReset} disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 transition">{loading ? t('2fa.status_processing', 'Processing...') : t('2fa.btn_flag_reset', 'Flag for Reset')}</button>
                    </>
                )}

                <button onClick={onCancel} className="w-full mt-6 text-gray-400 hover:text-black transition text-sm">
                    {t('btn.back_login', 'Back to Login')}
                </button>
            </div>
        </div>
    );
};

export default TwoFactorAuth;