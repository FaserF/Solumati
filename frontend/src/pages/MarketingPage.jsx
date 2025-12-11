import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { ArrowLeft, Rocket, Shield, Heart, Monitor } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="bg-white/10 to-transparent p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-pink-500/50 hover:bg-white/15 transition-all duration-300 group">
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="text-white" size={24} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300 leading-relaxed font-light">{description}</p>
    </div>
);

const MarketingPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden font-sans">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-900 via-gray-900 to-black z-0 pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-600 rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse" />

            {/* Content Container */}
            <div className="relative z-10 container mx-auto px-6 py-12 md:py-20 flex flex-col items-center">

                {/* Header / Nav */}
                <div className="w-full flex justify-between items-center mb-16 md:mb-24 fade-in-down">
                    <div className="flex items-center gap-3">
                        <img src="/logo/Solumati.png" alt="Solumati" className="w-10 h-auto" />
                        <span className="font-bold text-2xl tracking-tight hidden md:block">Solumati</span>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 hover:bg-gray-700 transition-colors text-sm font-medium backdrop-blur-md"
                    >
                        <ArrowLeft size={16} />
                        {t('common.back', 'Back')}
                    </button>
                </div>

                {/* Hero Section */}
                <div className="text-center max-w-4xl mx-auto mb-20 fade-in-up">
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 animate-gradient">
                            {t('marketing.hero.title', 'Find Your Perfect Match')}
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-10 leading-relaxed font-light max-w-2xl mx-auto">
                        {t('marketing.hero.subtitle', 'Solumati brings people together with smart matching, secure chats, and a vibrant community. Experience dating evolved.')}
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/register')}
                            className="bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition shadow-xl hover:shadow-2xl hover:shadow-white/20"
                        >
                            {t('marketing.btn.start', 'Get Started Now')}
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 rounded-full font-bold text-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800 hover:border-gray-500 transition backdrop-blur-md"
                        >
                            {t('landing.btn_login', 'Login')}
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mb-24 fade-in-up delay-100">
                    <FeatureCard
                        icon={Heart}
                        title={t('marketing.feature.match.title', 'Smart Matching')}
                        description={t('marketing.feature.match.desc', 'Our algorithm connects you based on deep compatibility, ensuring meaningful connections that last.')}
                    />
                    <FeatureCard
                        icon={Shield}
                        title={t('marketing.feature.privacy.title', 'Privacy First')}
                        description={t('marketing.feature.privacy.desc', 'Your data is yours. We use end-to-end encryption for chats and strict data policies.')}
                    />
                    <FeatureCard
                        icon={Rocket}
                        title={t('marketing.feature.modern.title', 'Modern Experience')}
                        description={t('marketing.feature.modern.desc', 'Enjoy a slick, fast, and responsive interface designed for the modern web and mobile devices.')}
                    />
                    <FeatureCard
                        icon={Monitor}
                        title={t('marketing.feature.open.title', 'Open Source')}
                        description={t('marketing.feature.open.desc', 'Transparent development. We believe in community-driven software that you can trust.')}
                    />
                </div>

                {/* CTA Section */}
                <div className="w-full max-w-5xl rounded-3xl bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-white/10 p-12 text-center relative overflow-hidden fade-in-up delay-200">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-20" />
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">{t('marketing.cta.title', 'Ready to join the revolution?')}</h2>
                    <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto relative z-10">
                        {t('marketing.cta.subtitle', 'Thousands of users are waiting to meet you. Don\'t miss out on your next great connection.')}
                    </p>
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:shadow-lg hover:from-pink-400 hover:to-purple-500 transition-all relative z-10"
                    >
                        {t('marketing.btn.join', 'Create Free Account')}
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-24 text-gray-500 text-sm">
                    © {new Date().getFullYear()} Solumati. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default MarketingPage;
