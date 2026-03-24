/**
 * Centralized URL building utilities for the application.
 */

import type { ContentType } from './types';

/**
 * Build the detail page URL for an announcement.
 * @param type - The content type (job, result, admit-card, etc.)
 * @param slug - The announcement slug
 * @param source - Optional source for analytics tracking
 */
export function buildAnnouncementDetailPath(type: ContentType | string, slug: string, source?: string): string {
    // In the future, source can be added as a query param for analytics
    void source;
    return `/${type}/${slug}`;
}

/**
 * Build the detail page URL for an announcement and return as URL object.
 * Useful when you need the full URL for sharing.
 */
export function buildAnnouncementDetailUrl(type: ContentType | string, slug: string, baseUrl?: string): URL {
    const path = buildAnnouncementDetailPath(type, slug);
    return new URL(path, baseUrl || 'https://sarkariexams.me');
}
