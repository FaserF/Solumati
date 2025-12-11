import { useState } from 'react';
import { API_URL } from '../../config';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';

const ResetPassword = () => {
    // const { t } = useI18n();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const onSuccess = () => navigate('/login');
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!password) return alert("Passwort fehlt.");
        if (password !== confirm) return alert("Passwörter stimmen nicht überein.");

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password })
            });

            if (res.ok) {
                alert("Passwort erfolgreich geändert! Bitte neu einloggen.");
                onSuccess();
            } else {
                const err = await res.json();
                alert("Fehler: " + (err.detail || "Link ungültig/abgelaufen."));
            }
        } catch {
            alert("Netzwerkfehler");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Neues Passwort setzen</h2>

                <input
                    type="password"
                    className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Neues Passwort"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <input
                    type="password"
                    className="w-full p-4 border rounded-lg bg-gray-50 mb-6 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Passwort bestätigen"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
                >
                    {loading ? "Speichern..." : "Passwort speichern"}
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;