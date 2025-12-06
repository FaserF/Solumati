import React, { useState } from 'react';
import { Lock, Mail, Trash2, ChevronLeft } from 'lucide-react';
import { API_URL } from '../config';

const AccountSettings = ({ user, onBack, onLogout, t }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!currentPassword) return alert("Current password required");

        setLoading(true);
        try {
            const body = { current_password: currentPassword };
            if (email) body.email = email;
            if (password) body.password = password;

            const res = await fetch(`${API_URL}/users/${user.user_id}/account`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                alert(t('settings.success') + (data.reverify_needed ? " " + t('settings.reverify') : ""));
                if (data.reverify_needed) onLogout();
            } else {
                const err = await res.json();
                alert("Error: " + err.detail);
            }
        } catch (e) { alert("Network Error"); }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm(t('settings.delete_confirm'))) return;
        const pwd = prompt(t('settings.curr_pw'));
        if (!pwd) return;

        try {
            const res = await fetch(`${API_URL}/users/${user.user_id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            if (res.ok) {
                alert("Account deleted.");
                onLogout();
            } else {
                alert("Failed to delete account. Wrong password?");
            }
        } catch (e) { alert("Network Error"); }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-xl mx-auto p-4">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-black mb-6">
                    <ChevronLeft size={20} /> {t('btn.back')}
                </button>

                <h1 className="text-2xl font-bold mb-6 text-gray-800">{t('settings.title')}</h1>

                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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
                                type="password"
                                className="w-full p-3 bg-transparent focus:outline-none"
                                placeholder={t('settings.new_pw')}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
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

                <button onClick={handleDelete} className="w-full text-red-600 border border-red-200 bg-red-50 py-3 rounded-lg font-bold hover:bg-red-100 flex justify-center items-center gap-2">
                    <Trash2 size={18} /> {t('settings.delete_acc')}
                </button>
            </div>
        </div>
    );
};

export default AccountSettings;