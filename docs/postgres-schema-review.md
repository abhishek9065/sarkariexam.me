# PostgreSQL Schema Review (Sarkari Result Platform)

## Overview
The current Prisma schema is comprehensive and well-aligned with the requirements of a high-traffic government notifications portal. It successfully transitions the legacy Mongo flexibility into a structured relational model while preserving critical features like slug aliasing and versioning.

## 1. Domain Coverage Analysis

| Domain | Status | Model(s) |
| :--- | :--- | :--- |
| **Core Content** | Excellent | `Post`, `Organization`, `Exam`, `State`, `Category` |
| **Education/Colleges** | Excellent | `College`, `Program`, `AdmissionDetail` |
| **Detail Components** | Excellent | `OfficialSource`, `ImportantDate`, `EligibilityRule`, `FeeRule`, `VacancyRow` |
| **User Interaction** | Excellent | `BookmarkEntry`, `TrackedApplicationEntry`, `SavedSearchEntry` |
| **Alerts & Messaging** | Excellent | `Subscription`, `PushSubscriptionEntry`, `UserNotificationEntry` |
| **Workflow & History** | Excellent | `PostVersion`, `AuditLog`, `WorkflowLogEntry` |
| **Telemetry** | Excellent | `AnalyticsEvent`, `AnalyticsRollup`, `SecurityLog`, `ErrorReportEntry` |
| **Engagement** | Excellent | `UserFeedback`, `CommunityComment` |

## 2. Strengths
- **Slug Management:** The combination of `@unique slug` on `Post` and a dedicated `SlugAlias` model allows for 100% SEO preservation during migrations and re-slugging operations.
- **Workflow Maturity:** The `WorkflowStatus` enum and `PostVersion` model provide professional-grade editorial controls (Draft -> Review -> Approved -> Published).
- **Componentized Details:** Splitting dynamic content like "Important Dates" and "Vacancy Rows" into separate models prevents the "Mega-JSON" anti-pattern and allows for structured queries (e.g., "Find all jobs expiring this week").
- **Telemetry Aggregation:** The `AnalyticsRollup` model is a vital performance optimization, allowing the admin dashboard to load historical trends without scanning millions of raw event rows.

## 3. Identified Inconsistencies
- **Naming Suffixes:** Some models use `Entry` (`BookmarkEntry`) or `Record` (`SiteSettingRecord`) suffixes, while others are plain (`Post`).
- **Pluralization in Mapping:** Table mappings (`@@map`) are inconsistent; some are plural (`organizations`, `posts`) while others are singular with a prefix (`app_security_logs`).
- **Junction Table Naming:** Using `PostCategory` (singular) for the model but `post_categories` (plural) for the table. This is acceptable but should be noted.

## 4. Business Logic Validations
- **Trust & Verification:** The `TrustTag` enum and fields like `sourceNote`, `verificationNote` properly support the "Serious Business" requirement for accuracy.
- **Expiry Logic:** `expiresAt` and `archivedAt` are present on `Post`, allowing for automated cleanup jobs (already implemented in `automationJobs.ts`).
- **SEO Support:** Comprehensive SEO fields (`seoTitle`, `seoDescription`, `seoCanonicalPath`, `seoIndexable`) are present on both `Post` and `ContentPage`.

## 5. Summary Recommendation
The schema is "Production Ready" and has been validated using `npx prisma validate`. No structural changes are required for core functionality. Improvements focus strictly on **Indexing for Scale**, which is covered in the companion document `docs/postgres-indexing-strategy.md`.

## 6. Implementation Notes
- **Migration Path:** New indexes can be applied safely via `npx prisma migrate dev`.
- **Performance:** Multi-column indexes on `Post` (status, publishedAt) significantly improve homepage latency.
- **Auditability:** Added secondary indexing to `AuditLog` to ensure admin action history remains fast as the log grows.
