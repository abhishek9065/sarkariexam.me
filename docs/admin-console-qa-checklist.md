# Admin Console QA Checklist

Use this checklist before an Admin Console release and after changes to authentication, navigation, editorial workflow, campaigns, or role enforcement. Run destructive and delivery checks only in a non-production environment with disposable records and non-customer recipients.

## Test record

- Build/commit: `______________________________`
- Environment and admin URL: `______________________________`
- API/backend version: `______________________________`
- Tester: `______________________________`
- Date: `______________________________`
- Browsers/viewports: `______________________________`
- Result: [ ] Pass [ ] Pass with known issues [ ] Fail
- Issue links/notes: `______________________________`

## Preconditions

- [ ] The admin frontend and backend are running with the intended release configuration.
- [ ] The browser console and Network panel are open; preserve logs while navigating.
- [ ] Test accounts exist for `editor`, `reviewer`, `admin`, and `superadmin`.
- [ ] Disposable content, user, subscriber, campaign, comment/report, SEO issue, error report, and audit records exist where needed.
- [ ] Campaign delivery is restricted to a test audience and safe email/push destinations.
- [ ] A second superadmin exists before testing superadmin demotion, deactivation, or deletion safeguards.
- [ ] For every check below, record unexpected console exceptions, failed requests, stale UI, duplicate submissions, and missing success/error feedback.

## Authentication and shell

### Login and logout

- [ ] Open the admin URL while signed out; the login screen appears and protected content is not briefly exposed.
- [ ] Submit empty and invalid credentials; validation/error feedback appears without a console exception or redirect loop.
- [ ] Sign in with each test role; the dashboard loads and the displayed identity and role are correct.
- [ ] Refresh a protected route; the session is restored without showing the login form after loading completes.
- [ ] Sign out from the sidebar, then repeat from the header; each ends the session and protected routes show the login screen.
- [ ] After logout, use Back and directly enter a protected URL; protected data is not displayed.
- [ ] If password recovery is configured, request recovery for a test account and verify neutral success/error handling without account enumeration.

### Dashboard command center (`/`)

- [ ] Summary metrics and operational queues load from the API; loading, empty, partial-error, and success states do not shift or overlap the layout.
- [ ] Editorial, campaign, community, error-report, SEO, and system-health cards show plausible values for the test data.
- [ ] Each queue/card link opens its intended filtered or detail page.
- [ ] Refreshing the dashboard does not duplicate requests indefinitely or produce an unhandled exception.

### Sidebar navigation

- [ ] Every visible desktop link opens the correct route and receives the active state, including announcement type query filters.
- [ ] Collapse and expand the desktop sidebar; labels, icons, tooltips, and content width remain usable.
- [ ] At a mobile viewport, open the sidebar, follow a link, and dismiss it with the close button and backdrop.
- [ ] Role-restricted links are hidden for roles that do not have access.
- [ ] New Post, View Site, user identity, theme control, and Logout behave correctly.

### Command palette

- [ ] Open with the search button and with `Ctrl+K`/`Cmd+K`; focus moves to the search field.
- [ ] Filter by partial label and section; matching commands remain and a no-results state appears for an unmatched query.
- [ ] Run a navigation command and New Post; the palette closes and the correct route opens.
- [ ] Restricted commands are absent for roles without access.
- [ ] Press Escape and click the backdrop; the palette closes without navigating.
- [ ] Run View Live Site and Logout; the first opens the configured frontend safely in a new tab and the second ends the session.

## Content and editorial workflow

### Announcements list (`/announcements`)

- [ ] The list loads real posts and handles loading, empty, and API-error states without throwing.
- [ ] Search, type, and status filters return the expected records; clearing filters restores the list.
- [ ] Pagination or result limits do not omit or duplicate records when filters change.
- [ ] Status totals, badges, readiness blockers, dates, and post links agree with the underlying records.
- [ ] Available row actions match the post status and signed-in role; repeated clicks are disabled while a request is pending.

### Create and edit post (`/announcements/new`, `/announcements/:id`)

- [ ] Open New Post from the sidebar and palette; the form renders with safe defaults.
- [ ] Required-field, URL, date, and content validation prevents an invalid save and identifies the relevant field.
- [ ] Create a disposable draft with representative rich text, links, taxonomy, source, and metadata; success feedback appears and the saved values survive reload.
- [ ] Open that post from the list, change fields, save, and confirm the persisted values after reload.
- [ ] Rich-text editing, link editing, keyboard input, and paste do not corrupt content or inject unexpected markup.
- [ ] Navigate away with unsaved changes and verify the product's intended warning or persistence behavior.
- [ ] API validation and server failures produce actionable feedback and do not clear entered content.

