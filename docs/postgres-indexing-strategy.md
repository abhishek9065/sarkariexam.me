# PostgreSQL Indexing Strategy

## Objective
Optimize query performance for a high-traffic government jobs portal where read speed for listings, filters, and low-latency slug lookups are critical. The primary goal is to ensure the database can handle heavy read loads seamlessly, particularly around feed generation.

## 1. Core Feed Optimization
The most frequent queries filter posts by type, status, and various relational dimensions, and order them by `publishedAt` descending.

**Indexes Implemented:**
- `@@index([status, publishedAt(sort: Desc)])` - Fast retrieval of the global homepage feed.
- `@@index([type, status, publishedAt(sort: Desc)])` - Fast retrieval for category hubs (e.g., Jobs, Results).
- `@@index([isFeatured, status, publishedAt(sort: Desc)])` - Fast retrieval of featured content.
- `@@index([isUrgent, status, publishedAt(sort: Desc)])` - Fast retrieval of urgent updates.
- `@@index([status, updatedAt(sort: Desc)])` - Efficient loading of recent admin activity.

## 2. Relational & Filter Optimization
Users frequently filter posts by specific relations (State, Organization, Exam, Program). 

**Indexes Implemented:**
- `@@index([organizationId, status, publishedAt(sort: Desc)])` on `Post`
- `@@index([institutionId, status, publishedAt(sort: Desc)])` on `Post`
- `@@index([examId, status, publishedAt(sort: Desc)])` on `Post`
- `@@index([programId, status, publishedAt(sort: Desc)])` on `Post`
- Many-to-Many junctions (`PostCategory`, `PostState`, `PostQualification`) use reverse lookup composite indexes (e.g., `@@index([categoryId, postId])`).

## 3. Telemetry & Expiry
**Indexes Implemented:**
- `@@index([expiresAt])` on `Post` - Speeds up automated cleanup/archival jobs.
- `@@index([createdAt(sort: Desc)])` on `Post`
- `@@index([actorId, createdAt])` on `AuditLog` - Optimizes admin trail retrieval.

## Summary of Changes
A database migration was generated (`optimize_indexes`) to explicitly apply `sort: Desc` to the critical timestamp indexes on the `Post` model. This eliminates costly in-memory or on-disk sorts for homepage queries, dramatically reducing latency and Neon compute usage.
