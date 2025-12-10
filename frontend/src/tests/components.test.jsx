import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import Login from '../components/Login';
import Register from '../components/Register';

// Mock Config & Translations
const mockT = (key, defaultText) => defaultText || key;
const mockConfig = {
    registration_enabled: true,
    allow_password_registration: true,
    oauth_providers: { github: true, google: false }
};

describe('Login Component', () => {
    it('renders email and password inputs', () => {
        render(
            <Login
                email="" setEmail={vi.fn()}
                password="" setPassword={vi.fn()}
                t={mockT}
                config={mockConfig}
            />
        );

        // Check inputs exist
        // Placeholders: "user / mail@example.com", "••••••••"
        expect(screen.getByPlaceholderText(/user \/ mail/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeDefined();

        // check buttons
        expect(screen.getByText('btn.login')).toBeDefined();
        expect(screen.getByText('login.btn_github')).toBeDefined();
    });

    it('updates inputs on change', () => {
        const setEmail = vi.fn();
        const setPassword = vi.fn();

        render(
            <Login
                email="" setEmail={setEmail}
                password="" setPassword={setPassword}
                t={mockT}
                config={mockConfig}
            />
        );

        const emailInput = screen.getByPlaceholderText(/user \/ mail/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        expect(setEmail).toHaveBeenCalledWith('test@example.com');
    });
});

describe('Register Component', () => {
    it('renders registration form when enabled', () => {
        render(
            <Register
                realName="" setRealName={vi.fn()}
                email="" setEmail={vi.fn()}
                password="" setPassword={vi.fn()}
                answers="" setAnswers={vi.fn()}
                t={mockT}
                config={mockConfig}
            />
        );

        expect(screen.getByText('register.title')).toBeDefined();
        expect(screen.getByPlaceholderText('max@example.com')).toBeDefined();
    });

    it('shows disabled message if config.registration_enabled is false', () => {
        const disabledConfig = { ...mockConfig, registration_enabled: false };

        render(
            <Register
                realName="" setRealName={vi.fn()}
                email="" setEmail={vi.fn()}
                password="" setPassword={vi.fn()}
                t={mockT}
                config={disabledConfig}
            />
        );

        expect(screen.getByText('register.disabled_title')).toBeDefined();
        expect(screen.queryByPlaceholderText('max@example.com')).toBeNull();
    });
});
