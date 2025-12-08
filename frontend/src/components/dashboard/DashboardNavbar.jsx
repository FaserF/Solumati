import React from 'react';
import { Settings, User } from 'lucide-react';

const DashboardNavbar = ({
    user,
    isGuest,
    isAdminOrMod,
    onAdminClick,
    onProfileClick,
    onLogout,
    t
}) => {
    return (
        <div className="w-full max-w-5xl flex justify-between items-center mb-6 md:mb-10 p-4 rounded-3xl shadow-sm border border-white/40 bg-white/60 backdrop-blur-xl dark:bg-black/40 dark:border-white/10 z-40 sticky top-2 md:top-6 transition-all">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-pink-500 to-violet-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-xl relative overflow-hidden group">
                    <span className="relative z-10">S</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </div>
                <div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-violet-600 dark:from-pink-400 dark:to-violet-400">
                        {t('app.title', 'Solumati')}
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium tracking-wide">Find your connection</p>
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
    );
};

export default DashboardNavbar;
