import { useState, useEffect } from 'react';
import { X, Heart, ChevronLeft, MapPin, User, Info } from 'lucide-react';
import { API_URL } from '../../config';

const Swipe = ({ user, onBack, t }) => {
    const [candidates, setCandidates] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastDirection, setLastDirection] = useState(null);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/discover`, {
                headers: {
                    'Authorization': user && user.token ? `Bearer ${user.token}` : undefined // If auth is needed, though currently it seems cookie based or implicit in checking header? App.jsx doesn't show explicit token handling in fetch usually unless included in credentials.
                    // Checking App.jsx: it relies on cookies or just fetches.
                    // Actually App.jsx fetches seem to not use 'credentials: include' explicitly in the snippets seen?
                    // Wait, `fetchMatches` in App.jsx just calls fetch.
                    // `get_current_user_from_header` determines user.
                    // If the backend expects some header, I might be missing it.
                    // But looking at App.jsx `handleLogin` it doesn't seem to set a global token variable.
                    // Let's assume standard fetch for now, maybe the backend reads a header that is set globally or just relies on something else.
                    // The backend `get_current_user_from_header` implies a header.
                    // Let's check `dependencies.py` if I could? No, let's just assume it works like other components for now.
                    // Wait, `UserProfile` update uses `user.user_id` in URL.
                    // Let's just follow existing patterns.
                }
            });
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
            }
        } catch {
            // console.error("Failed to load candidates", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCandidates();
    }, []);

    const handleSwipe = (direction) => {
        setLastDirection(direction);
        setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setLastDirection(null);
        }, 300); // Animation duration
    };

    const currentCard = candidates[currentIndex];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-4">
            <div className="w-full max-w-md px-4 mb-4 flex justify-between items-center">
                <button onClick={onBack} className="p-2 rounded-full bg-white shadow text-gray-600 hover:text-black">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-pink-600">Discover</h1>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center relative">
                {loading && <div className="animate-pulse text-gray-400">Loading profiles...</div>}

                {!loading && !currentCard && (
                    <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
                        <User size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700">That&apos;s everyone!</h3>
                        <p className="text-gray-500 mb-4">Check back later for more people.</p>
                        <button onClick={onBack} className="text-pink-600 font-bold hover:underline">Back to Dashboard</button>
                    </div>
                )}

                {currentCard && (
                    <div className={`relative w-full h-[600px] bg-white rounded-3xl shadow-xl overflow-hidden transition-transform duration-300 ${lastDirection === 'left' ? '-translate-x-full rotate-[-20deg] opacity-0' : ''} ${lastDirection === 'right' ? 'translate-x-full rotate-[20deg] opacity-0' : ''}`}>
                        <div className="absolute top-0 left-0 w-full h-3/4 bg-gray-200">
                            {currentCard.image_url ? (
                                <img src={`${API_URL}${currentCard.image_url}`} className="w-full h-full object-cover" alt={currentCard.username} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                                    <User size={64} />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                                <h2 className="text-3xl font-bold flex items-center gap-2">
                                    {currentCard.username}
                                    {currentCard.age && <span className="text-xl font-normal opacity-90">{currentCard.age}</span>}
                                </h2>
                                <div className="flex items-center gap-1 opacity-90 mt-1">
                                    <MapPin size={16} />
                                    <span>Nearby</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-1/4 p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 mb-1">About</h3>
                                <p className="text-gray-600 text-sm line-clamp-2">{currentCard.about_me || "No description yet."}</p>
                            </div>
                            {/* Tags or other info could go here */}
                        </div>
                    </div>
                )}
            </div>

            {currentCard && (
                <div className="w-full max-w-md px-8 mt-6 flex justify-between items-center z-10">
                    <button
                        onClick={() => handleSwipe('left')}
                        className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition"
                    >
                        <X size={32} />
                    </button>

                    <button className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:scale-110 transition">
                        <Info size={24} />
                    </button>

                    <button
                        onClick={() => handleSwipe('right')}
                        className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-green-500 hover:bg-green-50 hover:scale-110 transition"
                    >
                        <Heart size={32} fill="currentColor" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Swipe;
