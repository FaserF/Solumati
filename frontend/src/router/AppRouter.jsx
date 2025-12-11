import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useI18n } from '../context/I18nContext';

// Components
// Components
import Landing from '../pages/Landing';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import Dashboard from '../components/dashboard/Dashboard';
import AdminPanel from '../components/admin/AdminPanel';
import UserProfile from '../components/user/UserProfile';
import AccountSettings from '../components/user/AccountSettings';
import Legal from '../pages/Legal';
import ForgotPassword from '../components/auth/ForgotPassword';
import ResetPassword from '../components/auth/ResetPassword';
import TwoFactorAuth from '../components/auth/TwoFactorAuth';
import Discover from '../components/social/Discover';
import Questionnaire from '../components/user/Questionnaire';
import MaintenancePage from '../pages/MaintenancePage';
import VerificationBanner from '../components/common/VerificationBanner';
import ConsentBanner from '../components/common/ConsentBanner';
import NotificationPermission from '../components/common/NotificationPermission';
import AuthLayout from '../components/layout/AuthLayout';


// Wrapper to handle URL params like ?reset_token=... and redirect
const UrlParamHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // const { finalizeLogin } = useAuth(); // Unused
    // const { t } = useI18n(); // Unused

    useEffect(() => {
        // 1. Password Reset
        const rToken = searchParams.get('reset_token');
        if (rToken) {
            navigate(`/reset-password?token=${rToken}`);
            return;
        }

        // 2. Verification
        const verifyId = searchParams.get('id');
        const verifyCode = searchParams.get('code');
        if (verifyId && verifyCode) {
            // We should probably redirect to a verify page or handle it here?
            // To match original behavior we can trigger logic.
            // But doing valid fetch inside a router component is tricky if we want to show UI.
            // Let's redirect to specific route /verify
            navigate(`/verify-email?id=${verifyId}&code=${verifyCode}`);
        }

    }, [searchParams, navigate]);

    return null;
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user } = useAuth();
    const { maintenanceMode } = useConfig();

    if (maintenanceMode && (!user || user.role !== 'admin')) {
        return <MaintenancePage type="manual" onAdminLogin={() => { }} />; // Handled by MainLayout logic potentially?
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (adminOnly && user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    if (user.role !== 'admin' && user.is_profile_complete === false) {
        // Force profile completion
        // We can return <Navigate to="/profile" /> but need to avoid loop if we are already at /profile
        // This check should be handled in Dashboard or global check?
        // Current location check would be needed.
        // For now, simpler: Dashboard component checks it.
    }

    return children;
};

const MainLayout = () => {
    const { maintenanceMode, maintenanceReason } = useConfig();
    const { user, finalizeLogin } = useAuth();
    const { t } = useI18n();
    const navigate = useNavigate();

    // Check verification banner state?
    // Ideally this is a layout wrapping the specific pages.

    if (maintenanceMode && (!user || user.role !== 'admin')) {
        return <MaintenancePage type={maintenanceReason} onAdminLogin={() => navigate('/login')} />;
    }

    return (
        <div className="w-full h-full min-h-screen">
            {/* Global Banners */}
            <VerificationBanner onClose={() => { }} />
            <ConsentBanner t={t} onNavigate={(path) => navigate(path === 'legal' ? '/imprint' : '/' + path)} />
            <NotificationPermission t={t} />

            <Routes>
                <Route path="/" element={<Landing
                    onLogin={() => navigate('/login')}
                    onRegister={() => navigate('/register')}
                    onGuest={() => { /* Guest logic triggered in Landing or here? Landing takes onGuest prop */ }}
                    onAdmin={() => navigate('/login')}
                    onLegal={() => navigate('/imprint')}
                    t={t}
                />} />

                {/* Auth Routes */}
                <Route element={<AuthLayout t={t} />}>
                    <Route path="/login" element={<Login t={t} />} />
                    <Route path="/register" element={<Register t={t} />} />
                    <Route path="/forgot-password" element={<ForgotPassword t={t} onBack={() => navigate('/login')} />} />
                    <Route path="/reset-password" element={<ResetPassword t={t} onSuccess={() => navigate('/login')} />} />
                    <Route path="/verify-2fa" element={<TwoFactorAuth t={t} onVerified={(data) => { finalizeLogin(data); navigate('/dashboard'); }} onCancel={() => navigate('/login')} />} />
                </Route>

                {/* Legal */}
                <Route path="/imprint" element={<div className="container mx-auto p-8"><Legal type="imprint" t={t} onBack={() => navigate(-1)} /></div>} />
                <Route path="/privacy" element={<div className="container mx-auto p-8"><Legal type="privacy" t={t} onBack={() => navigate(-1)} /></div>} />
                <Route path="/legal" element={<div className="container mx-auto p-8"><Legal type="imprint" t={t} onBack={() => navigate(-1)} /></div>} />


                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard t={t} /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><UserProfile t={t} onBack={() => navigate('/dashboard')} onOpenSettings={() => navigate('/settings')} /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AccountSettings t={t} onBack={() => navigate('/profile')} /></ProtectedRoute>} />
                <Route path="/discover" element={<ProtectedRoute><Discover t={t} onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
                <Route path="/questionnaire" element={<ProtectedRoute><Questionnaire t={t} onComplete={() => navigate('/dashboard')} onClose={() => navigate('/dashboard')} /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel t={t} onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
            </Routes>
        </div>
    );
};


const AppRouter = () => {
    return (
        <BrowserRouter>
            <UrlParamHandler />
            <MainLayout />
        </BrowserRouter>
    );
};

export default AppRouter;
