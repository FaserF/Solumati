import React from 'react';
import { Lock } from 'lucide-react';

const Landing = ({ onLogin, onRegister, onGuest, onAdmin, t }) => (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-black opacity-90"></div>

        <div className="z-10 text-center max-w-3xl">
            <h1 className="text-6xl md:text-8xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse">
                {t('app.title')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 font-light">
                {t('landing.tagline')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mx-auto">
                <button onClick={onLogin} className="bg-white text-gray-900 font-bold py-3 px-6 rounded-full hover:scale-105 transition transform shadow-lg">
                    {t('landing.btn_login')}
                </button>
                <button onClick={onRegister} className="bg-transparent border-2 border-pink-500 text-pink-500 font-bold py-3 px-6 rounded-full hover:bg-pink-500 hover:text-white transition transform shadow-lg">
                    {t('landing.btn_register')}
                </button>
                <button onClick={onGuest} className="bg-gray-800 text-gray-400 font-medium py-3 px-6 rounded-full hover:bg-gray-700 hover:text-white transition transform border border-gray-700">
                    {t('landing.btn_guest')}
                </button>
            </div>
        </div>

        <button onClick={onAdmin} className="absolute bottom-4 right-4 text-gray-700 hover:text-gray-500 transition">
            <Lock size={20} />
        </button>
    </div>
);

export default Landing;