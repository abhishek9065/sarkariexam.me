# PostgreSQL Indexing Strategy

## Objective
Optimize query performance for a high-traffic government jobs portal where read speed for listings and low-latency slug lookups are critical.

## 1. Core Feed Optimization
The most frequent queries are for the homepage and category-specific listings (e.g., "latest jobs", "latest results").

| Index Definition | Target Query | Status |
| :--- | :--- | :--- |
| `@@index([status, publishedAt(sort: Desc)])` | Homepage feed (all types, published only) | **To be Added** |
| `@@index([type, status, publishedAt(sort: Desc)])` | Category Hubs (Jobs/Results/Admit Cards) | **Update Existing** |
| `@@index([status, updatedAt(sort: Desc)])` | Admin dashboard "Recent Activity" | **Existing** |

## 2. Relational & Filter Optimization
Users often filter by State, Organization, or Qualification. Since these are Many-to-Many relations, we optimize the junction tables.

| Index Definition | Model | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `@@index([categoryId, postId])` | `PostCategory` | Reverse lookup (Posts in Category) | **Existing** |
| `@@index([stateId, postId])` | `PostState` | Reverse lookup (Posts in State) | **Existing** |
| `@@index([qualificationId, postId])` | `PostQualification` | Reverse lookup (Posts by Qualification) | **Existing** |
| `@@index([organizationId, status, publishedAt])` | `Post` | Filtered list by Organization | **Existing** |

## 3. SEO & Integrity
| Index Definition | Model | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `@unique slug` | `Post` | Primary lookup by URL slug | **Existing** |
| `@unique slug` | `SlugAlias` | Permanent redirect/legacy slug support | **Existing** |
| `@@index([postId, createdAt])` | `SlugAlias` | Find all aliases for a post | **Existing** |

## 4. Operational & Telemetry
| Index Definition | Model | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `@@index([expiresAt])` | `Post` | Expiry cleanup worker | **Existing** |
| `@@index([type, createdAt])` | `AnalyticsEvent` | Telemetry aggregation | **Existing** |
| `@@index([eventType, createdAt])` | `SecurityLog` | Security audit lookups | **Existing** |
| `@@index([actorId])` | `AuditLog` | Track changes by admin user | **To be Added** |

## 5. Summary of New Indexes
The following indexes will be added to `schema.prisma` to finalize the optimization:
1. `Post`: `@@index([status, publishedAt])` - Global feed performance.
2. `AuditLog`: `@@index([actorId])` - Audit trail performance.
3. `Post`: Refine `@@index([type, status, publishedAt])` to ensure descending sort on `publishedAt`.
