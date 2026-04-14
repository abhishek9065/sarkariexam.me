# Publishing SOP

## Scope
This SOP covers editorial publishing for government jobs, results, admit cards, and admissions using the refactored `Post` workflow in the backend and admin CMS.

## Roles
- `editor`: creates and updates drafts, attaches sources, fills structured fields, submits for review.
- `reviewer`: checks accuracy, completeness, SEO basics, trust signals, and approves content.
- `admin` or `superadmin`: publishes, unpublishes, archives, restores, and handles urgent corrections.

## Required Pre-Publish Checklist
- Confirm the item belongs to one primary content type: `job`, `result`, `admit-card`, `admission`, `answer-key`, or `syllabus`.
- Confirm at least one official source URL is attached.
- Confirm the title matches the official notice closely enough for trust and search discoverability.
- Confirm the slug is clean, stable, and does not conflict with an existing live item.
- Confirm category, state, qualification, and organization tags are set when applicable.
- Confirm important dates are structured, especially `application_start`, `last_date`, `exam_date`, or `result_date`.
- Confirm summary and short info are editorial, not copied raw from the notice.
- Confirm verification note explains what was checked and any caveat the user should know.
- Confirm SEO title and description are filled for high-priority pages or acceptably derived.

## Workflow
1. Create the item as `draft`.
2. Fill structured fields in the admin CMS.
3. Add a version note for meaningful edits.
4. Submit the item for review.
5. Reviewer checks factual accuracy, taxonomy quality, and page readiness.
6. Reviewer approves the item.
7. Publisher publishes the item.

## Immediate Publish Rules
- Urgent corrections may bypass normal queueing only for factual fixes after a live page is already published.
- A new item should not be published directly from `draft`.
- If the source is unclear, the item stays out of `published` even if traffic demand is high.

## Post-Publish Checks
- Open the canonical public URL and confirm title, summary, dates, and source links render correctly.
- Confirm the item appears in the correct listing page and relevant state or organization landing page.
- Confirm canonical metadata and sitemap inclusion are intact.
- Confirm the publish response shows revalidation metadata if `FRONTEND_REVALIDATE_URL` and `FRONTEND_REVALIDATE_TOKEN` are configured.
- Treat revalidation as auxiliary right now. Public pages are still rendered request-time in the current deployment topology, so correctness must not depend on cache invalidation completing.

## Corrections
- Minor typo or formatting fixes: update the existing post and add a version note.
- Material factual change: update the existing post, revise verification note, and keep history in `PostVersion`.
- Bad publish: unpublish or archive the item, then correct and republish if needed.

## Duplicate Handling
- Do not publish a second detail page for the same official notice unless the content type materially changes.
- Prefer updating the existing item and preserving the same canonical slug.
- Store prior aliases in `legacySlugs` when a slug must change.

## Audit Expectations
- Every create, update, and workflow action should leave a version or audit trail.
- Use concise version notes such as `added revised fee table`, `updated last date from corrigendum`, or `published after reviewer approval`.
