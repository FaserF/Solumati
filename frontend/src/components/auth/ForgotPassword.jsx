import { useState } from 'react';
import { API_URL } from '../../config';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { useI18n } from '../../context/I18nContext';

const ForgotPassword = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const { config } = useConfig(); // Access global config (might need load if not available?)
    // Actually useConfig might not be populated gracefully here if it's outside provider?
    // ForgotPassword page IS inside ConfigProvider usually.

    // But let's fetch local config to be safe/fresh or check existing provided context
    // Assuming ConfigProvider wraps routes.

    const onBack = () => navigate('/login');
    const [identifier, setIdentifier] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    // Safety check for mail
    const mailEnabled = config?.mail_enabled !== false; // Default true if logic fails/loading? Or false?
    // Ideally we assume enabled unless explicitly false, but better fetch fresh if critical.

    const handleSubmit = async () => {
        if (!identifier) return alert(t('forgot.enter_id', 'Please enter your email or username.'));
        setLoading(true);
        try {
            await fetch(`${API_URL}/auth/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier }) // Backend keys off "email" field for identifier
            });
            // We always show success for security reasons (user enumeration)
            setSent(true);
        } catch {
            alert(t('error.network', 'Network Error'));
        }
        setLoading(false);
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4 text-green-600">{t('forgot.sent_title', 'Request Sent!')}</h2>
                    <p className="text-gray-600 mb-6">
                        {t('forgot.sent_desc', 'If an account exists, we have sent a reset link to the associated email.')}
                    </p>
                    <button onClick={onBack} className="w-full bg-black text-white py-3 rounded-lg font-bold">
                        {t('forgot.back_login', 'Back to Login')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('forgot.title', 'Forgot Password')}</h2>

                {!mailEnabled && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 text-left">
                        <p className="text-sm text-yellow-700">
                            {t('forgot.no_mail_server', 'Password reset via email is currently unavailable because no mail server is configured.')}
                        </p>
                    </div>
                )}

                <p className="text-sm text-gray-500 mb-6">{t('forgot.desc', 'Enter your email address or username to reset your password.')}</p>

                <input
                    className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
                    placeholder={t('forgot.placeholder_id', 'Username or Email')}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    disabled={!mailEnabled || loading}
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading || !mailEnabled}
                    className="w-full bg-pink-600 text-white py-4 rounded-lg font-bold hover:bg-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? t('forgot.sending', 'Sending...') : t('forgot.request_link', 'Request Reset Link')}
                </button>

                <button onClick={onBack} className="w-full mt-4 text-gray-500 hover:text-black transition">
                    {t('btn.cancel', 'Cancel')}
                </button>
            </div>
        </div>
    );
};

export default ForgotPassword;