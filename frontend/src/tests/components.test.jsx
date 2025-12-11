import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';

// Mocks
const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigate
}));

const mockLogin = vi.fn().mockResolvedValue({ status: 'success' });
const mockRegister = vi.fn().mockResolvedValue({ status: 'success' });

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        register: mockRegister,
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

// Mock simplewebauthn (used in Login)
vi.mock('@simplewebauthn/browser', () => ({
    startAuthentication: vi.fn(),
    startRegistration: vi.fn()
}));

// Mock CaptchaWidget (used in Login)
vi.mock('../components/common/CaptchaWidget', () => ({
    default: () => <div data-testid="captcha-widget">Captcha</div>
}));

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders email and password inputs', () => {
        render(<Login />);
        expect(screen.getByPlaceholderText(/user \/ mail/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeDefined();
        expect(screen.getByText('btn.login')).toBeDefined();
    });

    it('updates inputs on change', () => {
        render(<Login />);
        const emailInput = screen.getByPlaceholderText(/user \/ mail/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        expect(emailInput.value).toBe('test@example.com');
    });
});

describe('Register Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfig.registration_enabled = true;
    });

    it('renders registration form when enabled', () => {
        render(<Register />);
        // "register.title" is used
        expect(screen.getByText('register.title')).toBeDefined();
    });

    it('shows disabled message if config.registration_enabled is false', async () => {
        mockConfig.registration_enabled = false;
        // Force re-render with new config value.
        // Since useConfig is called on render, checking mutable object prop should work.
        render(<Register />);
        expect(screen.getByText('register.disabled_title')).toBeDefined();
    });
});
