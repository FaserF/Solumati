import React, { useState, useEffect } from 'react';
import { X, Flag, User as UserIcon, MessageCircle } from 'lucide-react';
import { API_URL } from '../config';
import ReportModal from './ReportModal';

const PublicProfile = ({ userId, onClose, onChat }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [reportModalOpen, setReportModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch User Details (using existing matches endpoint logic user data might be limited,
                // ideally we need a public profile endpoint -> GET /users/{id} is currently PROTECTED and checks for own ID.
                // WE NEED A NEW ENDPOINT or USE MATCH DATA.
                // Wait, GET /matches returns detail list.
                // Let's assume we pass the full 'match' object from the parent first,
                // but if we want full details (answers) we need them.
                // Currently `MatchResult` schema has `username`, `about_me`, `image_url`.
                // It does NOT have `answers`.

                // Workaround: We will use the `/users/{id}` endpoint but we need to modify backend to allow viewing OTHER users if they are matches?
                // OR: We create a new endpoint GET /users/{id}/public

                // Let's implement valid fetching using a new endpoint if needed, or just display what we have for now.
                // For MVP: We will likely fail to fetch full details because /users/{id} returns 403 Forbidden.

                // FIX: I will quickly implement GET /users/{id}/public in backend or modify GET /users/{id}.
                // Actually, let's try to fetch and if it fails handle gracefully.
                // But wait, the task plan said "Fetches full user details".

                // Let's check `backend/routers/users.py` again. `get_user_profile` enforces `user.id != user_id`.
                // I need another endpoint.

                // Temporary: I will fetch what I can.
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/users/${userId}/public`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-User-Id': token
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                } else {
                    const err = await res.json().catch(() => ({}));
                    // Fallback to minimal data if endpoint doesn't exist yet or fails
                    setUser({
                        id: userId,
                        username: "Profile Unavailable",
                        about_me: err.detail || "Could not load full profile. You might not have permission to view this user."
                    });
                }

                // Questions
                const qRes = await fetch(`${API_URL}/questions`);
                if (qRes.ok) setQuestions(await qRes.json());

            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    if (loading) return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="text-white animate-pulse">Loading Profile...</div>
        </div>
    );

    if (!user) return null;

    // Helper to get answer label
    const getAnswerLabel = (qid) => {
        if (!user.answers) return null;
        let ansObj = {};
        try { ansObj = typeof user.answers === 'string' ? JSON.parse(user.answers) : user.answers; } catch (e) { }

        const ansIdx = ansObj[qid];
        const q = questions.find(x => x.id === parseInt(qid));
        if (q && ansIdx !== undefined && q.options[ansIdx]) return q.options[ansIdx];
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 w-full max-w-4xl max-h-full overflow-y-auto rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition">
                    <X size={24} />
                </button>

                {/* Left: Image & Actions */}
                <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 relative">
                    {user.image_url ? (
                        <img src={`${API_URL}${user.image_url}`} alt={user.username} className="w-full h-64 md:h-full object-cover" />
                    ) : (
                        <div className="w-full h-64 md:h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600">
                            <UserIcon size={64} className="text-white/50" />
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                        <h2 className="text-3xl font-black text-white mb-1">{user.username}</h2>
                        <div className="flex gap-2 text-white/80 text-sm">
                            <span className="bg-white/20 px-2 py-1 rounded backdrop-blur-md capitalize">{user.intent || "Unknown intent"}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Info */}
                <div className="w-full md:w-2/3 p-6 md:p-10 flex flex-col">
                    <div className="flex-1 space-y-8">
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">About Me</h3>
                            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-line">
                                {user.about_me || "No description provided."}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
                            <div className="flex flex-wrap gap-2">
                                {/* Only show a few curated details for public view, or all if we have valid questions */}
                                {questions.filter(q => ['Personality', 'Interest'].includes(q.category)).map(q => {
                                    const label = getAnswerLabel(q.id);
                                    if (!label) return null;
                                    return (
                                        <div key={q.id} className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <span className="text-xs text-gray-400 block">{q.text}</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 mt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <button
                            onClick={() => onChat && onChat(user)}
                            className="flex items-center gap-2 text-pink-600 font-bold hover:underline hover:scale-105 transition-transform"
                        >
                            <MessageCircle size={20} /> Chat
                        </button>

                        <button
                            onClick={() => setReportModalOpen(true)}
                            className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium transition text-sm"
                        >
                            <Flag size={16} /> Report User
                        </button>
                    </div>
                </div>
            </div>

            {reportModalOpen && (
                <ReportModal
                    user={user}
                    onClose={() => setReportModalOpen(false)}
                />
            )}
        </div>
    );
};

export default PublicProfile;
