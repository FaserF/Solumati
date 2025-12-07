import React from 'react';
import { AlertTriangle, EyeOff, User, CheckCircle, Shield } from 'lucide-react';

const Dashboard = ({ user, matches, isGuest, onLogout, onRegisterClick, onAdminClick, t }) => {

    // Check if user has special roles
    const isAdminOrMod = user && (user.role === 'admin' || user.role === 'moderator');

    return (
        <div className="min-h-screen bg-gray-50">
            {isGuest && (
                <div className="bg-yellow-400 text-yellow-900 p-3 text-center font-bold flex justify-center items-center gap-2 shadow-sm sticky top-0 z-50">
                    <AlertTriangle size={20} />
                    {t('dashboard.guest_warning')}
                    <button onClick={onRegisterClick} className="ml-4 bg-black text-white text-xs px-3 py-1 rounded hover:bg-gray-800">
                        {t('landing.btn_register')}
                    </button>
                </div>
            )}

            <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    {/* Logo in Navbar - Path fixed */}
                    <img
                        src="/logo/android-chrome-192x192.png"
                        alt="Logo"
                        className="w-10 h-10 rounded-lg shadow-sm"
                    />
                    <span className="font-bold text-xl text-gray-800">{t('app.title')}</span>
                </div>
                <div className="flex items-center gap-4">
                    {isAdminOrMod && (
                        <button onClick={onAdminClick} className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-200 hover:bg-red-100 transition">
                            <Shield size={14} />
                            {t('dashboard.admin_panel', 'Admin Panel')}
                        </button>
                    )}
                    <span className="text-gray-600 text-sm hidden md:inline">
                        {user?.username}
                    </span>
                    <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-500 font-medium">
                        {t('btn.back')} (Logout)
                    </button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-6 md:p-8">
                <h2 className="text-3xl font-bold mb-8 text-gray-800">{t('dashboard.title', 'Deine Matches')}</h2>

                {matches.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">{t('dashboard.no_matches')}</div>
                ) : (
                    <div className="grid gap-4">
                        {matches.map((m, i) => (
                            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition">
                                <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className={`w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 ${isGuest ? 'filter blur-sm opacity-50' : ''}`}>
                                        {isGuest ? <EyeOff className="text-gray-400" /> : <User className="text-pink-500 w-8 h-8" />}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                            {m.username}
                                            {!isGuest && <CheckCircle size={16} className="text-blue-500" />}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {isGuest ? "***" : t('match.pairing_text', 'Passt zu dir')}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 md:mt-0 text-right w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 flex md:block justify-between items-center">
                                    <span className="md:hidden font-bold text-gray-600">{t('dashboard.match_score')}:</span>
                                    <div>
                                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
                                            {m.score}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;