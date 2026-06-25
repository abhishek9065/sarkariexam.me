# Admin Console Production Readiness

This document is the release readiness reference for the Admin Console. It summarizes the current production surface, the workflows that must be verified before launch, known limitations, and rollback steps. It does not contain secrets or environment-specific credential values.

## Current Admin Modules

- Dashboard command center: operational queues, summary metrics, and links into editorial, campaign, community, SEO, error, and health workflows.
- CMS/content: create, edit, submit, approve, publish, archive, and inspect content records.
- Workflow: review queues, approvals, freshness/SLA views, and editorial action routing.
- Calendar: scheduled and deadline-oriented content planning.
- Taxonomies and data quality: taxonomy maintenance plus editorial quality queues for stale, trust, search-readiness, SEO, and alert-impact issues.
- Campaigns / Notifications: campaign drafts, scheduling, recipient estimates, send, delivery status, and failed-delivery retry.
- Subscribers: email and push subscriber counts, filters, and subscriber administration.
- Analytics: recorded views, listing views, searches, card clicks, top content, top searches, geographic activity, and live activity estimate.
- Engagement: feedback, pending comment moderation, and engagement metrics.
- SEO: SEO metrics, issue inventory, filters, and issue-fix workflow entry points.
- Community moderation: pending comments, Q&A answers, active/reviewed/resolved reports.
- Users: user search, role changes, activation/deactivation, deletion safeguards, and audit-reason collection.
- Audit log: administrative activity review across editorial, campaign, moderation, settings, and user-management actions.
- Error reports: user/client error report triage and resolution workflow.
- System admin: health, service, security, backup, performance, and rate-limit operational views.
- Settings: site, SEO, contact, social, maintenance, registration, and feature flag settings where supported by the backend.

## Critical Workflows

Verify these workflows with disposable records in a non-production or controlled production-readiness environment before launch:

- Create/publish post: create a draft, validate required fields, save, reload, submit for review, approve with an authorized role, publish with an admin/superadmin role, then verify public visibility and audit/history entries.
- Review/approve post: open workflow queues, inspect readiness blockers, approve a valid `in_review` post once, confirm disallowed repeated or out-of-order transitions are rejected safely, and verify dashboard/calendar/workflow counts refresh.
- Create/send campaign: create a draft campaign for a safe test audience, estimate recipients, require audit reason before send, queue delivery once, verify delivery stats/polling, and verify retry only targets failed deliveries.
- Moderate comment/Q&A/report: approve and reject disposable comments, answer or edit Q&A, move reports through reviewed/resolved states, and verify queue counts plus audit entries.
- Update user roles: promote/demote only disposable accounts, require an audit reason, block self-actions, preserve at least one active privileged account, and verify role changes take effect after refresh/new requests.
- Fix SEO issue: load metrics and issue queues, filter to a known issue, open the related content, apply the supported fix, and verify SEO counts/readiness/audit state update.
- Check system health: open System Admin, verify health/service/performance/security/backup panels show current data or explicit degraded/unavailable states, and confirm protected deep-health checks use the expected operational token outside the UI.

## Manual QA Checklist Summary

Use `docs/admin-console-qa-checklist.md` as the detailed runbook. A production launch pass should include:

- Authentication and shell checks: login/logout, session refresh, protected-route handling, sidebar, mobile navigation, and command palette.
- Route smoke pass: open and hard-refresh dashboard, announcements, new post, workflow, calendar, notifications, subscribers, analytics, SEO, community, users, audit log, error reports, system admin, and settings.
- Content workflow checks: list filters, create/edit validation, submit, approve, publish, archive/restore where applicable, and cross-page consistency.
- Campaign checks: create, schedule, estimate, send, retry failures, and subscriber views with safe test recipients only.
- Moderation and operations checks: analytics, SEO, community moderation, user dangerous actions, settings, system admin, audit log, and error reports.
- Failure-state checks: loading, empty, partial API failure, retry, duplicate-click prevention, and no uncaught browser exceptions or hydration errors.
- Release validation: TypeScript/build, ESLint, CI checks, `git diff --check`, and any accepted release-owner exceptions documented before launch.

## Role Access Matrix Summary

The current detailed matrix is in `docs/admin-role-access-matrix.md`. Frontend guards are UX controls; backend authorization and audit logging remain the source of truth.

