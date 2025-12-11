import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminPanel from '../components/admin/AdminPanel';
import { AuthProvider } from '../context/AuthContext';
import { ConfigProvider } from '../context/ConfigContext';
import { I18nProvider } from '../context/I18nContext';
import { MemoryRouter } from 'react-router-dom';

// Mock the AuthContext values
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useAuth: () => mockUseAuth(),
    };
});

describe('AdminPanel Robustness', () => {
    it('renders without crashing even if user.user_id is undefined', () => {
        // Setup mock to return a user object WITHOUT user_id (simulating the crash condition)
        mockUseAuth.mockReturnValue({
            user: { username: 'Admin', role: 'admin' }, // No user_id
            isGuest: false,
        });

        render(
            <MemoryRouter>
                <ConfigProvider>
                    <I18nProvider>
                        <AdminPanel />
                    </I18nProvider>
                </ConfigProvider>
            </MemoryRouter>
        );

        // precise text match might vary based on re-renders, but checking for header existence is good
        // The header contains "Admin Console"
        expect(screen.getByText(/Admin Console/i)).toBeInTheDocument();
    });

    it('renders correctly when user.user_id is present', () => {
        mockUseAuth.mockReturnValue({
            user: { username: 'Admin', role: 'admin', user_id: 123 },
            isGuest: false,
        });

        render(
            <MemoryRouter>
                <ConfigProvider>
                    <I18nProvider>
                        <AdminPanel />
                    </I18nProvider>
                </ConfigProvider>
            </MemoryRouter>
        );

        expect(screen.getByText(/Admin Console/i)).toBeInTheDocument();
    });
});
