# Admin Role Access Matrix

The Admin Console is served with the `admin-next` base path, so app routes such as `/users` are reached in the browser as `/admin/users`.

Frontend guards are UX controls only. Backend route authorization and audit controls remain the source of truth and must not be weakened to match this matrix.

## Role groups

- `ADMINISTRATOR_ROLES`: `superadmin`, `admin`
- `EDITORIAL_ROLES`: `superadmin`, `admin`, `editor`, `reviewer`
- `CONTENT_WRITE_ROLES`: `superadmin`, `admin`, `editor`
- `REVIEW_WORKFLOW_ROLES`: `superadmin`, `admin`, `reviewer`
- `MODERATION_ROLES`: `superadmin`, `admin`, `reviewer`
- `user` and anonymous visitors are not allowed into protected admin pages.

## Matrix

| Route | Purpose | Allowed roles | Current guard used | Needs change? | Notes |
| --- | --- | --- | --- | --- | --- |
| `/login` | Admin sign-in and password recovery entry | Anonymous, unauthenticated users | None; renders `LoginPage` | No | Non-staff accounts are rejected by auth state and backend auth. |
| `/` | Admin dashboard / command center | `superadmin`, `admin`, `editor`, `reviewer` | `AdminPageShell` with `EDITORIAL_ROLES` | No | Dashboard may show unavailable cards when backend denies role-specific data. |
| `/announcements` | List and manage posts | `superadmin`, `admin`, `editor`, `reviewer` | `AdminPageShell` with `EDITORIAL_ROLES` | No | Per-action publish/approve controls remain role-gated and backend-enforced. |
| `/announcements/new` | Create a new post | `superadmin`, `admin`, `editor` | `AdminPageShell` with `CONTENT_WRITE_ROLES` | No | Reviewers can review existing posts but should not see create-post entry points. |
| `/announcements/[id]` | View/edit a post and workflow actions | `superadmin`, `admin`, `editor`, `reviewer` | `AdminPageShell` with `EDITORIAL_ROLES` | No | Mutation permissions are still enforced by visible controls and backend checks. |
| `/workflow` | Editorial review queues, approval, freshness sweeps | `superadmin`, `admin`, `reviewer` | `AdminPageShell` with `REVIEW_WORKFLOW_ROLES` | No | Editors are excluded because this page exposes review/approval workflow actions. |
| `/calendar` | Editorial calendar and deadlines | `superadmin`, `admin`, `editor`, `reviewer` | `AdminPageShell` with `EDITORIAL_ROLES` | No | Read-oriented editorial planning page. |
| `/data-quality` | Editorial data quality queues and issue sweeps | `superadmin`, `admin`, `editor`, `reviewer` | `AdminPageShell` with `EDITORIAL_ROLES` | No | Read/workflow-oriented editorial quality page. |
| `/community` | Community moderation | `superadmin`, `admin`, `reviewer` | `AdminPageShell` with `MODERATION_ROLES` | No | Moderation role is reviewer-or-higher for frontend UX. |
| `/engagement` | Engagement metrics and moderation signals | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Treated as sensitive audience/operations data. |
| `/error-reports` | User error reports and report resolution | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Sensitive user report data. |
| `/analytics` | Traffic, search, and funnel analytics | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Sensitive operational analytics. |
| `/seo` | SEO inventory, issue fixing, metadata tools | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Sensitive operational and AI-assisted metadata tools. |
| `/subscribers` | Email/push subscriber administration | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Contains subscriber data and destructive actions. |
| `/notifications` | Campaign and notification management | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Can create/send campaigns, so restricted to administrators. |
| `/users` | User administration and role/status actions | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Sensitive identity and role management. |
| `/audit-log` | Audit activity inspection | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Sensitive operational audit data. |
| `/system-admin` | Health, security, backups, performance | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Sensitive platform operations surface. |
| `/settings` | Site settings and feature flags | `superadmin`, `admin` | `AdminPageShell` with `ADMINISTRATOR_ROLES` | No | Configuration changes are administrator-only. |
| `/taxonomies` | Taxonomy management | `superadmin`, `admin`, `editor` | `AdminPageShell` with `CONTENT_WRITE_ROLES` | No | Content-writing role can manage taxonomy metadata; reviewers are excluded. |

Unauthorized authenticated staff see the shared `AdminGuard` access-denied message instead of an empty render:

> Access denied. Your role does not have access to this admin page.
