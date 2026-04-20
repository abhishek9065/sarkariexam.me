# Frontend Data Flow Migration

## Overview
This document outlines the migration of the frontend data flow from hardcoded mock data to PostgreSQL-backed APIs. The goal of this migration was to eliminate the dependency on seeded content while preserving the "Sarkari Result"-style dense UX, stable canonical slugs, and category/detail page structure.

## Summary of Changes

1. **Identification of Hardcoded Dependencies**
   - The primary source of hardcoded data was located in `frontend/app/lib/public-content.ts`. This file contained thousands of lines of seeded dummy announcements (e.g., `jobAnnouncements`, `resultAnnouncements`, `admitCardAnnouncements`, `answerKeyAnnouncements`, `admissionAnnouncements`) and state data (`statePageMeta`).
   - Helper functions specifically designed to search, filter, and render this hardcoded data (e.g., `getAnnouncementEntries`, `resolveAnnouncementParam`, `resolveAnnouncementAcrossSections`, `getStateAnnouncements`, `getSearchResults`, `getStateDirectoryEntries`) were identified as dead code since the actual dynamic routes were already configured to use the `content-api.ts`.

2. **Temporary UI Metadata vs. Live Business Content**
   - **UI Metadata (Kept):** Structural metadata used for SEO, styling, and navigation was retained. This includes `announcementCategoryMeta`, `resourceCategoryMeta`, `infoPageMeta`, `auxiliaryPageMeta`, `communityPageMeta`, and structural category types (`CategoryPageMeta`, etc.). Utility functions like `buildSearchPath` and `buildJobsPath` were also preserved because they power the site's navigation components.
   - **Live Business Content (Removed):** The arrays of hardcoded post data and the state counts were stripped. The application now correctly defers to the API for all live business data.

3. **Transition to PostgreSQL-Backed APIs**
   - Live content fetching is now strictly routed through `frontend/lib/content-api.ts`. 
   - Core API integrations such as `getListingEntries` (for category pages like Jobs, Results), `getRawListing` (for Search), `getHomepageSections` (for the Homepage), and `getDetail` (for the detail pages) are fully operational and communicate directly with the PostgreSQL-backed backend.
   - Taxonomy (states, organizations) fetching dynamically queries the backend rather than relying on the frontend array (`getTaxonomyList`, `getTaxonomyLanding`).

4. **Preservation of Page Structure and SEO**
   - **Routes/Slugs:** The canonical URL structures (`/jobs/[slug]`, `/results/[slug]`, `/states/[slug]`, etc.) remain identical to the user.
   - **SEO:** Metadata functions like `loadInfoPageMeta` use canonical paths to ensure stable SEO metrics.
   - **Dense UX:** The frontend layout components (e.g., `PublicSiteShell`, `PublicCategoryHubPage`, `PublicAnnouncementDetailPage`) were not altered, guaranteeing that the dense, information-rich presentation remains exactly as requested.

5. **Isolation of Fallback Content**
   - Fallback and structural components for resources (`syllabus`, `scholarships`) or info pages (`about`, `contact`, `privacy`) remain in `public-content.ts`. These aren't "live business content" but rather static configuration metadata that dictate the layout and static links of the portal.

## Next Steps
- Continue to monitor the backend APIs (`/api/posts`, `/api/content/homepage`, `/api/content/taxonomies`) to ensure performance characteristics meet the frontend's latency requirements.
- Validate cache revalidation timings (`CONTENT_CACHE_REVALIDATE_SECONDS`) to ensure live updates from PostgreSQL appear promptly on the frontend without requiring forced rebuilds.
