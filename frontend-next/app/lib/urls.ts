/**
 * Centralized URL building utilities for the application.
 */

import type { ContentType } from './types';

export const CATEGORY_PATHS: Record<ContentType, string> = {
    job: '/jobs',
    result: '/results',
    'admit-card': '/admit-cards',
    'answer-key': '/answer-keys',
    syllabus: '/syllabus',
    admission: '/admissions',
};

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

export function buildCategoryPath(type: ContentType): string {
    return CATEGORY_PATHS[type];
}

/**
 * Build the detail page URL for an announcement and return as URL object.
 * Useful when you need the full URL for sharing.
 */
export function buildAnnouncementDetailUrl(type: ContentType | string, slug: string, baseUrl?: string): URL {
    const path = buildAnnouncementDetailPath(type, slug);
    return new URL(path, baseUrl || 'https://sarkariexams.me');
}
