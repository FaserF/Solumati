import { describe, it, expect } from 'vitest';
import { FALLBACK, APP_NAME } from '../config';

describe('Config Utilities', () => {
    it('defines APP_NAME', () => {
        expect(APP_NAME).toBeDefined();
        expect(APP_NAME).toBe('Solumati');
    });

    it('contains essential fallback translations', () => {
        const requiredKeys = [
            'app.title',
            'btn.login',
            'login.title',
            'register.title'
        ];

        requiredKeys.forEach(key => {
            expect(FALLBACK).toHaveProperty(key);
            expect(typeof FALLBACK[key]).toBe('string');
        });
    });
});
