import React from 'react';
import { AlertTriangle, EyeOff, User, CheckCircle, Shield, Activity, Settings, UserCircle } from 'lucide-react';

const Dashboard = ({ user, matches, isGuest, onLogout, onRegisterClick, onAdminClick, onProfileClick, onSwipeClick, onQuestionnaireClick, onImprintClick, onPrivacyClick, t, testMode }) => {

    // Check if user has special roles
    const isAdminOrMod = user && (user.role === 'admin' || user.role === 'moderator');

    // Check if questionnaire is filled
    const showQuestionnairePrompt = user && (!user.answers || (typeof user.answers === 'object' && Object.keys(user.answers).length < 5) || (typeof user.answers === 'string' && user.answers.length < 5));

    // Check match visibility
    const isVisible = user?.is_visible_in_matches !== false;

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 flex flex-col items-center p-6">

            {/* Sticky Warnings Container */}
            <div className="fixed top-0 z-50 w-full flex flex-col items-center pointer-events-none">
                {isGuest && (
                    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 mt-2 rounded-full font-bold flex items-center gap-2 shadow-lg pointer-events-auto">
                        <AlertTriangle size={18} />
                        <span className="text-sm">{t('dashboard.guest_warning')}</span>
                        <button onClick={onRegisterClick} className="ml-4 bg-black text-white text-xs px-3 py-1 rounded-lg hover:bg-gray-800 transition">
                            {t('landing.btn_register')}
                        </button>
                    </div>
                )}
                {testMode && (
                    <div className="bg-orange-500 text-white px-4 py-1 mt-1 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg pointer-events-auto">
                        <Activity size={14} />
                        {t('alert.test_mode_active', 'Test Mode Active')}
                    </div>
                )}
            </div>

            {/* Navbar */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-10 p-4 rounded-3xl shadow-sm border border-white/40 bg-white/60 backdrop-blur-xl dark:bg-black/40 dark:border-white/10 z-40 sticky top-6">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-pink-500 to-violet-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-xl relative overflow-hidden group">
                        <span className="relative z-10">S</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-violet-600 dark:from-pink-400 dark:to-violet-400">
                            {t('app.title', 'Solumati')}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">Find your connection</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isAdminOrMod && (
                        <button onClick={onAdminClick} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all dark:text-gray-400 dark:hover:bg-white/5" title={t('dashboard.admin_panel')}>
                            <Settings size={20} />
                        </button>
                    )}

                    {!isGuest && (
                        <button onClick={onProfileClick} className="flex items-center gap-3 pl-2 pr-1 py-1 bg-white/50 hover:bg-white border border-transparent hover:border-pink-200 rounded-full transition-all dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/5 group">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 pl-2 group-hover:text-pink-600 transition-colors">{user?.username}</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-white flex items-center justify-center shadow-sm group-hover:shadow text-gray-400">
                                {user?.image_url ? (
                                    <img src={user.image_url} className="w-full h-full rounded-full object-cover" alt="Avatar" />
                                ) : (
                                    <User size={16} />
                                )}
                            </div>
                        </button>
                    )}

                    <button onClick={onLogout} className="ml-2 px-4 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors dark:bg-red-900/20 dark:hover:bg-red-900/30">
                        {t('btn.logout')}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-5xl space-y-8">

                {/* Questionnaire Prompt */}
                {showQuestionnairePrompt && (
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Complete your profile</h2>
                                <p className="text-indigo-100 max-w-lg">Answer a few questions to help our AI find your perfect match. Better data means better connections.</p>
                            </div>
                            <button
                                onClick={onQuestionnaireClick}
                                className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 active:scale-95 transition-all shadow-lg"
                            >
                                Start Questionnaire
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{t('dashboard.title', 'Your Matches')}</h2>
                        <p className="text-gray-500 dark:text-gray-400">People who vibe with you</p>
                    </div>
                    <button
                        onClick={onSwipeClick}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-2 group"
                    >
                        <span>Discover</span>
                        <span className="group-hover:translate-x-1 transition-transform">🚀</span>
                    </button>
                </div>

                {!isVisible ? (
                    <div className="bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur p-12 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center">
                        <EyeOff size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">You are hidden</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                            Your profile is not visible to others, so you won't receive new matches. Enable visibility in settings to get back in the game.
                        </p>
                        <button onClick={onProfileClick} className="text-pink-600 font-bold hover:text-pink-700 hover:underline">
                            Change Settings
                        </button>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 dark:bg-black/20 rounded-3xl border border-white/50 backdrop-blur-sm">
                        <div className="text-6xl mb-4">😴</div>
                        <h3 className="text-xl font-bold text-gray-400 dark:text-gray-500">{t('dashboard.no_matches', 'No matches yet')}</h3>
                        <p className="text-gray-400 mt-2">Try the Discover mode to find people!</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                        {matches.map((m, i) => (
                            <div key={i} className="group bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:shadow-xl hover:border-pink-100 dark:hover:border-pink-900/30 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-50/0 to-pink-50/50 dark:from-pink-900/0 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-inner ${isGuest ? 'filter blur-sm opacity-50' : ''}`}>
                                        {isGuest ? <EyeOff className="text-gray-400" /> : <User className="text-gray-400 w-8 h-8" />}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-1">
                                            {m.username}
                                            {!isGuest && <CheckCircle size={14} className="text-white fill-sky-500" />}
                                        </h3>
                                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                            {isGuest ? "***" : "Compatibility"}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative z-10 text-right">
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 drop-shadow-sm">
                                        {m.score}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="w-full max-w-5xl mt-12 mb-6 flex justify-center gap-6 text-sm text-gray-400">
                <button onClick={onImprintClick} className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    {t('footer.imprint', 'Impressum')}
                </button>
                <button onClick={onPrivacyClick} className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    {t('footer.privacy', 'Datenschutz')}
                </button>
            </div>
        </div>
    );
};

export default Dashboard;