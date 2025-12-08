import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock config
vi.mock('./config', () => ({
    API_URL: 'http://localhost:8000',
    FALLBACK: {},
    APP_VERSION: '0.0.0-test'
}));

describe('App Component', () => {
    it('renders landing page by default', () => {
        render(<App />);
        expect(screen.getByText(/Solumati/i)).toBeDefined();
    });
});