### Submit, approve, and publish

- [ ] As editor, submit a valid draft for review; it becomes `in_review` and the available actions update.
- [ ] Verify readiness blockers prevent submission/approval/publish where applicable and explain what must be fixed.
- [ ] As reviewer, approve the submitted post; it becomes `approved` and reviewer-only permissions do not allow publish.
- [ ] As admin or superadmin, publish the approved post; it becomes `published` and appears on the live site/API as expected.
- [ ] Verify list, edit form, workflow, calendar, audit log, dashboard, and SEO views reflect each transition after refresh.
- [ ] Attempt invalid or repeated transitions (including double-clicks); the API rejects them safely and the UI remains consistent.
- [ ] If archive, restore, or unpublish is exercised, confirm the same authorization, audit, and cross-page consistency guarantees.

### Calendar (`/calendar`)

- [ ] Scheduled and published items appear on the correct local date and time, including a timezone/day-boundary case.
- [ ] Month navigation, Today, and status/type filters update the displayed events correctly.
- [ ] Selecting an event opens the correct post or expected detail.
- [ ] Empty months and API failures render a stable, useful state.

### Workflow (`/workflow`)

- [ ] Review queues and counts agree with the announcements list for the same dataset.
- [ ] Filters/tabs separate draft, review, approved, published, stale, or blocked items correctly.
- [ ] An allowed approval succeeds once, refreshes the queue, and creates an audit entry.
- [ ] Readiness and publish blockers are visible, accurate, and prevent disallowed actions.
- [ ] Links open the correct post for review; loading, empty, and error states remain usable.

## Campaigns and subscribers

### Campaigns/notifications (`/notifications`)

- [ ] Campaign list, selection, status, target segment, timestamps, delivery totals, and stats load accurately.
- [ ] Loading, empty, unsupported-segment, partial-failure, and API-error states render without throwing.
- [ ] Changing the selected campaign does not show stale estimates or stats from the previous campaign.
- [ ] Polling or refresh updates a sending campaign without duplicate delivery actions or runaway requests.

### Create campaign

- [ ] Open the create dialog and verify required title/body, URL, segment, channel, and scheduling validation.
- [ ] Invalid/past schedule times and invalid URLs are rejected with field-level feedback.
- [ ] Save a draft targeted only at the disposable test audience; it appears once in the list with correct values.
- [ ] Schedule a disposable campaign for a future time; its status and timestamp are correct after reload.
- [ ] Canceling the dialog or a failed request does not create a campaign or lose unexpectedly retained form data.

### Estimate campaign

- [ ] Estimate the disposable draft; total, email, and push counts agree with the chosen test segment.
- [ ] Re-estimate after changing audience eligibility and confirm the result refreshes rather than accumulating.
- [ ] Unsupported segments cannot be estimated and explain the restriction.
- [ ] Estimate failure shows recoverable feedback and never enables delivery based on a stale estimate.

### Send campaign

- [ ] Select the disposable draft and initiate Send; a confirmation dialog identifies the campaign and latest recipient estimate.
- [ ] Canceling confirmation performs no delivery request.
- [ ] Confirm once; controls disable while pending, status becomes sending/sent as appropriate, and only the test audience receives one delivery per intended channel.
- [ ] Refresh and verify sent, delivered, failed, opened, and clicked values are internally consistent where supported.
- [ ] A second send attempt is unavailable or rejected safely and is represented in the audit trail.

### Retry failed campaign

- [ ] Use a disposable campaign with known failed deliveries; Retry Failed is available only when failures exist.
- [ ] Confirm retry queues only failed deliveries, not successful deliveries or the full audience.
- [ ] The control disables while pending and updated stats/status appear after refresh or polling.
- [ ] Repeating retry with no remaining failures is unavailable or safely rejected.

### Subscribers (`/subscribers`)

- [ ] Totals, coverage, channel/status breakdowns, and table records agree with the test dataset.
- [ ] Search, filters, and pagination work together without stale or duplicate results.
- [ ] Subscriber details and opt-in/verification state display accurately; loading, empty, and error states are stable.
- [ ] If testing deletion, cancel first, then delete only a disposable subscriber and confirm the irreversible warning, list refresh, and audit behavior.

