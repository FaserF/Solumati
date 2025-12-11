import { Outlet } from 'react-router-dom';
import { APP_NAME } from '../../config';

const AuthLayout = ({ children, t, title = APP_NAME, subtitle = "" }) => {
    // Default fallback if no subtitle
    const tagline = subtitle || t('hero.tagline', "Experience the future of connection. Secure, private, and designed for you.");

    return (
        <div className="min-h-screen w-full flex">
            {/* Desktop Left Side - Branding/Hero */}
            <div className="hidden lg:flex w-1/2 bg-black relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-80 animated-gradient"></div>
                <div className="absolute inset-0 backdrop-blur-3xl"></div>
                <div className="relative z-10 text-white p-12 max-w-lg">
                    <h1 className="text-5xl font-bold mb-6 tracking-tight">{title}</h1>
                    <p className="text-xl text-white/90 leading-relaxed">
                        {tagline}
                    </p>
                </div>
            </div>

            {/* Right Side - Form Container */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50 dark:bg-[#121212]">
                <div className="w-full max-w-md">
                    {/* Mobile Logo (only visible on small screens) */}
                    <div className="lg:hidden text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">{title}</h1>
                    </div>

                    <div className="glass-panel relative z-10 animate-in slide-in-from-right-8 duration-500 fade-in">
                        {children || <Outlet />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
