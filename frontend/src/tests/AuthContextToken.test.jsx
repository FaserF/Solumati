import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';

// Mock I18nContext
vi.mock('../context/I18nContext', () => ({
    useI18n: () => ({
        t: (k) => k,
        changeLanguage: vi.fn(),
        language: 'en'
    })
}));


// Mock Fetch
global.fetch = vi.fn();

// Component to consume auth context and display status
const TestComponent = () => {
    return <div>Auth Loaded</div>;
};

describe('AuthContext Token Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Mock matchMedia
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    it('should NOT attempt to fetch user if token is "undefined" string', async () => {
        localStorage.setItem('token', 'undefined');

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Should render immediate children
        expect(screen.getByText('Auth Loaded')).toBeInTheDocument();

        // Wait a tick to ensure useEffect runs
        await waitFor(() => { });

        // Fetch should NOT have been called
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should NOT attempt to fetch user if token is "null" string', async () => {
        localStorage.setItem('token', 'null');

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => { });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch user if token is valid', async () => {
        localStorage.setItem('token', '123_valid_token');

        // Use mockResolvedValue (not Once) to avoid crash if called multiple times (e.g. strict mode)
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ user_id: 123, username: 'TestUser', role: 'user' }),
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/users/123_valid_token'), expect.anything());
        });
    });
});
