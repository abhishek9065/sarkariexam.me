/**
 * Mixpanel Analytics Provider
 */

import type { AnalyticsProvider } from '../types';

declare global {
    interface Window {
        mixpanel?: {
            init: (token: string, config?: Record<string, unknown>) => void;
            track: (event: string, properties?: Record<string, unknown>) => void;
            track_pageview: (properties?: Record<string, unknown>) => void;
            identify: (userId: string) => void;
            people: {
                set: (properties: Record<string, unknown>) => void;
            };
            reset: () => void;
        };
    }
}

export class MixpanelProvider implements AnalyticsProvider {
    name = 'Mixpanel';
    private token: string;
    private initialized = false;

    constructor(token: string) {
        this.token = token;
    }

    initialize(): void {
        if (this.initialized || typeof window === 'undefined') return;

        // Load Mixpanel script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
        
        script.onload = () => {
            if (window.mixpanel) {
                window.mixpanel.init(this.token, {
                    debug: process.env.NODE_ENV === 'development',
                    track_pageview: false, // We'll handle page views manually
                    persistence: 'localStorage',
                });
                this.initialized = true;
                console.log('[Analytics] Mixpanel initialized:', this.token);
            }
        };

        document.head.appendChild(script);
    }

    trackEvent(event: string, data?: Record<string, unknown>): void {
        if (!this.initialized || !window.mixpanel) return;

        window.mixpanel.track(event, data);
    }

    trackPageView(url: string, title?: string): void {
        if (!this.initialized || !window.mixpanel) return;

        window.mixpanel.track_pageview({
            url,
            title,
        });
    }

    setUser(userId: string, properties?: Record<string, unknown>): void {
        if (!this.initialized || !window.mixpanel) return;

        window.mixpanel.identify(userId);
        
        if (properties) {
            window.mixpanel.people.set(properties);
        }
    }

    clearUser(): void {
        if (!this.initialized || !window.mixpanel) return;

        window.mixpanel.reset();
    }
}
