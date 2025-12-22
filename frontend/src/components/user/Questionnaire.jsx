import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../config';
import { ChevronRight, ChevronLeft, CheckCircle, X, Sparkles, Trophy, Zap, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Button } from '../ui/Button';

// Encouraging messages for streaks
const STREAK_MESSAGES = [
    "You're on fire! 🔥",
    "Keep it up! 🚀",
    "Awesome pace! ⚡",
    "Unstoppable! 💎",
    "Great choice! ✨"
];

const Questionnaire = ({ onComplete, onClose }) => {
    const { user } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();

    // Handlers
    const handleClose = onClose || (() => navigate('/dashboard'));
    const handleCompleteFinal = onComplete || (() => navigate('/dashboard'));

    // State
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState(0);
    const [showMilestone, setShowMilestone] = useState(null);
    const [isExiting, setIsExiting] = useState(false); // For exit animation of card
    const [direction, setDirection] = useState('next'); // 'next' or 'prev' for animation

    // Derived State
    const currentQ = questions[currentIdx];
    const progress = questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 0;
    const isFinished = currentIdx >= questions.length;

    // Load Data
    useEffect(() => {
        const load = async () => {
            try {
                const lang = navigator.language.split('-')[0] || 'en';
                const res = await fetch(`${API_URL}/questions?lang=${lang}`);
                const data = await res.json();
                setQuestions(data);

                // Load existing answers
                if (user.answers) {
                    try {
                        const parsed = typeof user.answers === 'string' ? JSON.parse(user.answers) : user.answers;
                        setAnswers(parsed || {});

                        // Optional: Jump to first unanswered question?
                        // Let's start from 0 for the flow experience, or find first missing.
                        // const firstMissing = data.findIndex(q => parsed[q.id] === undefined);
                        // if (firstMissing > 0) setCurrentIdx(firstMissing);
                    } catch (e) { }
                }
                setLoading(false);
            } catch (e) {
                console.error("Failed to load questions", e);
                setLoading(false);
            }
        };
        load();
    }, [user.answers]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (loading || isFinished) return;

            // Number keys 1-9
            const num = parseInt(e.key);
            if (!isNaN(num) && num > 0 && num <= 9) {
                if (currentQ && currentQ.options && currentQ.options[num - 1]) {
                    handleSelect(currentQ.id, num - 1);
                }
            }
            // Enter key (Next if answered)
            if (e.key === 'Enter' && answers[currentQ?.id] !== undefined) {
                handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQ, loading, isFinished, answers]);

    // Core Logic
    const handleSelect = (qid, optionIdx) => {
        // Optimistic update
        setAnswers(prev => ({ ...prev, [qid]: optionIdx }));
        setStreak(prev => prev + 1);

        // Trigger Milestone?
        if ((currentIdx + 1) % 10 === 0 && currentIdx > 0) {
            setShowMilestone(STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)]);
            setTimeout(() => setShowMilestone(null), 2000);
        }

        // Auto Advance with delay for visual feedback
        setTimeout(() => {
            handleNext();
        }, 250);
    };

    const handleNext = () => {
        if (currentIdx < questions.length) {
            setDirection('next');
            setIsExiting(true);
            setTimeout(() => {
                setCurrentIdx(prev => prev + 1);
                setIsExiting(false);
            }, 300); // Wait for animation
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setDirection('prev');
            setIsExiting(true);
            setTimeout(() => {
                setCurrentIdx(prev => prev - 1);
                setIsExiting(false);
            }, 300);
        }
    };

    const saveAndClose = async () => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/users/${user.user_id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: answers })
            });
            handleCompleteFinal();
        } catch (e) {
            alert("Failed to save. check connection.");
            setLoading(false);
        }
    };

    // Render loading
    if (loading) return (
        <div className="fixed inset-0 z-50 bg-zinc-900 flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Sparkles className="w-12 h-12 text-indigo-500 animate-spin-slow" />
                <p className="font-medium tracking-wider uppercase text-sm">Loading Experience...</p>
            </div>
        </div>
    );

    // Completion Screen
    if (isFinished) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-gradient-mesh-dark opacity-50"></div>

                <div className="relative z-10 text-center space-y-8 p-8 max-w-lg animate-fade-up">
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full mx-auto flex items-center justify-center shadow-glow-lg">
                        <Trophy className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Profile Complete!</h1>
                        <p className="text-xl text-zinc-400">You're all set to find your perfect match.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1">Questions</p>
                            <p className="text-3xl font-bold text-white">{questions.length}</p>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1">Streak</p>
                            <p className="text-3xl font-bold text-amber-500">{streak} 🔥</p>
                        </div>
                    </div>

                    <Button onClick={saveAndClose} className="w-full py-4 text-lg bg-white text-zinc-950 hover:bg-zinc-200">
                        Explore Matches <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 overflow-hidden text-zinc-50 font-sans">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-mesh-dark opacity-30 pointer-events-none"></div>
            <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none"></div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-4">
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-zinc-800/50 transition text-zinc-400 hover:text-white">
                        <X size={24} />
                    </button>
                    {/* Progress Bar */}
                    <div className="hidden md:flex flex-col gap-1 w-48">
                        <div className="flex justify-between text-xs font-medium text-zinc-500">
                            <span>{currentIdx + 1} / {questions.length}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-full backdrop-blur-md">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-zinc-200">{streak}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">

                {/* Milestone Toast */}
                <div className={`absolute -top-32 transition-all duration-500 ${showMilestone ? 'translate-y-20 opacity-100' : 'translate-y-0 opacity-0'}`}>
                    <div className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-full shadow-glow-lg flex items-center gap-2 animate-bounce">
                        <Trophy size={18} /> {showMilestone}
                    </div>
                </div>

                {/* Question Card */}
                {currentQ && (
                    <div
                        key={currentQ.id}
                        className={`w-full transition-all duration-300 transform
                            ${isExiting
                                ? (direction === 'next' ? '-translate-y-8 opacity-0 scale-95' : 'translate-y-8 opacity-0 scale-95')
                                : 'translate-y-0 opacity-100 scale-100'
                            }`}
                    >
                        <div className="mb-8 text-center">
                            <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-indigo-500/20">
                                {currentQ.category || "General"}
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm">
                                {currentQ.text}
                            </h2>
                        </div>

                        <div className="grid gap-3">
                            {currentQ.options.map((opt, idx) => {
                                const isSelected = answers[currentQ.id] === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelect(currentQ.id, idx)}
                                        className={`group relative w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between
                                            ${isSelected
                                                ? 'bg-zinc-50 border-white text-zinc-900 shadow-xl scale-[1.02]'
                                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors
                                                ${isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300'}
                                            `}>
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium text-lg">{opt}</span>
                                        </div>
                                        {isSelected && <CheckCircle className="text-emerald-500 w-6 h-6 animate-scale-in" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Controls Hint */}
                        <div className="mt-8 flex justify-between items-center text-zinc-500 text-sm">
                            <div className="flex gap-4">
                                <button onClick={handlePrev} disabled={currentIdx === 0} className="hover:text-zinc-300 disabled:opacity-30 transition-colors flex items-center gap-1">
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                <button onClick={handleNext} className="hover:text-zinc-300 transition-colors flex items-center gap-1">
                                    Skip <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="hidden md:flex items-center gap-2">
                                <CornerDownLeft size={14} /> <span>to confirm</span>
                                <div className="mx-2 w-px h-3 bg-zinc-700"></div>
                                <span>1-9 to select</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Questionnaire;
