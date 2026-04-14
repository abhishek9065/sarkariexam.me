# Target Architecture

## Goal
Build a backend-driven India-focused government opportunities platform where public content, editorial workflow, trust metadata, and SEO all derive from a single content platform rather than frontend seed files.

## System Shape
### Backend
- Express + TypeScript remains the primary application API
- Mongo/Cosmos remains the primary datastore
- New content platform collections:
  - `posts`
  - `post_versions`
  - `audit_logs`
  - `organizations`
  - `states`
  - `categories`
  - `institutions`
  - `exams`
  - `alert_subscriptions`
- Existing `announcements` collection remains temporarily for migration and compatibility

### Admin app
- `admin-next` becomes the editorial CMS
- Editors work on structured post records instead of ad hoc announcement blobs
- Workflow is enforced by backend policy, not only UI affordances
- Version history, audit log, and workflow comments are visible to staff

### Public frontend
- Next.js remains the public render layer
- Core public pages fetch server-side data from the backend content APIs
- Existing browse-heavy route vocabulary is retained
- Public pages render stable DTOs optimized for:
  - homepage section feeds
  - listing pages
  - taxonomy landing pages
  - search
  - SEO detail pages

## Content Lifecycle
1. Editor creates or updates a `Post`
2. Backend validates structure, taxonomies, slug rules, and trust metadata
3. Save creates a `PostVersion` snapshot and `AuditLog` entry
4. Editor submits for review
5. Reviewer approves or rejects with note
6. Publisher/admin publishes approved content
7. Publish updates cache/revalidation targets and public listings
8. Expiry/last-date rules mark posts as expiring or expired for public/archive handling

## Core Collections
### posts
- canonical public content aggregate
- stores user-facing structured content, taxonomies, SEO fields, trust fields, workflow status, publish state, denormalized filter fields, and embedded sections

### post_versions
- immutable snapshots of meaningful saves and transitions
- supports rollback analysis and editorial diff/history

### audit_logs
- immutable actor/action trail for workflow, publish, archive, auth-sensitive admin operations, and bulk content actions

### organizations, states, categories, institutions, exams
- normalized reference collections used for taxonomy landing pages, counts, filters, and editor lookup
- updated by content save flows and migration/backfill scripts

### alert_subscriptions
- future-facing audience targeting for saved filters, category/state/org subscriptions, and publish-triggered notifications

## Public API Design
### Read APIs
- `GET /api/posts/homepage`
  - sectioned latest content for homepage
- `GET /api/posts`
  - list, filter, and search posts
- `GET /api/posts/:slug`
  - SEO-ready detail DTO with canonical resolution
- `GET /api/taxonomies/states`
- `GET /api/taxonomies/states/:slug`
- `GET /api/taxonomies/organizations`
- `GET /api/taxonomies/organizations/:slug`
- `GET /api/taxonomies/categories/:slug`

### Admin APIs
- `GET /api/admin/posts`
- `GET /api/admin/posts/:id`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:id`
- `POST /api/admin/posts/:id/submit`
- `POST /api/admin/posts/:id/approve`
- `POST /api/admin/posts/:id/publish`
- `POST /api/admin/posts/:id/unpublish`
- `POST /api/admin/posts/:id/archive`
- `POST /api/admin/posts/:id/restore`
- `GET /api/admin/posts/:id/history`
- `GET /api/admin/audit-log`

## Search Strategy
- Introduce a search adapter boundary now
- v1 implementation uses Mongo/Cosmos-compatible filters and lightweight text fallback
- Adapter contract hides implementation so Meilisearch, OpenSearch, or Algolia can be introduced later without rewriting public pages or admin filters

## Caching and Revalidation
- Public frontend fetches use server-side caching with bounded TTL for listings
- Detail pages are server-rendered with cache invalidation on publish, unpublish, and archive
- Backend publish actions emit explicit revalidation targets for:
  - homepage
  - affected category listing
  - affected state pages
  - affected organization pages
  - detail page canonical path
  - sitemap

## Trust Features
- Every public detail payload includes:
  - official source links
  - verification note
  - published time
  - updated time
  - important dates
  - expiry/archive state
  - breadcrumb-ready taxonomy context

## Compatibility and Migration
- Existing announcement endpoints remain temporarily available
- A backfill script migrates legacy announcement records into the new `posts` model
- Legacy IDs and legacy slugs are preserved for canonical/redirect lookup
- Public routes are preserved; alias requests redirect to canonical paths resolved by backend data

## Assumptions
- No external CMS is introduced
- Public content remains largely SSR-friendly rather than SPA-only
- Taxonomy management is initially content-driven and auto-upserted from post saves, not a separate complex admin subsystem
