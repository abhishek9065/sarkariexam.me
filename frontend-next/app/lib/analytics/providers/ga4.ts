/**
 * Google Analytics 4 Provider
 */

import type { AnalyticsProvider } from '../types';

declare global {
    interface Window {
        gtag?: (
            command: string,
            targetId: string | Date,
            config?: Record<string, unknown>
        ) => void;
        dataLayer?: unknown[];
    }
}

export class GA4Provider implements AnalyticsProvider {
    name = 'Google Analytics 4';
    private measurementId: string;
    private initialized = false;

    constructor(measurementId: string) {
        this.measurementId = measurementId;
    }

    initialize(): void {
        if (this.initialized || typeof window === 'undefined') return;

        // Load GA4 script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
        document.head.appendChild(script);

        // Initialize dataLayer
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
            // eslint-disable-next-line prefer-rest-params
            window.dataLayer?.push(arguments);
        };

        window.gtag('js', new Date());
        window.gtag('config', this.measurementId, {
            send_page_view: false, // We'll handle page views manually
        });

        this.initialized = true;
        console.log('[Analytics] GA4 initialized:', this.measurementId);
    }

    trackEvent(event: string, data?: Record<string, unknown>): void {
        if (!this.initialized || !window.gtag) return;

        window.gtag('event', event, data);
    }

    trackPageView(url: string, title?: string): void {
        if (!this.initialized || !window.gtag) return;

        window.gtag('event', 'page_view', {
            page_location: url,
            page_title: title,
        });
    }

    setUser(userId: string, properties?: Record<string, unknown>): void {
        if (!this.initialized || !window.gtag) return;

        window.gtag('config', this.measurementId, {
            user_id: userId,
            ...properties,
        });
    }

    clearUser(): void {
        if (!this.initialized || !window.gtag) return;

        window.gtag('config', this.measurementId, {
            user_id: undefined,
        });
    }
}
