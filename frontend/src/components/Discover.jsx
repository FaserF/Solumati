import React, { useState, useEffect } from 'react';
import { X, Heart, ChevronLeft, MapPin, CheckCircle, Quote } from 'lucide-react';
import { API_URL } from '../config';

const Discover = ({ user, onBack, t }) => {
    const [candidates, setCandidates] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/discover`);
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleAction = (type) => {
        // Here we would call an API to like/pass
        // For now just next
        setCurrentIndex(prev => prev + 1);
    };

    const current = candidates[currentIndex];

    if (loading) return <div className="p-8 text-center text-gray-500">{t('discover.loading', 'Finding your soulmate...')}</div>;

    if (!current) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('discover.no_more', "You've seen everyone!")}</h2>
            <p className="text-gray-500 mb-6">{t('discover.check_later', 'Check back later for more potential matches.')}</p>
            <button onClick={onBack} className="text-pink-600 font-bold hover:underline">{t('discover.back_dashboard', 'Back to Dashboard')}</button>
        </div>
    );

    // Score Color
    const scoreColor = current.score > 80 ? 'text-green-500' : current.score > 50 ? 'text-yellow-500' : 'text-gray-500';
    const borderColor = current.score > 80 ? 'border-green-500' : 'border-gray-200';

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center py-6 px-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 flex justify-between items-center border-b bg-white z-10 sticky top-0">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('discover.compatibility', 'Compatibility')}</span>
                        <span className={`text-2xl font-black ${scoreColor}`}>{current.score}%</span>
                    </div>
                    <div className="w-10"></div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Hero Image */}
                    <div className="h-96 relative bg-gray-200">
                        {current.image_url ? (
                            <img src={`${API_URL}${current.image_url}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">{t('discover.no_image', 'No Image')}</div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 text-white pt-24">
                            <h1 className="text-4xl font-bold">{current.username}</h1>
                            {current.about_me && <p className="opacity-90 mt-2 line-clamp-1">{current.about_me}</p>}
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Match Details */}
                        {current.match_details && current.match_details.length > 0 && (
                            <div className={`border-l-4 ${borderColor} bg-gray-50 p-6 rounded-r-xl`}>
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <CheckCircle size={18} className={scoreColor} />
                                    {t('discover.why_matched', 'Why you matched')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {current.match_details.map((detail, i) => (
                                        <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
                                            {detail}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* About Section */}
                        <div>
                            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm mb-3">{t('discover.about', 'About Me')}</h3>
                            <div className="text-lg text-gray-700 leading-relaxed font-serif relative pl-6">
                                <Quote className="absolute left-0 top-0 text-gray-300 transform -scale-x-100" size={20} />
                                {current.about_me || t('discover.no_bio', "This user hasn't written a bio yet.")}
                            </div>
                        </div>

                        {/* Intent */}
                        {current.intent && (
                            <div>
                                <h3 className="text-gray-400 font-bold uppercase tracking-wider text-sm mb-3">{t('discover.intent', 'Looking For')}</h3>
                                <span className="inline-block px-4 py-2 bg-pink-50 text-pink-700 font-bold rounded-lg capitalize">
                                    {current.intent}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="h-24"></div> {/* Spacer for buttons */}
                </div>

                {/* Floating/Fixed Action Buttons */}
                <div className="p-6 border-t bg-white flex justify-center items-center gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                    <button
                        onClick={() => handleAction('pass')}
                        className="w-16 h-16 rounded-full border-2 border-gray-200 text-gray-400 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center"
                    >
                        <X size={32} />
                    </button>
                    <button
                        onClick={() => handleAction('like')}
                        className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-200 hover:shadow-xl hover:scale-105 transition flex items-center justify-center"
                    >
                        <Heart size={40} fill="currentColor" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Discover;
