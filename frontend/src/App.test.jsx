/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock config
vi.mock('./config', () => ({
    API_URL: 'http://localhost:8000',
    FALLBACK: {},
    APP_VERSION: '0.0.0-test',
    APP_RELEASE_TYPE: 'test'
}));


describe('App Component', () => {
    beforeEach(() => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    maintenance_mode: false,
                    translations: {
                        "app.title": "Solumati",
                        "landing.tagline": "Stop Swiping. Start Connecting.",
                        "landing.btn_login": "Log in",
                        "landing.btn_register": "Register",
                        "landing.btn_guest": "Browse as guest"
                    }
                }),
            })
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders landing page by default', async () => {
        render(<App />);
        expect(await screen.findByText(/Solumati/i)).toBeDefined();
    });
});