- Anonymous users: allowed only on `/admin/login`; protected routes must redirect or show the login state without exposing protected data.
- `editor`: dashboard, calendar, announcements list/detail, create post, edit/write content, and submit for review. Editor access does not include publish, campaigns, subscribers, analytics, SEO, users, audit log, system admin, settings, or error reports.
- `reviewer`: dashboard, calendar, announcements list/detail, workflow/review queues, approval workflow, and community moderation. Reviewers should not see create-post entry points and do not publish content.
- `admin`: administrator access to operational modules including campaigns, subscribers, analytics, SEO, community moderation, users, audit log, error reports, system admin, and settings. Backend safeguards still protect self-actions and last-privileged-account cases.
- `superadmin`: same broad access as admin, with the strongest account-safety expectations. At least one active superadmin must remain.
- `user` and unauthenticated visitors: no protected Admin Console access.

For every restricted page, verify both hidden navigation and direct URL/API denial. A hidden link alone is not authorization.

## Known Limitations

- Device analytics: the Analytics page currently renders Device Breakdown as unavailable. Do not treat missing mobile/desktop/tablet data as a launch blocker unless device analytics is a release requirement.
- Moderation reject reason: comment rejection sends an `auditReason` and the backend records it in the admin audit entry. The comment moderation backend currently persists the comment status change, not a separate rejection-reason field on the comment record.
- Playwright auth: current Admin Console Playwright coverage uses deterministic browser API mocks and does not require real credentials or production cookies. Real authentication coverage still needs a disposable non-production environment and `storageState` setup if required by a release.
- Docker Compose validation: CI validates Compose rendering on GitHub runners. Local Compose validation is unavailable on machines without Docker Engine and the Compose plugin.
- Deployment health: the campaign worker has no Docker healthcheck; deploy validation checks that the container remains running with zero restarts during the bounded verification window.

## Production Launch Checklist

- [ ] Environment variables are configured in the production `.env` and GitHub environment without exposing secrets in Git.
- [ ] Required backend values are present: `JWT_SECRET`, `POSTGRES_PRISMA_URL` or `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Legacy Mongo/Cosmos values are configured only if `LEGACY_MONGO_REQUIRED=true`.
- [ ] Admin credentials exist for at least two privileged accounts, including at least one active `superadmin`.
- [ ] SendGrid is configured if email delivery or campaign email sends are enabled.
- [ ] VAPID public/private keys are configured if browser push subscription or push campaign delivery is enabled.
- [ ] PostgreSQL migrations have been applied by the deploy flow before replacing backend services.
- [ ] `campaign-worker` is running from the backend image and `CAMPAIGN_WORKER_ENABLED=false` remains set on the API container in production Compose.
- [ ] Monitoring/logging is enabled for backend, frontend, admin, nginx, and campaign worker containers.
- [ ] Database backups are configured and a restore path has been tested or documented.
- [ ] `PR CI` and `Main CI` are green for the target commit, including backend tests, frontend build, admin build, ESLint, audit checks, admin Playwright smoke tests, Docker image builds, and `git diff --check`.
- [ ] Production deploy gate ran from successful `Main CI` on `main`.
- [ ] Post-deploy smoke tests pass for `/`, `/jobs`, `/results`, `/admin`, `/api/health`, and the Admin Console route smoke list.
- [ ] Campaign send is tested only with a safe test audience before enabling broad production sends.
- [ ] Audit log contains the expected test administrative events and does not expose secrets.

## Rollback Checklist

- [ ] Pause broad campaign operations first. If delivery risk is active, disable the campaign worker by scaling/stopping the `campaign-worker` service or deploying with worker delivery disabled until the incident is understood.
- [ ] Disable the admin route at the reverse proxy or access-control layer if the Admin Console itself is unsafe to expose.
- [ ] Restore the previous known-good image tag for affected services. The normal production path uses GHCR images tagged by commit SHA.
- [ ] Verify whether any PostgreSQL migrations from the failed release are backward-compatible before rolling services back. Do not assume schema rollback is safe.
- [ ] Check audit logs for user, campaign, moderation, settings, and content actions performed during the incident window.
- [ ] Check backend, admin, nginx, and campaign-worker logs for errors and restarts.
- [ ] Re-run health checks and Admin Console route smoke tests after rollback.
- [ ] Confirm campaign-worker state after rollback: disabled if investigating delivery risk, or running with zero restarts if delivery is intentionally restored.
- [ ] Document the rollback commit/image tag, database migration state, and any manual data repair actions.

## References

- `docs/admin-console-qa-checklist.md`
- `docs/admin-role-access-matrix.md`
- `docs/admin-e2e-tests.md`
- `docs/ci-admin-console-gates.md`
- `docs/deployment-notes.md`
