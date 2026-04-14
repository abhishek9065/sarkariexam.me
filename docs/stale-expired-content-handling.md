# Stale And Expired Content Handling

## Lifecycle Model
- `draft`: editorial work in progress.
- `in_review`: awaiting reviewer approval.
- `approved`: ready for publish.
- `published`: live and indexable unless SEO settings say otherwise.
- `archived`: intentionally removed from live listings but preserved for history.
- `expired`: derived state for published items whose `expiresAt` or `lastDate` has passed.

## Expiry Rules
- Jobs should usually derive expiry from `lastDate` or `expiresAt`.
- Admit cards and results may remain published after the main event, but can still be archived later when no longer useful.
- Admissions should use official deadline or counselling end date where available.

## Editorial Actions
- If the notice is still useful after the deadline, keep it `published` and allow it to surface as `expired`.
- If the notice is obsolete or superseded, move it to `archived`.
- If the organization issues a corrigendum, update the existing post instead of duplicating it.

## Homepage And Listing Behavior
- Active listings should exclude archived items.
- Active listings should exclude expired items unless the page is specifically an archive or expired listing.
- The `/archive` page should be the safe public landing page for archived and expired material that still has informational value.

## Detail Page Rules
- Keep official source links visible after expiry.
- Show a clear expired or archived notice on the detail page.
- Preserve canonical routing unless there is a strong SEO reason to consolidate.

## Review Cadence
- Review high-traffic categories daily during active recruitment cycles.
- Review admissions and results at least once per working day when the issuing authority is publishing updates frequently.
- Archive stale content in batches, but do not delete historical records from the editorial store.

## When To Create A New Post Instead Of Updating
- A completely new recruitment cycle with a new notice.
- A different result stage that deserves its own public page.
- A separate admission round or institution-specific notice.

## When To Update The Existing Post
- Last-date extension.
- Fee or eligibility corrigendum.
- Revised admit card availability.
- Result revision or additional official link for the same announcement.
