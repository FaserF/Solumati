import React from 'react';
import { AlertTriangle, Activity, Shield, EyeOff, LifeBuoy } from 'lucide-react';
import PublicProfile from './PublicProfile';
import DashboardNavbar from './dashboard/DashboardNavbar';
import MatchCard from './dashboard/MatchCard';
import ChatWindow from './ChatWindow';

const Dashboard = ({ user, matches, isGuest, onLogout, onRegisterClick, onAdminClick, onProfileClick, onSwipeClick, onQuestionnaireClick, onImprintClick, onPrivacyClick, t, testMode, maintenanceMode, supportChatEnabled }) => {

    // State for viewing public profiles
    const [selectedUser, setSelectedUser] = React.useState(null);
    // State for active chat
    const [activeChatUser, setActiveChatUser] = React.useState(null);

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
        onProfileClick();
    };

    const handleOpenChat = (targetUser) => {
        setSelectedUser(null); // Close profile if open
        setActiveChatUser(targetUser);
    };

    // Inbox State
    const [activeTab, setActiveTab] = React.useState('matches');
    const [inboxConversations, setInboxConversations] = React.useState([]);

    React.useEffect(() => {
        if (activeTab === 'inbox') {
            fetchInbox();
        }
    }, [activeTab]);

    const fetchInbox = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/chat/conversations', {
                headers: { 'X-User-Id': token }
            });
            if (res.ok) {
                const data = await res.json();
                setInboxConversations(data);
            }
        } catch (e) {
            console.error("Failed to fetch inbox", e);
        }
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

            {/* Questionnaire Prompt */}
            {showQuestionnairePrompt && (
                <div className="w-full max-w-5xl mb-6 p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl border border-pink-200 dark:border-pink-900/30 shadow-lg flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{t('dashboard.complete_profile', 'Complete your Profile')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.better_matches', 'Answer questions to get better matches!')}</p>
                    </div>
                    <button onClick={onQuestionnaireClick} className="px-4 py-2 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition">
                        {t('btn.start')}
                    </button>
                </div>
            )}

            {/* Tab Switcher */}
            <div className="w-full max-w-md flex bg-white/50 dark:bg-black/30 p-1 rounded-xl mb-6 backdrop-blur self-center">
                <button
                    onClick={() => setActiveTab('matches')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'matches' ? 'bg-white dark:bg-gray-700 shadow-sm text-pink-600' : 'text-gray-500 hover:bg-white/50'}`}
                >
                    Matches
                </button>
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500 hover:bg-white/50'}`}
                >
                    Inbox
                </button>
            </div>

            <div className="w-full max-w-5xl grid gap-6 transition-all">

                {activeTab === 'matches' && (
                    <>
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{t('dashboard.title', 'Your Matches')}</h2>
                                <p className="text-gray-500 dark:text-gray-400">{t('dashboard.subtitle', "People who vibe with you")}</p>
                            </div>
                            <button
                                onClick={onSwipeClick}
                                className="bg-black text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-2 group"
                            >
                                <span>{t('dashboard.discover', "Discover")}</span>
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
                                <p className="text-gray-400 mt-2">{t('dashboard.try_discover', "Try the Discover mode to find people!")}</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                                {matches.map((m, i) => (
                                    <MatchCard
                                        key={i}
                                        match={m}
                                        isGuest={isGuest}
                                        onClick={() => setSelectedUser(m)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'inbox' && (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl shadow-sm border border-white/50 dark:border-white/10 overflow-hidden min-h-[400px]">
                        {inboxConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                <div className="text-4xl mb-4">📭</div>
                                <p>No conversations yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {inboxConversations.map((c) => (
                                    <button
                                        key={c.partner_id}
                                        onClick={() => handleOpenChat({ user_id: c.partner_id, username: c.partner_username, image_url: c.partner_image_url })}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                            {c.partner_image_url ?
                                                <img src={c.partner_image_url} className="w-full h-full object-cover" /> :
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold text-lg">
                                                    {c.partner_username[0]}
                                                </div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-bold text-gray-900 dark:text-white truncate">{c.partner_real_name || c.partner_username}</h4>
                                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                                    {new Date(c.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {c.last_message}
                                            </p>
                                        </div>
                                        {c.unread_count > 0 && (
                                            <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                                                {c.unread_count}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Public Profile Modal */}
            {selectedUser && (
                <PublicProfile
                    userId={selectedUser.user_id}
                    onClose={() => setSelectedUser(null)}
                    onChat={() => handleOpenChat(selectedUser)}
                />
            )}

            {/* Chat Window */}
            {activeChatUser && (
                <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
                    <ChatWindow
                        currentUser={user}
                        chatPartner={{
                            id: activeChatUser.user_id,
                            username: activeChatUser.username,
                            image_url: activeChatUser.image_url
                        }}
                        token={localStorage.getItem('token')}
                        onClose={() => setActiveChatUser(null)}
                        supportChatEnabled={supportChatEnabled}
                    />
                </div>
            )}

            {/* Support Chat FAB */}
            <button
                onClick={() => handleOpenChat({ user_id: 3, username: "Support", role: 'moderator' })}
                className="fixed bottom-6 left-6 z-40 bg-white text-blue-600 p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border border-blue-100 group"
                title="Contact Support"
            >
                <LifeBuoy size={28} className="group-hover:rotate-12 transition-transform" />
            </button>

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
