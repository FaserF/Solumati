import React from 'react';

const Login = ({ email, setEmail, password, setPassword, onLogin, onBack, t }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">{t('login.title')}</h2>
            <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('label.email')}</label>
                <input
                    className="w-full p-4 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="mail@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
            </div>
            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('label.password')}</label>
                <input
                    className="w-full p-4 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    type="password"
                    placeholder="***"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
            </div>
            <button onClick={onLogin} className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-gray-800 transition">
                {t('btn.login')}
            </button>
            <button onClick={onBack} className="w-full mt-4 text-gray-500 hover:text-black transition">
                {t('btn.back')}
            </button>
        </div>
    </div>
);

export default Login;