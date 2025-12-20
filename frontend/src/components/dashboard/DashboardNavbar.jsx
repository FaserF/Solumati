import { Settings, User, LogOut } from 'lucide-react';
import { APP_NAME } from '../../config';
import { Button } from '../ui/Button';

const DashboardNavbar = ({
    user,
    isAdminOrMod,
    onAdminClick,
    onProfileClick,
    onLogout,
    t
}) => {
    return (
        <div className="w-full max-w-5xl flex justify-between items-center mb-6 md:mb-10 p-3 rounded-2xl glass sticky top-4 z-40 transition-all">
            {/* Left Side: Logo */}
            <div className="flex items-center gap-3 pl-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <img src="/logo/Solumati.png" alt="Logo" className="w-6 h-6 object-contain invert brightness-0" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                        {t('app.title', APP_NAME)}
                    </h1>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{t('navbar.find_connection', 'Find your connection')}</p>
                </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-2">
                {isAdminOrMod && (
                    <Button variant="ghost" size="icon" onClick={onAdminClick} title={t('dashboard.admin_panel')}>
                        <Settings size={20} />
                    </Button>
                )}

                <button
                    onClick={onProfileClick}
                    className="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 group focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors hidden sm:block">
                        {user?.username}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 overflow-hidden ring-2 ring-white dark:ring-zinc-900 shadow-sm">
                        {user?.image_url ? (
                            <img src={user.image_url} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                </button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    className="ml-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                    <LogOut size={18} />
                </Button>
            </div>
        </div>
    );
};

export default DashboardNavbar;
