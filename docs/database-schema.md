# Database Schema

## Source of Truth
Canonical schema is defined in `backend/prisma/schema.prisma`.

## Main Entities
### Taxonomy and reference entities
- `organizations`
- `states`
- `categories`
- `qualifications`
- `exams`
- `colleges`
- `programs`
- `tags`

### Core content entity
- `posts`
  - identity: `id`, `slug`, `legacyId`, `legacyAnnouncementId`, `legacySlugs`
  - workflow: `status`, `currentVersion`, `publishedAt`, `archivedAt`
  - trust/editorial: `verificationNote`, `updatedLabel`, `tag`, flags
  - SEO: `seoTitle`, `seoDescription`, `seoCanonicalPath`, `seoIndexable`, `seoOgImage`
  - discoverability: `searchText`

### Post child entities
- `post_categories`
- `post_states`
- `post_qualifications`
- `post_tags`
- `official_sources`
- `important_dates`
- `eligibility_rules`
- `fee_rules`
- `vacancy_rows`
- `admission_details`
- `slug_aliases`

### Workflow and audit entities
- `post_versions`
- `audit_logs`

### Static-content replacement entity
- `content_pages`

### Subscription and dispatch entities
- `subscriptions`
- `subscription_categories`
- `subscription_states`
- `subscription_organizations`
- `subscription_qualifications`
- `subscription_post_types`
- `alert_dispatch_logs`

## Relationship Highlights
- One `post` can map to many categories/states/qualifications via pivot tables.
- One `post` can own many dates/sources/eligibility/fee/vacancy records.
- One `post` can have one `admission_detail` record.
- One `post` can have many version snapshots and audit logs.
- One `subscription` can map to multiple preference dimensions.

## Legacy-to-Relational Mapping
- Mongo `posts` -> PostgreSQL `posts` + child tables.
- Mongo taxonomy collections -> corresponding normalized taxonomy tables.
- Mongo `post_versions` -> `post_versions`.
- Mongo `audit_logs` -> `audit_logs`.
- Mongo `alert_subscriptions` -> `subscriptions` + preference pivots.

## Compatibility Notes
- Legacy slug support is preserved through `legacySlugs` and `slug_aliases`.
- IDs from Mongo can be preserved as string IDs in PostgreSQL for deterministic migration linking.
- Public route contracts remain stable by mapping relational records back to existing API response shapes.