## Insights, moderation, and operations

### Analytics (`/analytics`)

- [ ] Real analytics totals, trends, charts, top content, sources, and time ranges agree with the analytics source for a known interval.
- [ ] Changing date/range controls refreshes every dependent panel without mixing periods.
- [ ] Zero-data and API-error states remain distinct from valid zero values and do not fabricate metrics.
- [ ] Charts are legible in supported themes and at desktop/mobile widths; tooltips and links work.

### SEO issues (`/seo`)

- [ ] Metrics and issue queues load and agree with known test posts/issues.
- [ ] Search/filter/status controls select the expected issues and reset cleanly.
- [ ] Open an issue and follow its content link; context, severity, blockers, and recommended action are correct.
- [ ] Exercise the supported issue workflow and verify status, counts, post readiness, and audit data update consistently.
- [ ] API failure shows Retry; retrying after recovery replaces the error state without a page reload.

### Community moderation (`/community`)

- [ ] Pending comments, questions, active/reviewed/resolved reports, and their counts load from live test data.
- [ ] Approve a disposable comment after confirmation; it leaves the pending queue and becomes visible where expected.
- [ ] Reject a disposable comment after confirmation; it leaves the pending queue and is not publicly visible.
- [ ] Cancel both confirmation paths and verify no mutation occurs.
- [ ] Moderate/resolve a disposable report through the supported states and verify queue counts and audit history.
- [ ] Each panel has usable loading, empty, error, and Retry states; one failed request does not break unrelated panels.

### Users dangerous actions (`/users`)

- [ ] Search, role filter, status display, and pagination return the expected users.
- [ ] Attempt to change the signed-in account's role, status, or deletion state; self-protection blocks dangerous actions.
- [ ] In a complete superadmin result set, attempt to demote, deactivate, and delete the only active/only superadmin; safeguards block the operation.
- [ ] Promote and demote only a disposable account; the confirmation shows the old/new roles and requires an audit reason of at least three characters.
- [ ] Deactivate and reactivate a disposable account; confirm the warning, persisted state, login impact, and audit entry.
- [ ] Cancel each confirmation and verify no API mutation occurs.
- [ ] Delete only a disposable account; confirm the irreversible warning, required reason, list refresh, and audit entry.
- [ ] Simulate an API rejection or stale concurrent update; the UI reports failure and does not display an unpersisted state.

### Settings (`/settings`)

- [ ] Current general, SEO, contact, social, and supported settings load accurately.
- [ ] Save valid disposable changes, reload, and confirm they persist and affect the intended public behavior.
- [ ] Invalid values and API failures show actionable feedback without losing unrelated edits.
- [ ] Fields labeled unavailable remain disabled/read-only and are not included as successful saved changes.
- [ ] Restore every changed setting to its original value and verify the restoration.

### System admin (`/system-admin`)

- [ ] Health, service, queue, database, cache, or other available operational data loads and has a visible freshness timestamp/state.
- [ ] Links and safe operational controls work and produce feedback/audit records where expected.
- [ ] Unavailable or degraded dependencies show an explicit state without crashing or reporting healthy.
- [ ] Restricted/destructive controls are hidden or disabled for unauthorized roles and require confirmation when authorized.

### Audit log (`/audit-log`)

- [ ] Recent login, editorial, campaign, moderation, settings, and user-management test actions appear once with actor, action, target, reason, and timestamp.
- [ ] Ordering, filters, search, and pagination work and retain the intended timezone.
- [ ] Details do not expose secrets, tokens, passwords, or unnecessary personal data.
- [ ] Empty and API-error states render without throwing.

### Error reports (`/error-reports`)

- [ ] Error/user reports load with accurate status, severity/category, reporter, target, and timestamps.
- [ ] Search/filter/pagination and detail links select the expected reports.
- [ ] Exercise supported assignment/status/resolution actions on a disposable report; counts, list state, and audit history update.
- [ ] Duplicate clicks and API failures do not apply a transition twice or leave an optimistic false state.
- [ ] Loading, empty, and error states are usable and report content is rendered safely.

## Role access matrix

Validate both navigation visibility and direct URL/API access. A hidden sidebar link alone is not authorization. For every denied action, confirm the UI shows an access-denied/login state as appropriate and the API returns `401`/`403` without disclosing protected data.

