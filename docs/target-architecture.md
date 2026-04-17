# Target Architecture

## Goal
Build a backend-driven government opportunities platform where structured public content, editorial workflow, trust metadata, alerts, and SEO derive from one canonical runtime model.

## System Shape
### Data and domain
- PostgreSQL is the primary source of truth for structured runtime data.
- Prisma is the main schema, migration, and domain access layer for content, taxonomies, workflow, and operational entities that need long-term ownership.
- Redis is the cache, throttling, queue, and ephemeral state layer.
- Mongo / Cosmos remains legacy-only and should be removed from core runtime paths over time.

### Backend
- Express + TypeScript remains the primary application API.
- The editorial/content platform is centered on Prisma-backed `posts`, taxonomies, versions, audit logs, and content pages.
- Compatibility endpoints may remain temporarily, but new behavior should land on the canonical editorial/content path.
- Legacy Mongo/Cosmos-backed jobs and guarded API prefixes should be registered explicitly as transitional subsystems instead of being hidden in generic startup flow.

### Admin app
- `admin-next` is the editorial CMS and operations console.
- Editorial actions must be enforced in backend policy, not only UI affordances.
- Mock operational views should be quarantined until they are backed by live APIs.

### Public frontend
- Next.js remains the public render layer.
- Public pages fetch from backend content APIs and use selective ISR plus on-demand revalidation.
- Canonical public route vocabulary is preserved while backend content becomes the source of truth.

## Content Lifecycle
1. Editor creates or updates a `Post`.
2. Backend validates structure, taxonomies, slug rules, and trust metadata.
3. Save creates a `PostVersion` snapshot and `AuditLog` entry.
4. Editor submits for review.
5. Reviewer approves or rejects with note.
6. Publisher/admin publishes approved content.
7. Publish triggers cache invalidation and revalidation for affected public surfaces.
8. Expiry and archival rules move content into expired or archived states without breaking canonical recovery.

## Core Runtime Entities
### Content and workflow
- `posts`
- `post_versions`
- `audit_logs`
- `slug_aliases`
- `content_pages`

### Taxonomies
- `organizations`
- `states`
- `categories`
- `qualifications`
- `institutions`
- `exams`
- `colleges`
- `programs`

### Alerts and operational data
- `subscriptions`
- `alert_dispatch_logs`
- Prisma-managed replacements for legacy `app_*` operational tables in phased slices

## Search Strategy
- Use a search adapter boundary so public pages and admin filters are not coupled to one implementation.
- Near term: PostgreSQL full-text and trigram ranking with facet-aware filters.
- Later: add a dedicated search engine only if relevance, scale, or operational needs justify it.

## Caching and Revalidation
- Homepage, listings, taxonomy landings, and sitemap surfaces should use bounded ISR.
- Detail pages should use on-demand invalidation and tag-based cache control.
- Publish, unpublish, archive, and taxonomy changes should emit explicit revalidation targets.

## Trust and SEO Requirements
- Every public detail payload should expose official source links, verification note, timestamps, important dates, and taxonomy breadcrumbs.
- Canonicals, sitemap coverage, schema markup, and indexability rules must derive from backend content truth.
- Frontend seed files may provide fallback presentation metadata, but they should not own canonical public content.

## Migration Rules
- Preserve public routes and compatibility redirects during migration.
- Prefer explicit cutovers over long-lived dual-write states.
- Remove Mongo / Cosmos from startup, health, and scheduled-job critical paths once the Postgres replacement path is complete.
- Keep health and runtime diagnostics honest about which subsystems are core versus transitional.
