/**
 * Plausible Analytics Provider
 */

import type { AnalyticsProvider } from '../types';

declare global {
    interface Window {
        plausible?: (
            event: string,
            options?: { props?: Record<string, unknown> }
        ) => void;
    }
}

export class PlausibleProvider implements AnalyticsProvider {
    name = 'Plausible Analytics';
    private domain: string;
    private initialized = false;

    constructor(domain: string) {
        this.domain = domain;
    }

    initialize(): void {
        if (this.initialized || typeof window === 'undefined') return;

        // Load Plausible script
        const script = document.createElement('script');
        script.defer = true;
        script.setAttribute('data-domain', this.domain);
        script.src = 'https://plausible.io/js/script.js';
        document.head.appendChild(script);

        this.initialized = true;
        console.log('[Analytics] Plausible initialized:', this.domain);
    }

    trackEvent(event: string, data?: Record<string, unknown>): void {
        if (!this.initialized || !window.plausible) return;

        window.plausible(event, {
            props: data,
        });
    }

    trackPageView(url: string, title?: string): void {
        if (!this.initialized || !window.plausible) return;

        // Plausible automatically tracks page views, but we can trigger manually
        window.plausible('pageview', {
            props: {
                url,
                title,
            },
        });
    }

    setUser(userId: string, properties?: Record<string, unknown>): void {
        // Plausible is privacy-focused and doesn't support user identification
        // We can track this as a custom event instead
        if (!this.initialized || !window.plausible) return;

        window.plausible('user_identified', {
            props: {
                user_id: userId,
                ...properties,
            },
        });
    }

    clearUser(): void {
        // Plausible doesn't maintain user state, so nothing to clear
        if (!this.initialized || !window.plausible) return;

        window.plausible('user_logout');
    }
}
