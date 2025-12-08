import React, { useState } from 'react';
import { User, Save, Settings, ChevronLeft } from 'lucide-react';
import { API_URL } from '../config';

const UserProfile = ({ user, onBack, onOpenSettings, t }) => {
    const [aboutMe, setAboutMe] = useState(user.about_me || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${user.user_id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ about_me: aboutMe })
            });
            if (res.ok) alert(t('profile.saved'));
            else alert("Error saving profile");
        } catch (e) { alert("Network Error"); }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors">
            <div className="max-w-2xl mx-auto p-4">
                <button onClick={onBack} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white mb-6">
                    <ChevronLeft size={20} /> {t('btn.back')}
                </button>

                <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-sm p-8 border dark:border-white/10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-pink-500">
                            {user.image_url ?
                                <img src={`${API_URL}${user.image_url}`} className="w-full h-full object-cover rounded-full" /> :
                                <User size={48} />
                            }
                        </div>
                        <h1 className="text-2xl font-bold dark:text-white">{user.username}</h1>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('profile.about_me')}</label>
                        <textarea
                            className="w-full p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white min-h-[150px] focus:ring-2 focus:ring-pink-500 focus:outline-none placeholder-gray-400"
                            value={aboutMe}
                            onChange={e => setAboutMe(e.target.value)}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Intent</label>
                        <select
                            className="w-full p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            value={user.intent}
                            disabled={true}
                        >
                            <option value="longterm">Beziehung</option>
                            <option value="shortterm">Lockeres</option>
                            <option value="friends">Freundschaft</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Editing intent currently disabled.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition flex justify-center items-center gap-2 mb-4"
                    >
                        <Save size={18} /> {loading ? "Saving..." : t('btn.save')}
                    </button>

                    <button onClick={onOpenSettings} className="w-full border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition flex justify-center items-center gap-2">
                        <Settings size={18} /> {t('profile.btn_settings')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;