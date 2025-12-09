import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Shield, Smartphone, Mail, Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';

const TwoFactorAuth = ({ tempAuth, onVerified, onCancel, t }) => {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Auto-trigger passkey if method matches
    useEffect(() => {
        if (tempAuth.method === 'passkey') {
            handlePasskey();
        }
    }, [tempAuth.method]);

    const handleSubmit = async () => {
        if (!code && tempAuth.method !== 'passkey') return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/auth/2fa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: tempAuth.user_id, code })
            });
            if (res.ok) {
                const data = await res.json();
                onVerified(data);
            } else {
                setError(t('2fa.error'));
            }
        } catch (e) {
            setError("Network Error");
        }
        setLoading(false);
    };

    const handlePasskey = async () => {
        setLoading(true);
        try {
            // 1. Get Options
            const resp = await fetch(`${API_URL}/auth/2fa/webauthn/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: tempAuth.user_id })
            });
            const data = await resp.json();
            const options = data.options;

            // 2. Interact with Browser
            const asseResp = await startAuthentication(options);

            // 3. Verify
            const verifyResp = await fetch(`${API_URL}/auth/2fa/webauthn/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: tempAuth.user_id,
                    credential: asseResp
                })
            });

            if (verifyResp.ok) {
                const data = await verifyResp.json();
                onVerified(data);
            } else {
                setError("Passkey verification failed.");
            }
        } catch (e) {
            console.error("Passkey Auth Error:", e);
            setError("Passkey error: " + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="mb-4 flex justify-center">
                    <div className="bg-pink-100 p-4 rounded-full text-pink-600">
                        {tempAuth.method === 'totp' && <Smartphone size={32} />}
                        {tempAuth.method === 'email' && <Mail size={32} />}
                        {tempAuth.method === 'passkey' && <Fingerprint size={32} />}
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-2 text-gray-800">{t('2fa.title')}</h2>

                {tempAuth.method === 'totp' && <p className="text-gray-500 mb-6">{t('2fa.desc_totp')}</p>}
                {tempAuth.method === 'email' && <p className="text-gray-500 mb-6">{t('2fa.desc_email')}</p>}
                {tempAuth.method === 'passkey' && <p className="text-gray-500 mb-6">{t('2fa.desc_passkey')}</p>}

                {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm font-bold">{error}</div>}

                {tempAuth.method !== 'passkey' && (
                    <input
                        className="w-full p-4 border rounded-lg bg-gray-50 mb-4 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-pink-500 focus:outline-none"
                        placeholder="123456"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                )}

                {tempAuth.method === 'passkey' ? (
                    <button onClick={handlePasskey} disabled={loading} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition mb-2">
                        {t('2fa.btn_passkey')}
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-pink-600 text-white py-4 rounded-lg font-bold hover:bg-pink-700 transition">
                        {loading ? "..." : t('2fa.btn_verify')}
                    </button>
                )}

                <button onClick={onCancel} className="w-full mt-4 text-gray-400 hover:text-black transition text-sm">
                    {t('btn.cancel')}
                </button>
            </div>
        </div>
    );
};

export default TwoFactorAuth;