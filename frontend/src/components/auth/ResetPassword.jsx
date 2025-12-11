import { useState } from 'react';
import { API_URL } from '../../config';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';

const ResetPassword = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const onSuccess = () => navigate('/login');
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!password) return alert(t('reset.no_password', 'Password is required.'));
        if (password !== confirm) return alert(t('reset.mismatch', 'Passwords do not match.'));

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password })
            });

            if (res.ok) {
                alert(t('reset.success', 'Password changed successfully! Please log in again.'));
                onSuccess();
            } else {
                const err = await res.json();
                alert(t('reset.error', 'Error: ') + (err.detail || t('reset.invalid_link', 'Link is invalid or expired.')));
            }
        } catch {
            alert(t('error.network', 'Network Error'));
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{t('reset.title', 'Set New Password')}</h2>

                <input
                    type="password"
                    className="w-full p-4 border rounded-lg bg-gray-50 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t('reset.new_password', 'New Password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <input
                    type="password"
                    className="w-full p-4 border rounded-lg bg-gray-50 mb-6 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={t('reset.confirm_password', 'Confirm Password')}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
                >
                    {loading ? t('btn.saving', 'Saving...') : t('reset.save_password', 'Save Password')}
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;