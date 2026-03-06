import type { paths as OpenApiPaths } from '../types/api';

export type OpenApiPath = keyof OpenApiPaths;

export const API_PATHS = {
    authCsrf: '/auth/csrf',
    announcements: '/announcements',
    announcementsHomepage: '/announcements/homepage',
    announcementCardsV3: '/announcements/v3/cards',
    announcementMetaCategories: '/announcements/meta/categories',
    announcementMetaOrganizations: '/announcements/meta/organizations',
    announcementMetaTags: '/announcements/meta/tags',
} as const;

// Static OpenAPI contract assertions for stable endpoints.
const OPENAPI_STATIC_PATH_ASSERTIONS = {
    announcementsApi: '/api/announcements',
    announcementsHomepageApi: '/api/announcements/homepage',
    announcementCardsV3Api: '/api/announcements/v3/cards',
    categoriesApi: '/api/announcements/meta/categories',
    organizationsApi: '/api/announcements/meta/organizations',
    tagsApi: '/api/announcements/meta/tags',
} as const satisfies Record<string, OpenApiPath>;

void OPENAPI_STATIC_PATH_ASSERTIONS;
