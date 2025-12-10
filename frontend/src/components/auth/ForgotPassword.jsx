import { useState } from 'react';
import { API_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';

const ForgotPassword = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const onBack = () => navigate('/login');
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!email) return alert("Bitte E-Mail eingeben.");
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            // We always show success for security reasons (user enumeration)
            setSent(true);
        } catch (e) {
            alert("Netzwerkfehler");
        }
        setLoading(false);
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4 text-green-600">E-Mail versendet!</h2>
                    <p className="text-gray-600 mb-6">
                        Falls ein Account mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen gesendet.
                    </p>
                    <button onClick={onBack} className="w-full bg-black text-white py-3 rounded-lg font-bold">
                        Zurück zum Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Passwort vergessen</h2>
                <p className="text-sm text-gray-500 mb-6">Gib deine E-Mail Adresse ein, um dein Passwort zurückzusetzen.</p>

                <input
                    className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="name@beispiel.de"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-pink-600 text-white py-4 rounded-lg font-bold hover:bg-pink-700 transition disabled:opacity-50"
                >
                    {loading ? "Sende..." : "Link anfordern"}
                </button>

                <button onClick={onBack} className="w-full mt-4 text-gray-500 hover:text-black transition">
                    Abbrechen
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;