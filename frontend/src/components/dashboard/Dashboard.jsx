import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, EyeOff, LifeBuoy, Zap, Inbox, MessageCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PublicProfile from '../user/PublicProfile';
import DashboardNavbar from './DashboardNavbar';
import MatchCard from './MatchCard';
import ChatWindow from '../social/ChatWindow';
import { APP_VERSION, API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useI18n } from '../../context/I18nContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Container } from '../ui/Container';
import { cn } from '../../lib/utils';

const Dashboard = () => {
    const { user, isGuest, logout } = useAuth();
    const { globalConfig, maintenanceMode } = useConfig();
    const { t } = useI18n();
    const navigate = useNavigate();

    const supportChatEnabled = globalConfig?.support_chat_enabled;

    // Matches State
    const [matches, setMatches] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [show2FAPrompt, setShow2FAPrompt] = useState(false);

    // Check match visibility
    const isVisible = user?.is_visible_in_matches !== false;

    // Fetch Matches
    useEffect(() => {
        if (user && user.user_id) {
            fetch(`${API_URL}/matches/${user.user_id}`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setMatches(data || []))
                .catch(e => console.error("Match fetch failed", e));
        }
    }, [user]);

    // Check if user has special roles
    const isAdminOrMod = user && (user.role === 'admin' || user.role === 'moderator');

    // Check if questionnaire is filled
    const showQuestionnairePrompt = user && (!user.answers || (typeof user.answers === 'object' && Object.keys(user.answers).length < 5) || (typeof user.answers === 'string' && user.answers.length < 5));

    // 2FA Prompt Logic
    useEffect(() => {
        if (user && user.two_factor_method === 'none') {
            const hasDismissed = localStorage.getItem('dismissed_2fa_prompt');
            if (!hasDismissed) {
                const tId = setTimeout(() => setShow2FAPrompt(true), 1000);
                return () => clearTimeout(tId);
            }
        }
    }, [user]);

    const dismiss2FAPrompt = () => {
        localStorage.setItem('dismissed_2fa_prompt', 'true');
        setShow2FAPrompt(false);
    };

    const setup2FA = () => {
        dismiss2FAPrompt();
        navigate('/profile');
    };

    const handleOpenChat = (targetUser) => {
        setSelectedUser(null);
        setActiveChatUser(targetUser);
    };

    // Inbox State
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'matches';
    const setActiveTab = (tab) => setSearchParams({ tab });
    const [inboxConversations, setInboxConversations] = useState([]);
    const [updateAvailable, setUpdateAvailable] = useState(null);

    const fetchInbox = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${token}`, 'X-User-Id': token }
            });
            if (res.ok) {
                const data = await res.json();
                setInboxConversations(data);
            }
        } catch (e) {
            console.error("Failed to fetch inbox", e);
        }
    };

    // Fetch inbox when tab is active - legitimate data fetching pattern
    useEffect(() => {
        if (activeTab === 'inbox') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchInbox();
        }
    }, [activeTab]);

    useEffect(() => {
        const checkUpdate = async () => {
            try {
                const res = await fetch('https://api.github.com/repos/FaserF/Solumati/releases/latest');
                if (res.status === 404) return;
                if (res.ok) {
                    const data = await res.json();
                    const latest = data.tag_name.replace('v', '');
                    const current = APP_VERSION.replace('v', '');
                    if (latest !== current) {
                        setUpdateAvailable(data);
                    }
                }
            } catch {
                // Silently ignore network errors for update check
            }
        };
        checkUpdate();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500 pb-24">

            {/* Alerts Bar */}
            <div className="sticky top-0 z-50 w-full flex flex-col items-center pointer-events-none p-2 gap-1">
                {isGuest && (
                    <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm pointer-events-auto backdrop-blur-md border border-amber-200 dark:border-amber-800">
                        <AlertTriangle size={16} />
                        <span>{t('dashboard.guest_warning')}</span>
                        <Button size="sm" variant="primary" className="h-6 px-2 text-xs ml-2 bg-amber-600 hover:bg-amber-700 text-white border-none" onClick={() => navigate('/register')}>
                            {t('landing.btn_register')}
                        </Button>
                    </div>
                )}
                {maintenanceMode && (
                    <div className="bg-red-500 text-white px-4 py-1 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg pointer-events-auto animate-pulse">
                        <AlertTriangle size={14} />
                        {t('alert.maintenance_mode_active', 'Maintenance Mode Active')}
                    </div>
                )}
                {updateAvailable && (
                    <a href={updateAvailable.html_url} target="_blank" rel="noopener noreferrer" className="bg-indigo-600 text-white px-4 py-1 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg pointer-events-auto hover:bg-indigo-700 transition">
                        {t('update.banner', 'New Update Available!')}
                    </a>
                )}
            </div>

            <DashboardNavbar
                user={user}
                isGuest={isGuest}
                isAdminOrMod={isAdminOrMod}
                onAdminClick={() => navigate('/admin')}
                onProfileClick={() => navigate('/profile')}
                onLogout={handleLogout}
                t={t}
            />

            <Container className="mt-8 space-y-8">

                {/* 2FA Promo (Inline if appropriate, but keeping as modal logic for now) */}
                {show2FAPrompt && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <Card className="max-w-sm w-full p-8 text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                                <Shield size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">{t('dashboard.2fa_promo_title', 'Protect your Account')}</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 mb-8">
                                {t('dashboard.2fa_promo_text', "We strongly recommend enabling 2FA.")}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button onClick={setup2FA} variant="primary" className="w-full">
                                    {t('dashboard.2fa_btn_setup', 'Setup 2FA Now')}
                                </Button>
                                <Button onClick={dismiss2FAPrompt} variant="ghost" className="w-full">
                                    {t('dashboard.2fa_btn_later', "Maybe later")}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Questionnaire Banner */}
                {showQuestionnairePrompt && (
                    <Card variant="glass" className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/50 dark:border-indigo-800/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{t('dashboard.complete_profile', 'Complete your Profile')}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('dashboard.better_matches', 'Answer questions to get better matches!')}</p>
                            </div>
                        </div>
                        <Button onClick={() => navigate('/questionnaire')} variant="primary">
                            {t('btn.start', "Start Now")}
                        </Button>
                    </Card>
                )}

                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-2xl inline-flex shadow-inner">
                        <button
                            onClick={() => setActiveTab('matches')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2",
                                activeTab === 'matches'
                                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            )}
                        >
                            <Zap size={16} />
                            {t('dashboard.tab_matches', 'Matches')}
                        </button>
                        <button
                            onClick={() => setActiveTab('inbox')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2",
                                activeTab === 'inbox'
                                    ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            )}
                        >
                            <Inbox size={16} />
                            {t('dashboard.tab_inbox', 'Inbox')}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'matches' && (
                        <div className="space-y-6">
                            <div className="flex items-end justify-between">
                                <div>
                                    <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{t('dashboard.title', 'Your Matches')}</h2>
                                    <p className="text-zinc-500 dark:text-zinc-400">{t('dashboard.subtitle', "People who vibe with you")}</p>
                                </div>
                                <Button onClick={() => navigate('/discover')} variant="shadow" className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
                                    {t('dashboard.discover', "Discover")} 🚀
                                </Button>
                            </div>

                            {!isVisible ? (
                                <div className="text-center py-16 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
                                    <EyeOff size={48} className="mx-auto text-zinc-400 mb-4" />
                                    <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('dashboard.hidden_title', 'You are hidden')}</h3>
                                    <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
                                        {t('dashboard.hidden_desc', "Enable visibility to see matches.")}
                                    </p>
                                    <Button variant="outline" onClick={() => navigate('/profile')}>
                                        {t('dashboard.change_settings', 'Change Settings')}
                                    </Button>
                                </div>
                            ) : matches.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4 grayscale opacity-50">😴</div>
                                    <h3 className="text-xl font-bold text-zinc-400 dark:text-zinc-500">{t('dashboard.no_matches', 'No matches yet')}</h3>
                                    <Button variant="ghost" onClick={() => navigate('/discover')} className="mt-4">
                                        {t('dashboard.try_discover', "Try Discover Mode")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {matches.map((m, i) => (
                                        <MatchCard
                                            key={i}
                                            match={m}
                                            isGuest={isGuest}
                                            onClick={() => setSelectedUser(m)}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'inbox' && (
                        <Card className="min-h-[400px] overflow-hidden p-0">
                            {inboxConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                    <MessageCircle size={48} className="mb-4 opacity-20" />
                                    <p>{t('dashboard.no_convos', 'No conversations yet.')}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {inboxConversations.map((c) => (
                                        <button
                                            key={c.partner_id}
                                            onClick={() => handleOpenChat({ user_id: c.partner_id, username: c.partner_username, image_url: c.partner_image_url })}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition text-left group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-indigo-500/20 transition-all">
                                                {c.partner_image_url ?
                                                    <img src={c.partner_image_url} className="w-full h-full object-cover" /> :
                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-lg dark:bg-indigo-900/30">
                                                        {c.partner_username[0]}
                                                    </div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className="font-bold text-zinc-900 dark:text-white truncate">{c.partner_real_name || c.partner_username}</h4>
                                                    <span className="text-xs text-zinc-500 whitespace-nowrap ml-2">
                                                        {new Date(c.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                                                    {c.last_message}
                                                </p>
                                            </div>
                                            {c.unread_count > 0 && (
                                                <div className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                                                    {c.unread_count}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* Footer Links */}
                <div className="flex justify-center gap-6 text-sm text-zinc-400 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                    <button onClick={() => navigate('/imprint')} className="hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        {t('footer.imprint', 'Impressum')}
                    </button>
                    <button onClick={() => navigate('/privacy')} className="hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                        {t('footer.privacy', 'Datenschutz')}
                    </button>
                </div>
            </Container>

            {/* Modals & Floating Elements */}
            {selectedUser && (
                <PublicProfile
                    userId={selectedUser.user_id}
                    onClose={() => setSelectedUser(null)}
                    onChat={() => handleOpenChat(selectedUser)}
                    t={t}
                />
            )}

            {activeChatUser && (
                <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm shadow-2xl rounded-t-2xl overflow-hidden animate-slide-up">
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
                        t={t}
                    />
                </div>
            )}

            {/* Support FAB */}
            <button
                onClick={() => handleOpenChat({ user_id: 3, username: "Support", role: 'moderator' })}
                className="fixed bottom-6 left-6 z-40 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all border border-zinc-100 dark:border-zinc-700"
                title="Contact Support"
            >
                <LifeBuoy size={24} />
            </button>
        </div>
    );
};

export default Dashboard;
