# Repository Audit

## Overview
- Repository shape is directionally correct for a serious government-opportunities platform: `backend`, `frontend`, `admin-next`, `nginx`, deployment scripts, and CI already exist.
- The main architectural problem is not missing infrastructure. It is that public editorial content is still largely seeded in the frontend while the backend and admin app only partially support a real publishing workflow.
- The recommended approach is an incremental refactor, not a rewrite. Keep the current stack and delivery pipeline, replace the content model and public content source of truth, and rebuild the editorial workflow around typed backend entities.

## Keep
### Backend and operational foundation
- `backend` Express + TypeScript API baseline
- MongoDB / Azure Cosmos DB (Mongo API) integration
- Existing auth, CSRF, rate limiting, request ID, error handling, and metrics middleware
- Existing analytics, subscriptions, profile, and notification foundations where they are already live-data based
- `nginx` reverse proxy, Docker deployment, GitHub Actions CI/CD, and deployment scripts

### Public route vocabulary and browse UX
- Public route families such as `/jobs`, `/results`, `/admit-cards`, `/admissions`, `/states`, `/search`, and detail aliases
- Dense Sarkari-style browse-first layout and mobile-first information density
- Useful category and legacy route ideas, provided they are re-backed by API data and canonical handling

### Admin shell and auth scaffolding
- `admin-next` application shell, navigation, auth/session pattern, and TanStack Query setup
- Existing settings and some workflow/dashboard API foundations, after they are reworked to use real content-platform data

## Replace
### Frontend-seeded public content
- Replace `frontend/app/lib/public-content.ts` as the source of truth for jobs, results, admit cards, admissions, state pages, and detail content
- Replace public pages that currently render directly from seeded arrays
- Replace build-time redirect generation in `frontend/next.config.ts` that depends on local seeded content records

### Weak editorial/runtime contracts
- Replace the generic `Announcement` mega-model as the long-term primary content aggregate
- Replace coarse role checks that effectively allow only `admin`
- Replace demo-data admin pages with live CMS screens backed by content APIs

## Rebuild
### Content platform
- Rebuild the backend around typed content aggregates and normalized taxonomies
- Add real version history, audit logs, explicit workflow transitions, verification metadata, and expiry/archive behavior
- Add taxonomy landing APIs for state, organization, category, exam, and institution

### SEO layer
- Rebuild page metadata so listings and detail pages are API-driven, canonicalized, and sitemap-aware
- Add structured data, sitemap generation, and route-level metadata instead of relying on generic root metadata only

## Hardcoded Content Sources
- `frontend/app/lib/public-content.ts`
  - core seeded source for homepage sections, listing pages, detail pages, search, states, route aliases, and several informational pages
- `frontend/app/components/homepage/HomePageLatestUpdates.tsx`
  - consumes seeded section items directly
- `frontend/app/(site)/*`
  - listing and detail pages resolve content from the seeded registry rather than backend APIs
- `frontend/next.config.ts`
  - generates redirects from local seeded content records
- `admin-next/app/announcements/announcements-list-page.tsx`
  - local demo array instead of backend data
- `admin-next/app/dashboard/dashboard-page.tsx`
  - visual demo metrics instead of live API-backed metrics
- `admin-next/app/audit-log/*`, `admin-next/app/subscribers/*`, `admin-next/app/analytics/*`
  - mixed or demo data usage where live APIs should be authoritative

## Missing CMS / Editorial Workflow Pieces
- No strong first-class `Post` aggregate for jobs, results, admit cards, and admissions
- No normalized editorial entities for organization, state, category, institution, exam, official source, or structured admissions data
- No robust draft -> review -> approved -> published workflow enforcement
- No role model that cleanly separates editor, reviewer, publisher/admin, and superadmin permissions
- No structured verification notes or official-source trust model in the current public detail payload
- No first-class version notes and revision history UI in the admin editor
- No reliable expiry/archive automation model derived from important dates
- No editor-friendly taxonomy management or tagging model for state, qualification, and organization references

## Weak Schema / Modeling Areas
- Current content is primarily a single `Announcement` record with generic strings:
  - `category: string`
  - `organization: string`
  - `minQualification?: string`
  - `location?: string`
- Large escape hatches hide core domain structure:
  - `jobDetails?: any`
  - `typeDetails?: Record<string, unknown>`
  - `schema?: Record<string, unknown>`
- Version history is embedded and weakly structured instead of being a first-class collection
- State-wise, qualification-wise, and organization-wise filtering are string-regex based rather than taxonomy-backed
- Admission-specific content, institutions, programs, and exams are not properly modeled

## SEO Risks
- Root metadata is generic and partially outdated
- Page-level metadata generation is mostly missing for listings and detail pages
- Canonical logic depends on seeded frontend records instead of backend content truth
- No dynamic sitemap implementation for core public content
- `robots.txt` lacks sitemap reference
- Metadata asset references are inconsistent with actual files in `frontend/public`
- Legacy alias handling depends on build-time seeded routes, which does not scale once content becomes backend-managed

## Scalability Risks
- Public content updates require frontend seed edits instead of editorial publishing
- Search and filtering rely on regex/string matching over a generic announcement collection
- No search abstraction boundary for later dedicated search infrastructure
- No normalized taxonomy collections for fast counts and landing pages
- Homepage/listing/detail content is not shaped for API caching, revalidation, or selective invalidation
- Admin analytics/dashboard surfaces are not connected to the real publishing workflow

## Security and Deployment Hygiene Risks
- Editorial authorization is effectively `admin`-only despite the UI and types implying richer roles
- Environment/domain metadata is inconsistent across frontend and backend branding/config
- Placeholder verification metadata remains in SEO config
- Environment-specific certificate material is tracked in-repo and should be explicitly justified or removed
- Public/frontend metadata and manifest references are inconsistent, increasing crawl and install quality issues
- Existing deployment and health-check structure is solid, but content publish invalidation and readiness expectations are not yet documented as a content platform

## Migration-Sensitive Route Notes
- Preserve current top-level public routes for jobs, results, admit cards, admissions, states, and search
- Preserve detail canonical destinations and route aliases where possible
- Replace seeded redirect generation with backend-aware canonical resolution
- Preserve public browse density and avoid route breaks without redirect or canonical recovery

## Assumptions
- Existing stack remains in place
- Mongo/Cosmos remains the primary datastore
- Answer keys and syllabus remain model-compatible but secondary to the four core opportunity types
- Public route vocabulary is preserved unless a concrete technical constraint forces a redirect
