import React from 'react';
import { User, CheckCircle, EyeOff } from 'lucide-react';

const MatchCard = ({ match, isGuest }) => {
    return (
        <div className="group bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:shadow-xl hover:border-pink-100 dark:hover:border-pink-900/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-50/0 to-pink-50/50 dark:from-pink-900/0 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="flex items-center gap-5 relative z-10">
                <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-inner ${isGuest ? 'filter blur-sm opacity-50' : ''}`}>
                    {isGuest ? <EyeOff className="text-gray-400" /> : <User className="text-gray-400 w-8 h-8" />}
                </div>

                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-1">
                        {match.username}
                        {!isGuest && <CheckCircle size={14} className="text-white fill-sky-500" />}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {isGuest ? "***" : "Compatibility"}
                    </p>
                </div>
            </div>

            <div className="relative z-10 text-right">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 drop-shadow-sm">
                    {match.score}%
                </div>
            </div>
        </div>
    );
};

export default MatchCard;
