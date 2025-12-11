import { useEffect, useRef } from 'react';
import { useConfig } from '../../context/ConfigContext';

/**
 * CAPTCHA widget component supporting multiple providers
 * - Cloudflare Turnstile
 * - Google reCAPTCHA
 * - hCaptcha
 */
export default function CaptchaWidget({ onVerify, onError, onExpire }) {
    const { globalConfig } = useConfig();
    const containerRef = useRef(null);
    const widgetId = useRef(null);

    const captcha = globalConfig?.captcha;
    const enabled = captcha?.enabled;
    const provider = captcha?.provider || 'cloudflare';
    const siteKey = captcha?.site_key;

    useEffect(() => {
        if (!enabled || !siteKey) return;

        const loadScript = (src, onLoad) => {
            // Check if already loaded
            if (document.querySelector(`script[src*="${src.split('?')[0]}"]`)) {
                onLoad();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = onLoad;
            document.head.appendChild(script);
        };

        const renderWidget = () => {
            if (!containerRef.current) return;

            // Clear any existing widget
            containerRef.current.innerHTML = '';

            if (provider === 'cloudflare') {
                // Cloudflare Turnstile
                if (window.turnstile) {
                    widgetId.current = window.turnstile.render(containerRef.current, {
                        sitekey: siteKey,
                        callback: (token) => onVerify?.(token),
                        'error-callback': () => onError?.('Turnstile error'),
                        'expired-callback': () => onExpire?.()
                    });
                }
            } else if (provider === 'google') {
                // Google reCAPTCHA v2
                if (window.grecaptcha && window.grecaptcha.render) {
                    widgetId.current = window.grecaptcha.render(containerRef.current, {
                        sitekey: siteKey,
                        callback: (token) => onVerify?.(token),
                        'error-callback': () => onError?.('reCAPTCHA error'),
                        'expired-callback': () => onExpire?.()
                    });
                }
            } else if (provider === 'hcaptcha') {
                // hCaptcha
                if (window.hcaptcha) {
                    widgetId.current = window.hcaptcha.render(containerRef.current, {
                        sitekey: siteKey,
                        callback: (token) => onVerify?.(token),
                        'error-callback': () => onError?.('hCaptcha error'),
                        'expired-callback': () => onExpire?.()
                    });
                }
            }
        };

        // Load the appropriate script
        if (provider === 'cloudflare') {
            loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', renderWidget);
        } else if (provider === 'google') {
            loadScript('https://www.google.com/recaptcha/api.js?render=explicit', () => {
                // grecaptcha.ready is needed
                if (window.grecaptcha) {
                    window.grecaptcha.ready(renderWidget);
                }
            });
        } else if (provider === 'hcaptcha') {
            loadScript('https://js.hcaptcha.com/1/api.js?render=explicit', renderWidget);
        }

        return () => {
            // Cleanup
            if (widgetId.current !== null) {
                try {
                    if (provider === 'cloudflare' && window.turnstile) {
                        window.turnstile.remove(widgetId.current);
                    } else if (provider === 'google' && window.grecaptcha) {
                        window.grecaptcha.reset(widgetId.current);
                    } else if (provider === 'hcaptcha' && window.hcaptcha) {
                        window.hcaptcha.reset(widgetId.current);
                    }
                } catch (e) { /* ignore cleanup errors */ }
            }
        };
    }, [enabled, provider, siteKey, onVerify, onError, onExpire]);

    if (!enabled || !siteKey) return null;

    return (
        <div
            ref={containerRef}
            className="captcha-widget flex justify-center my-4"
            data-provider={provider}
        />
    );
}
