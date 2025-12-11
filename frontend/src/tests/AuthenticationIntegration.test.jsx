
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';

// Mocks
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        login: vi.fn(),
        register: vi.fn(),
        finalizeLogin: vi.fn(),
        user: null
    })
}));

const mockConfig = {
    registration_enabled: true,
    allow_password_registration: true,
    oauth_providers: { github: true, google: true }
};

vi.mock('../context/ConfigContext', () => ({
    useConfig: () => ({ globalConfig: mockConfig })
}));

vi.mock('../context/I18nContext', () => ({
    useI18n: () => ({
        t: (key, defaultText) => defaultText || key
    })
}));

// Mock simplewebauthn
vi.mock('@simplewebauthn/browser', () => ({
    startAuthentication: vi.fn(),
    startRegistration: vi.fn()
}));

// Mock Captcha
vi.mock('../components/common/CaptchaWidget', () => ({
    default: () => <div data-testid="captcha-widget">Captcha</div>
}));

// Helper to render with routes
const renderWithRouter = (initialEntry) => {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route element={<AuthLayout t={(k) => k} />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
};

describe('Authentication Integration Flow', () => {

    it('renders Login input fields when visiting /login inside AuthLayout', () => {
        renderWithRouter('/login');

        // Assert: We should see the Solumati brand text (from Layout)
        expect(screen.getByText(/Experience the future/i)).toBeDefined();

        // Assert: We should see the Login form (nested route)
        // If <Outlet /> is missing, these will fail
        expect(screen.getByPlaceholderText(/user \/ mail/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeDefined();
    });

    it('renders Register input fields when visiting /register inside AuthLayout', () => {
        renderWithRouter('/register');

        // Assert: Layout is present
        expect(screen.getByText(/Experience the future/i)).toBeDefined();

        // Assert: Register form is present
        expect(screen.getByPlaceholderText(/max@example.com/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/^Max$/i)).toBeDefined();
    });
});
