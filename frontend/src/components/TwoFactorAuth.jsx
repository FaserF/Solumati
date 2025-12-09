import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Shield, Smartphone, Mail, Fingerprint, HelpCircle, ArrowLeft } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

const TwoFactorAuth = ({ tempAuth, onVerified, onCancel, t }) => {
    const [view, setView] = useState('verify'); // verify, menu, emergency, reset_init, reset_verify
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Auto-trigger passkey if method matches (only in verify view)
    useEffect(() => {
        if (view === 'verify' && tempAuth.method === 'passkey') {
            handlePasskey();
        }
    }, [view, tempAuth.method]);

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
                            <HelpCircle size={14} /> Trouble logging in?
                        </button>
                    </>
                )}

                {/* 2. MENU VIEW */}
                {view === 'menu' && (
                    <div className="space-y-3 pt-6">
                        <h3 className="text-xl font-bold mb-4">Account Recovery</h3>
                        <button onClick={() => setView('reset_init')} className="w-full p-4 border rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                            <span className="font-bold text-gray-700">Lost 2FA Device?</span>
                            <span className="text-gray-400 group-hover:text-black">Reset via Email &rarr;</span>
                        </button>
                        <button onClick={() => setView('emergency')} className="w-full p-4 border border-red-100 rounded-xl hover:bg-red-50 flex items-center justify-between group">
                            <span className="font-bold text-red-600">Admin Emergency</span>
                            <span className="text-red-400 group-hover:text-red-700">Server Reset &rarr;</span>
                        </button>
                    </div>
                )}

                 {/* 3. STANDARD RESET INIT (Password) */}
                 {view === 'reset_init' && (
                    <>
                        {renderHeader(<Mail size={32} />, "Reset 2FA", "Enter your password to receive a reset code via email.")}
                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}
                        <input key="reset-password" type="password" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            placeholder="Current Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <button onClick={handleResetInit} disabled={loading} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">{loading ? "Sending..." : "Send Code"}</button>
                    </>
                )}

                {/* 4. STANDARD RESET CONFIRM (Code) */}
                {view === 'reset_verify' && (
                    <>
                        {renderHeader(<Shield size={32} />, "Enter Code", "Enter the 6-digit code sent to your email.")}
                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}
                        <input key="reset-code" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            placeholder="123456" maxLength={6} value={code} onChange={e => setCode(e.target.value)} />
                        <button onClick={handleResetConfirm} disabled={loading} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">{loading ? "Verifying..." : "Reset 2FA"}</button>
                    </>
                )}

                {/* 5. EMERGENCY RESET */}
                {view === 'emergency' && (
                    <>
                        {renderHeader(<Shield size={32} />, "Emergency Reset", "Admin: Enter password to flag account for reset on next reboot.")}
                        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}
                        <input key="emergency-password" type="password" className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            placeholder="Admin Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <button onClick={handleEmergencyReset} disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 transition">{loading ? "Processing..." : "Flag for Reset"}</button>
                    </>
                )}

                <button onClick={onCancel} className="w-full mt-6 text-gray-400 hover:text-black transition text-sm">
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default TwoFactorAuth;