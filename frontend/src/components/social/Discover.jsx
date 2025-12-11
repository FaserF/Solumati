import { useState, useEffect } from 'react';
import { X, Heart, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { API_URL } from '../../config';

const Discover = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();
    const onBack = () => navigate('/dashboard');
    const [candidates, setCandidates] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/discover`);
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
            }
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const handleAction = () => {
        setCurrentIndex(prev => prev + 1);
    };

    const current = candidates[currentIndex];

    // --- Loading State ---
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-[#121212]">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
        </div>
    );

    // --- No More Matches State ---
    if (!current) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-[#121212] transition-colors">
            <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] p-10 rounded-3xl shadow-xl hover:shadow-2xl transition duration-500 border border-gray-100 dark:border-white/10">
                <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500 dark:text-pink-400">
                    <Heart size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{t('discover.no_more', "Du hast alle gesehen!")}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                    {t('discover.check_later', 'Schau später wieder vorbei für neue Matches.')}
                </p>
                <button
                    onClick={onBack}
                    className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full hover:scale-105 transition-transform shadow-lg"
                >
                    {t('discover.back_dashboard', 'Zurück zum Dashboard')}
                </button>
            </div>
        </div>
    );

    // Score Colors
    const scoreColor = current.score > 80 ? 'text-green-500' : current.score > 50 ? 'text-yellow-500' : 'text-gray-500';
    const ringColor = current.score > 80 ? 'ring-green-500' : 'ring-gray-200 dark:ring-gray-700';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex justify-center items-start pt-4 pb-20 px-4 transition-colors">
            {/* Card Container */}
            <div className="relative w-full max-w-lg h-[calc(100vh-6rem)] bg-white dark:bg-[#1e1e1e] rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col">

                {/* Navbar within Card */}
                <div className="absolute top-0 left-0 w-full z-20 p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                    <button onClick={onBack} className="pointer-events-auto p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="pointer-events-auto flex flex-col items-center bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl text-white">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Match</span>
                        <span className={`text-xl font-black ${current.score > 80 ? 'text-green-300' : 'text-white'}`}>{current.score}%</span>
                    </div>
                </div>

                {/* Main Content Area (Image + Info) */}
                <div className="flex-1 relative overflow-y-auto no-scrollbar scroll-smooth">
                    {/* Image Section */}
                    <div className="h-[60%] relative">
                        {current.image_url ? (
                            <img src={`${API_URL}${current.image_url}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 dark:bg-[#2c2c2c] text-gray-400">
                                <span className="text-6xl mb-2">📷</span>
                                <span className="font-medium">No Image</span>
                            </div>
                        )}
                        {/* Gradient Overlay */}
                        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none"></div>

                        {/* Name & Basic Info Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-8 text-white z-10">
                            <h1 className="text-4xl font-bold mb-2 shadow-black/50 drop-shadow-lg">{current.username}</h1>
                            {current.intent && (
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-bold border border-white/30 uppercase tracking-wide">
                                    {current.intent}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="p-8 bg-white dark:bg-[#1e1e1e] min-h-[40%] -mt-6 rounded-t-[2.5rem] relative z-10">
                        {/* Drag Handle Indicator */}
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8"></div>

                        {/* Match Reasons */}
                        {current.match_details && current.match_details.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('discover.why_matched', 'Gemeinsamkeiten')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {current.match_details.map((detail, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 text-sm font-medium rounded-xl border border-pink-100 dark:border-pink-900/30">
                                            {detail}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* About Me */}
                        <div className="mb-20">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('discover.about', 'Über Mich')}</h3>
                            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                                {current.about_me || <span className="italic text-gray-400">{t('discover.no_bio', "Keine Beschreibung vorhanden.")}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Floating Action Bar */}
                <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-6 z-20 pointer-events-none">
                    <button
                        onClick={() => handleAction('pass')}
                        className="pointer-events-auto w-16 h-16 rounded-full bg-white dark:bg-[#2c2c2c] shadow-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center border border-gray-100 dark:border-gray-700"
                    >
                        <X size={32} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => handleAction('like')}
                        className="pointer-events-auto w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 to-pink-600 shadow-xl shadow-pink-500/30 text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    >
                        <Heart size={40} fill="currentColor" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Discover;
