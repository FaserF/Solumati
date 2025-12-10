import React, { useState, useEffect, useRef } from 'react';
import { User, Save, Settings, ChevronLeft, Upload, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { API_URL } from '../../config';

const UserProfile = ({ initialMode = 'view' }) => {
    const { user } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();

    const onBack = () => navigate('/dashboard');
    const onOpenSettings = () => navigate('/settings');
    // Mode: 'view' or 'edit'
    const [mode, setMode] = useState(initialMode);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);

    // Form State
    const [aboutMe, setAboutMe] = useState(user?.about_me || "");
    const [intent, setIntent] = useState(user?.intent || "longterm");
    const [userAnswers, setUserAnswers] = useState({});

    // Image Upload Ref
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Parse answers on mount
        try {
            if (typeof user.answers === 'string') {
                setUserAnswers(JSON.parse(user.answers));
            } else {
                setUserAnswers(user.answers || {});
            }
        } catch (e) { console.error("Error parsing answers", e); }

        // Fetch Questions Definitions
        const lang = navigator.language.split('-')[0] || 'en';
        fetch(`${API_URL}/questions?lang=${lang}`)
            .then(res => res.json())
            .then(data => setQuestions(data))
            .catch(e => console.error("Failed to load questions", e));
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${user.user_id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    about_me: aboutMe,
                    intent: intent,
                    answers: userAnswers
                })
            });
            if (res.ok) {
                alert(t('profile.saved'));
                setMode('view');
            }
            else alert("Error saving profile");
        } catch (e) { alert("Network Error"); }
        setLoading(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/users/${user.user_id}/image`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                user.image_url = data.image_url; // Update local user object (ideally should update global state)
                alert("Image uploaded!");
            } else {
                alert("Upload failed");
            }
        } catch (e) { alert("Upload Error"); }
    };

    const getAnswerLabel = (qid) => {
        const ansIdx = userAnswers[qid];
        const q = questions.find(x => x.id === parseInt(qid));
        if (q && ansIdx !== undefined && q.options[ansIdx]) {
            return q.options[ansIdx];
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors pb-12">
            <div className="max-w-2xl mx-auto p-4">
                <button onClick={onBack} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white mb-6">
                    <ChevronLeft size={20} /> {t('btn.back')}
                </button>

                <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">

                    {/* Header Image Area */}
                    <div className="relative h-48 bg-gradient-to-r from-pink-500 to-indigo-600">
                        {/* Edit Toggle (Top Right) */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            {mode === 'view' ? (
                                <>
                                    <button onClick={onOpenSettings} className="bg-white/20 backdrop-blur text-white p-2 rounded-full hover:bg-white/30 transition shadow-sm" title={t('profile.btn_settings')}>
                                        <Settings size={20} />
                                    </button>
                                    <button onClick={() => setMode('edit')} className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-white/30 transition shadow-sm">
                                        <Edit2 size={16} /> Edit Profile
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setMode('view')} className="bg-black/50 backdrop-blur text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-black/60 transition shadow-sm">
                                    <X size={16} /> {t('btn.cancel', 'Cancel')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="px-8 pb-8">
                        {/* Profile Image & Name (Overlap) */}
                        <div className="relative -mt-20 mb-6 flex flex-col items-center">
                            <div className="relative group">
                                <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-full p-1 shadow-xl">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center relative">
                                        {user.image_url ?
                                            <img src={`${API_URL}${user.image_url}`} className="w-full h-full object-cover" /> :
                                            <User size={64} className="text-gray-400" />
                                        }
                                    </div>
                                </div>

                                {/* Image Upload Overlay */}
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => fileInputRef.current.click()}>
                                    <Upload className="text-white" size={24} />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            <h1 className="text-3xl font-bold mt-4 dark:text-white">{user.username}</h1>
                            <p className="text-gray-500">
                                {mode === 'view' ? (
                                    intent === 'longterm' ? t('intent.longterm', "Looking for Relationship") :
                                        intent === 'friends' ? t('intent.friends', "Looking for Friends") :
                                            intent === 'shortterm' ? t('intent.shortterm', "Looking for Fun") :
                                                intent // Custom intent fallback
                                ) : "Editing Profile"}
                            </p>
                        </div>

                        {/* --- VIEW MODE --- */}
                        {mode === 'view' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">{t('profile.about_me')}</h3>
                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed text-lg">
                                        {aboutMe || <span className="italic text-gray-400">{t('profile.no_bio', 'No bio yet.')}</span>}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('profile.details', 'Details')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.entries(userAnswers).map(([qid, ansIdx]) => {
                                            const label = getAnswerLabel(qid);
                                            const q = questions.find(x => x.id === parseInt(qid));
                                            if (!label || !q) return null;
                                            return (
                                                <div key={qid} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                                    <span className="block text-xs text-gray-400 mb-1">{q.category}</span>
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                                                </div>
                                            );
                                        })}
                                        {questions.length > 0 && Object.keys(userAnswers).length === 0 && (
                                            <p className="text-gray-400 italic">{t('profile.no_details', 'No details added yet.')}</p>
                                        )}
                                    </div>
                                </div>


                            </div>
                        )}

                        {/* --- EDIT MODE --- */}
                        {mode === 'edit' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <EditProfileTabs
                                    questions={questions}
                                    userAnswers={userAnswers}
                                    setUserAnswers={setUserAnswers}
                                    aboutMe={aboutMe}
                                    setAboutMe={setAboutMe}
                                    intent={intent}
                                    setIntent={setIntent}
                                    t={t}
                                />

                                <div className="pt-6 flex gap-4 border-t dark:border-gray-700">
                                    <button
                                        onClick={() => setMode('view')}
                                        className="flex-1 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition flex justify-center items-center gap-2"
                                    >
                                        <Save size={18} /> {loading ? "Saving..." : t('btn.save')}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for Edit Tabs
const EditProfileTabs = ({ questions, userAnswers, setUserAnswers, aboutMe, setAboutMe, intent, setIntent, t }) => {
    const [activeTab, setActiveTab] = useState('general');

    // Extract Categories
    const categories = ['general', ...new Set(questions.map(q => q.category))];

    return (
        <div>
            {/* Tabs Header */}
            <div className="flex overflow-x-auto pb-2 gap-2 mb-6 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === cat
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {cat === 'general' ? 'General & Bio' : cat}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-300 uppercase mb-2">I am looking for...</label>
                            <select
                                className="w-full p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                                value={intent}
                                onChange={e => setIntent(e.target.value)}
                            >
                                <option value="longterm">Relationship</option>
                                <option value="shortterm">Something Casual</option>
                                <option value="friends">Friendship</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-300 uppercase mb-2">{t('profile.about_me')}</label>
                            <textarea
                                className="w-full p-4 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white min-h-[150px] focus:ring-2 focus:ring-pink-500 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
                                value={aboutMe}
                                onChange={e => setAboutMe(e.target.value)}
                                placeholder="Write something about yourself..."
                            />
                        </div>
                    </div>
                )}

                {/* Categories Questions */}
                {activeTab !== 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {questions.filter(q => q.category === activeTab).map(q => (
                            <div key={q.id}>
                                <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">{q.text}</p>
                                <div className="flex flex-wrap gap-2">
                                    {q.options.map((opt, idx) => {
                                        const isSelected = userAnswers[q.id] === idx;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setUserAnswers(prev => ({ ...prev, [q.id]: idx }))}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSelected
                                                    ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};



export default UserProfile;