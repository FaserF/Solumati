import { Outlet } from 'react-router-dom';
import { APP_NAME } from '../../config';
import { Card } from '../ui/Card';

const AuthLayout = ({ children, t, title = APP_NAME, subtitle = "" }) => {
    // Default fallback if no subtitle
    const tagline = subtitle || t('hero.tagline', "Experience the future of connection. Secure, private, and designed for you.");

    return (
        <div className="min-h-screen w-full flex bg-zinc-50 dark:bg-zinc-950">
            {/* Desktop Left Side - Branding/Hero */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center bg-zinc-900">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 opacity-20"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>

                <div className="relative z-10 text-white p-12 max-w-lg">
                    <div className="mb-8 w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl">
                        <img src="/logo/Solumati.png" alt="Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="text-5xl font-bold mb-6 tracking-tight">{title}</h1>
                    <p className="text-xl text-zinc-300 leading-relaxed font-light">
                        {tagline}
                    </p>
                </div>
            </div>

            {/* Right Side - Form Container */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-slide-up">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img src="/logo/Solumati.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{title}</h1>
                    </div>

                    <Card variant="glass" className="w-full shadow-2xl border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-xl">
                        {children || <Outlet />}
                    </Card>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-zinc-400">
                            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