| Capability | Editor | Reviewer | Admin | Superadmin |
| --- | --- | --- | --- | --- |
| Sign in, dashboard, calendar, workflow | [ ] allowed | [ ] allowed | [ ] allowed | [ ] allowed |
| View/create/edit drafts and submit for review | [ ] allowed | [ ] verify policy | [ ] allowed | [ ] allowed |
| Approve `in_review` content | [ ] denied | [ ] allowed | [ ] allowed | [ ] allowed |
| Publish/archive/restore content | [ ] denied | [ ] denied | [ ] allowed | [ ] allowed |
| Community moderation | [ ] verify policy | [ ] verify policy | [ ] allowed | [ ] allowed |
| Subscribers and campaigns | [ ] denied | [ ] denied | [ ] allowed | [ ] allowed |
| Analytics and SEO | [ ] denied | [ ] denied | [ ] allowed | [ ] allowed |
| Error reports | [ ] denied | [ ] denied | [ ] allowed | [ ] allowed |
| Users, audit log, system admin, settings | [ ] denied | [ ] denied | [ ] allowed | [ ] allowed |
| Superadmin-only destructive/account safeguards | [ ] denied | [ ] denied | [ ] verify policy | [ ] allowed |

- [ ] Test every restricted page by pasting its URL, not only by clicking navigation.
- [ ] Test restricted mutation endpoints using the UI session; a crafted request cannot bypass the role policy.
- [ ] Changing a test account's role takes effect on refresh/new requests and does not retain stale commands or protected data.
- [ ] An unauthenticated, expired, or deactivated session cannot read or mutate protected resources.

## Route smoke pass

With an authenticated admin session and the backend available, open each route directly and refresh it. Pass when the route renders its intended shell and loading/content/error state, produces no uncaught browser exception or hydration error, and does not enter a redirect or request loop. An intentional handled API error is not a route-render failure, but record it separately.

| Route | Initial navigation | Hard refresh | No uncaught exception | Result/notes |
| --- | --- | --- | --- | --- |
| `/` | [ ] | [ ] | [ ] | |
| `/announcements` | [ ] | [ ] | [ ] | |
| `/announcements/new` | [ ] | [ ] | [ ] | |
| `/workflow` | [ ] | [ ] | [ ] | |
| `/calendar` | [ ] | [ ] | [ ] | |
| `/notifications` | [ ] | [ ] | [ ] | |
| `/subscribers` | [ ] | [ ] | [ ] | |
| `/analytics` | [ ] | [ ] | [ ] | |
| `/seo` | [ ] | [ ] | [ ] | |
| `/community` | [ ] | [ ] | [ ] | |
| `/users` | [ ] | [ ] | [ ] | |
| `/audit-log` | [ ] | [ ] | [ ] | |
| `/error-reports` | [ ] | [ ] | [ ] | |
| `/system-admin` | [ ] | [ ] | [ ] | |
| `/settings` | [ ] | [ ] | [ ] | |

## Automated route smoke-test TODO

The `admin-next` package currently has no frontend test framework, test script, browser harness, or API-mocking utilities. Do not add an isolated test file that cannot run, and do not fake API responses solely for this smoke suite.

- [ ] Add Playwright as the admin app's browser test framework and add documented `test:smoke` and CI commands.
- [ ] Start a production build with Playwright's `webServer`, or target a dedicated QA deployment.
- [ ] Authenticate through a dedicated non-production admin account or a backend-supported saved session; keep credentials in environment/CI secrets.
- [ ] Parameterize the 15 routes in the table above and assert that each page reaches its intended authenticated shell without `pageerror`, hydration errors, redirect loops, or HTTP 5xx document responses.
- [ ] Use the real QA API and seeded disposable records. Add API interception only if the repository later adopts shared, contract-aligned mock utilities.
- [ ] Run the suite with at least admin access; add editor, reviewer, and superadmin authorization cases separately.
- [ ] Capture trace/screenshot artifacts on failure and run the smoke project in Main CI before deployment.

## Release validation

From `admin-next`:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

From the repository root:

```powershell
git diff --check
```

- [ ] TypeScript passes.
- [ ] ESLint passes.
- [ ] Admin production build passes.
- [ ] `git diff --check` passes.
- [ ] All blocking QA issues are fixed or explicitly accepted by the release owner.
