# Database Indexing Strategy

## Objectives
- Keep homepage/list/detail queries fast under high read volume.
- Support typo-tolerant and partial keyword search.
- Preserve efficient workflow/admin filtering.
- Keep migration and reconciliation operations predictable.

## Baseline Indexes
Baseline relational indexes are generated from `backend/prisma/schema.prisma` (via `@@index` and `@unique`).

Key examples:
- `posts(type, status, publishedAt)`
- `posts(status, updatedAt)`
- `posts(expiresAt)`
- taxonomy slug uniqueness on all taxonomy tables
- unique post slug and unique slug aliases
- pivot indexes for category/state/qualification filters

## Search-Specific Indexes
Applied via `backend/prisma/migrations/202604140002_search_indexes/migration.sql`:
- trigram GIN on `posts.searchText`
- trigram GIN on `posts.title`
- trigram GIN on `posts.summary`
- tsvector GIN expression index over title + summary + searchText
- GIN on `content_pages.payload` for JSON filtering

## Query Pattern Mapping
- Homepage by type/status/date:
  - uses composite post indexes by type/status/publishedAt.
- Taxonomy landing pages:
  - uses pivot table indexes plus post status/date filters.
- Editorial list and workflow queues:
  - uses status/updatedAt indexes and taxonomy pivots.
- Search:
  - uses trigram for fuzzy/substring matching and tsvector for rankable full-text.

## Maintenance Guidance
- Run `ANALYZE` regularly for stable planner quality.
- Watch index bloat on high-churn tables (`posts`, child tables).
- Review slow queries with `EXPLAIN (ANALYZE, BUFFERS)` before adding new indexes.
- Prefer measured index additions over blanket indexing to avoid write amplification.

## Future Optimization Track
- Add weighted tsvector columns with generated columns/materialization for richer ranking.
- Add language-aware dictionaries and synonym tables for India-specific spelling variance.
- Add partial indexes for common active-only slices (`status='published'`).
