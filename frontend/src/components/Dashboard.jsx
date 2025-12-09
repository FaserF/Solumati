import React from 'react';
import { AlertTriangle, EyeOff, Activity, Shield } from 'lucide-react';
import DashboardNavbar from './dashboard/DashboardNavbar';
import MatchCard from './dashboard/MatchCard';

const Dashboard = ({ user, matches, isGuest, onLogout, onRegisterClick, onAdminClick, onProfileClick, onSwipeClick, onQuestionnaireClick, onImprintClick, onPrivacyClick, t, testMode, maintenanceMode }) => {

    // Check if user has special roles
    const isAdminOrMod = user && (user.role === 'admin' || user.role === 'moderator');

    // Check if questionnaire is filled
    const showQuestionnairePrompt = user && (!user.answers || (typeof user.answers === 'object' && Object.keys(user.answers).length < 5) || (typeof user.answers === 'string' && user.answers.length < 5));

    // Check match visibility
    const isVisible = user?.is_visible_in_matches !== false;

    // 2FA Onboarding Prompt
    const [show2FAPrompt, setShow2FAPrompt] = React.useState(false);

    React.useEffect(() => {
        if (user && user.two_factor_method === 'none') {
            const hasDismissed = localStorage.getItem('dismissed_2fa_prompt');
            if (!hasDismissed) {
                setShow2FAPrompt(true);
            }
        }
    }, [user]);

    const dismiss2FAPrompt = () => {
        localStorage.setItem('dismissed_2fa_prompt', 'true');
        setShow2FAPrompt(false);
    };

    const setup2FA = () => {
        dismiss2FAPrompt();
        onProfileClick(); // Navigate to Profile (then user clicks Settings)
        // Or directly call onProfileClick -> setView('settings')?
        // Dashboard doesn't have direct access to setView('settings').
        // But App.jsx passed `onProfileClick={() => setView('profile')}`.
        // And `UserProfile` has `onOpenSettings`.
        // This is a bit indirect. "Profile -> Settings".
        // Ideally we should navigate to Settings directly.
        // But `onProfileClick` is what we have.
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 flex flex-col items-center p-4 md:p-6 pb-24">

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
                {maintenanceMode && (
                    <div className="bg-red-600 text-white px-4 py-1 mt-1 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg pointer-events-auto animate-pulse">
                        <AlertTriangle size={14} />
                        {t('alert.maintenance_mode_active', 'Maintenance Mode Active')}
                    </div>
                )}
                {testMode && (
                    <div className="bg-orange-500 text-white px-4 py-1 mt-1 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg pointer-events-auto">
                        <Activity size={14} />
                        {t('alert.test_mode_active', 'Test Mode Active')}
                    </div>
                )}
            </div>

            {/* 2FA Onboarding Modal */}
            {show2FAPrompt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center">
                        <div className="mx-auto w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-pink-600 mb-6">
                            <Shield size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Protect your Account</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            We strongly recommend enabling Two-Factor Authentication (2FA) to secure your data.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={setup2FA} className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold hover:scale-[1.02] transition">
                                Setup 2FA Now
                            </button>
                            <button onClick={dismiss2FAPrompt} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium py-2">
                                I'll do it later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DashboardNavbar
                user={user}
                isGuest={isGuest}
                isAdminOrMod={isAdminOrMod}
                onAdminClick={onAdminClick}
                onProfileClick={onProfileClick}
                onLogout={onLogout}
                t={t}
            />

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
                            <MatchCard key={i} match={m} isGuest={isGuest} />
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