import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { ChevronRight, ChevronLeft, CheckCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

const Questionnaire = ({ onComplete, onClose }) => {
    const { user } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();

    // Wrappers if props are missing
    const handleComplete = onComplete || (() => navigate('/dashboard'));
    const handleClose = onClose || (() => navigate('/dashboard'));
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);

    const questionsPerPage = 5;

    useEffect(() => {
        // Load questions
        const lang = navigator.language.split('-')[0] || 'en';
        fetch(`${API_URL}/questions?lang=${lang}`)
            .then(res => res.json())
            .then(data => {
                setQuestions(data);
                // Also try to load existing answers
                if (user.answers && typeof user.answers === 'string') {
                    try { setAnswers(JSON.parse(user.answers)); } catch {
                        // Failed to parse answers
                    }
                } else if (user.answers && typeof user.answers === 'object') {
                    setAnswers(user.answers);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load questions", err);
                setLoading(false);
            });
    }, [user.answers]);

    const handleOptionSelect = (qid, optionIndex) => {
        setAnswers(prev => ({ ...prev, [qid]: optionIndex }));
    };

    const handleNext = () => {
        setStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${user.user_id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: answers })
            });

            if (res.ok) {
                handleComplete();
            } else {
                alert("Failed to save answers.");
            }
        } catch (e) {
            console.error(e);
            alert("Network error saving answers.");
        }
        setLoading(false);
    };

    if (loading && questions.length === 0) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 text-center text-gray-500 animate-pulse">
            {t('quest.loading', 'Loading Questions...')}
        </div>
    );

    const totalSteps = Math.ceil(questions.length / questionsPerPage);
    const startIndex = step * questionsPerPage;
    const currentQuestions = questions.slice(startIndex, startIndex + questionsPerPage);

    const progress = Math.round(((step) / totalSteps) * 100);

    return (
        <div className="fixed inset-0 z-50 bg-gray-50/95 dark:bg-black/95 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-screen flex flex-col items-center py-12">
                <div className="w-full max-w-2xl px-6">

                    {/* Header with Close */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {step < totalSteps ? `${t('quest.step', 'Step')} ${step + 1} / ${totalSteps}` : t('quest.review', "Review")}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('quest.intro', "Tell us about yourself")}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full bg-white dark:bg-[#1e1e1e] hover:bg-gray-100 dark:hover:bg-[#2e2e2e] text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white transition shadow-sm border border-gray-100 dark:border-white/10"
                            title={t('btn.cancel', 'Cancel')}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-10">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {currentQuestions.map(q => (
                            <div key={q.id} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{q.text}</h3>
                                <div className="space-y-2">
                                    {q.options.map((opt, idx) => {
                                        const isSelected = answers[q.id] === idx;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleOptionSelect(q.id, idx)}
                                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center group ${isSelected
                                                    ? 'bg-pink-50/50 dark:bg-pink-900/20 border-pink-500 text-pink-900 dark:text-pink-100'
                                                    : 'border-transparent bg-gray-50 dark:bg-[#2c2c2c] hover:bg-gray-100 dark:hover:bg-[#383838] text-gray-600 dark:text-gray-300'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${isSelected ? 'border-pink-500 bg-pink-500' : 'border-gray-300 dark:border-gray-500 group-hover:border-gray-400'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                                <span className={`font-medium ${isSelected ? 'font-bold' : ''}`}>{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between mt-12 mb-12">
                        <button
                            onClick={handleBack}
                            disabled={step === 0}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors ${step === 0 ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2c2c2c] hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <ChevronLeft size={20} /> {t('btn.back', 'Back')}
                        </button>

                        {step < totalSteps - 1 ? (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 hover:-translate-y-1 active:translate-y-0 transition-all shadow-lg shadow-black/20"
                            >
                                {t('quest.next', 'Next')} <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1 active:translate-y-0 transition-all"
                            >
                                {t('quest.finish', 'Finish')} <CheckCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Questionnaire;
