# Admin Audit Events

Admin audit entries are the production trace for high-risk Admin Console actions. Frontend confirmations are useful, but an action is listed as implemented here only when backend code clearly writes to `AuditLogModelPostgres` or the editorial `auditLog` table path.

Do not log passwords, password reset tokens, JWTs, cookies, CSRF tokens, API keys, VAPID keys, push subscription secrets, or raw campaign bodies. Where the current code logs settings or campaign context, it records field names and coarse metadata rather than secret values.

## Shared Event Shape

`backend/src/routes/admin.ts` uses `recordAdminAudit(req, entry)` for many admin routes. That helper writes:

| Field | Source |
| --- | --- |
| `actorId` | `req.user?.userId` |
| `actorRole` | `req.user?.role` |
| `actorEmail` | `req.user?.email` inside `metadata` |
| `entityType` | Route-specific domain such as `auth`, `campaign`, `community`, or `settings` |
| `entityId` | Target record id, or `site-settings` |
| `action` | Stable route-specific action name |
| `summary` | Route-specific human-readable summary |
| `metadata.targetType` | Route-specific target type |
| `metadata.targetId` | Same value as `entityId` |
| `metadata.auditReason` | Optional reason supplied by supported frontend actions |

Editorial post actions use `backend/src/models/posts.postgres.ts`. They write `actorId`, `actorRole`, `entityType`, `entityId`, `postId`, `action`, `summary`, and metadata such as workflow status changes or version notes.

## Audit Matrix

| High-risk action | Frontend entry point | Backend route/helper | Actor fields | Target fields | Metadata | Audit reason support | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login | `admin-next/app/login/login-page.tsx` | `POST /auth/login` in `backend/src/routes/auth.ts` | Would be authenticated user id/role/email after successful login | User id/email | Should include request IP/user agent if added | Not applicable | TODO: no main audit entry is written for successful login. Failed attempts are tracked by brute-force/security middleware, not the admin audit log. |
| Logout | Admin layout logout action through auth context | `POST /auth/logout` in `backend/src/routes/auth.ts` | Would be authenticated user id/role/email from token/session | User id | Should include request IP/user agent if added | Not applicable | TODO: route blacklists token and clears cookies, but no audit entry is written. |
| Create post | `admin-next/app/announcements/announcement-form.tsx` for `/announcements/new` | `POST /editorial/posts` -> `postModel.create()` -> `persistPost()` | `actorId`, `actorRole` from `req.user` | `entityType=post`, `entityId=postId`, `postId` | `status`, optional `note` from `versionNote` | Optional `versionNote`; not required as an audit reason | Implemented as `action=create`. |
| Update post | `admin-next/app/announcements/announcement-form.tsx` for `/announcements/[id]` | `PUT /editorial/posts/:id` -> `postModel.update()` -> `persistPost()` | `actorId`, `actorRole` from `req.user` | `entityType=post`, `entityId=postId`, `postId` | `status`, optional `note` from `versionNote` | Optional `versionNote`; not required as an audit reason | Implemented as `action=update`. |
| Submit post for review | Announcement form, announcements list, workflow surfaces | `POST /editorial/posts/:id/submit` -> `postModel.transition(..., 'submit')` | `actorId`, `actorRole` from `req.user` | `entityType=workflow`, `entityId=postId`, `postId` | `from`, `to`, optional `note` | Optional workflow note | Implemented as `action=submit`. |
| Approve post | Announcement form/list and `admin-next/app/workflow/workflow-page.tsx` | `POST /editorial/posts/:id/approve` -> `postModel.transition(..., 'approve')` | `actorId`, `actorRole` from `req.user` | `entityType=workflow`, `entityId=postId`, `postId` | `from`, `to`, optional `note` | Optional workflow note | Implemented as `action=approve`. |
| Publish post | Announcement form/list | `POST /editorial/posts/:id/publish` -> `postModel.transition(..., 'publish')` | `actorId`, `actorRole` from `req.user` | `entityType=workflow`, `entityId=postId`, `postId` | `from`, `to`, optional `note` | Optional workflow note | Implemented as `action=publish`. |
| Archive post | Announcement form/list and freshness sweep from workflow | `POST /editorial/posts/:id/archive` or freshness sweep helper -> `postModel.transition(..., 'archive')` | `actorId`, `actorRole` from `req.user` or sweep caller | `entityType=workflow`, `entityId=postId`, `postId` | `from`, `to`, optional `note` | Optional workflow note; freshness sweep sends a fixed note | Implemented as `action=archive`. |
| Campaign create | `admin-next/app/notifications/notifications-page.tsx` draft/schedule form | `POST /admin/campaigns` -> `createCampaign()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=campaign`, `entityId=campaignId`, `targetType=notification_campaign` | `titleLength`, `segmentType`, `channel`, `scheduledAt` | No explicit audit reason field for creation | Implemented as `action=admin_campaign_created`. |
| Campaign send | `admin-next/app/notifications/notifications-page.tsx` send confirmation dialog | `POST /admin/campaigns/:id/send` -> `queueCampaignDelivery()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=campaign`, `entityId=campaignId`, `targetType=notification_campaign` | `mode`, `status` | Supported; frontend requires at least 3 characters and appends recipient-estimate context | Implemented as `action=admin_campaign_send_queued`. |
| Campaign retry failed deliveries | `admin-next/app/notifications/notifications-page.tsx` retry prompt | `POST /admin/campaigns/:id/retry-failed` -> `queueFailedCampaignRetry()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=campaign`, `entityId=campaignId`, `targetType=notification_campaign` | `mode`, `status` | Supported; frontend prompts for a reason | Implemented as `action=admin_campaign_retry_queued`. |
| User role change | `admin-next/app/users/users-page.tsx` role action dialog | `PATCH /admin/users/:id` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=auth`, `entityId=userId`, `targetType=user` | `targetEmail`, `changedFields`, `newRole` | Supported; frontend requires at least 3 characters | Implemented as `action=admin_user_role_changed`. |
| User status change | `admin-next/app/users/users-page.tsx` activate/deactivate action dialog | `PATCH /admin/users/:id` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=auth`, `entityId=userId`, `targetType=user` | `targetEmail`, `changedFields`, `newIsActive` | Supported; frontend requires at least 3 characters | Implemented as `action=admin_user_status_changed`. |
| User delete | `admin-next/app/users/users-page.tsx` delete action dialog | `DELETE /admin/users/:id` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=auth`, `entityId=userId`, `targetType=user` | `targetEmail` | Supported; frontend requires at least 3 characters | Implemented as `action=admin_user_deleted`. |
| Comment approve | `admin-next/app/community/community-page.tsx` and `admin-next/app/engagement/engagement-page.tsx` | `POST /admin/moderate-comment/:id` -> `moderateComment()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=community`, `entityId=commentId`, `targetType=comment` | `moderationAction=approve` | Optional; current frontend does not require a reason for approve | Implemented as `action=admin_comment_approved`. |
| Comment reject | Community and engagement moderation reject dialogs | `POST /admin/moderate-comment/:id` -> `moderateComment()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=community`, `entityId=commentId`, `targetType=comment` | `moderationAction=reject` | Supported; current frontend requires at least 3 characters for reject | Implemented as `action=admin_comment_rejected`. |
| Q&A answer | `admin-next/app/community/community-page.tsx` Q&A answer action | `PATCH /admin/community/qa/:id` -> `CommunityModelPostgres.answerQa()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=community`, `entityId=questionId`, `targetType=community_question` | `answerLength`; answer body is not logged | No separate audit reason | Implemented as `action=admin_community_qa_answered`. |
| Report/flag reviewed | `admin-next/app/community/community-page.tsx` flag review action | `PATCH /admin/community/flags/:id` -> `CommunityModelPostgres.updateFlagStatus()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=community`, `entityId=flagId`, `targetType=community_flag` | `status=reviewed` | No separate audit reason | Implemented as `action=admin_community_flag_reviewed`. |
| Report/flag resolved | `admin-next/app/community/community-page.tsx` flag resolve action | `PATCH /admin/community/flags/:id` -> `CommunityModelPostgres.updateFlagStatus()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=community`, `entityId=flagId`, `targetType=community_flag` | `status=resolved` | No separate audit reason | Implemented as `action=admin_community_flag_resolved`. |
| Settings updates | `admin-next/app/settings/settings-page.tsx` | `PATCH /admin/settings` -> `SiteSettingsModelPostgres.updateMain()` plus `recordAdminAudit()` | `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | `entityType=settings`, `entityId=site-settings`, `targetType=site_settings` | `changedFields` only | No separate audit reason | Implemented as `action=admin_settings_updated`. |
| SEO metadata updates | `admin-next/app/seo/seo-page.tsx` save metadata dialog | `PUT /editorial/posts/:id` -> `postModel.update()` -> `persistPost()` | `actorId`, `actorRole` from `req.user` | `entityType=post`, `entityId=postId`, `postId` | `status`, `note=SEO metadata updated from SEO dashboard` | Uses `versionNote`; no separate audit reason | Implemented as generic post `action=update`, not a distinct SEO action. |
| Error report triage | `admin-next/app/error-reports/error-reports-page.tsx` triage button/detail dialog | `PATCH /admin/error-reports/:id` -> `ErrorReportModelPostgres.update()` | Would be `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | Error report id, status `triaged` | Should include changed status and whether `reviewNote` was supplied | No audit reason support currently | TODO: backend updates the report but does not call `recordAdminAudit()`. |
| Error report resolution | `admin-next/app/error-reports/error-reports-page.tsx` resolve button/detail dialog | `PATCH /admin/error-reports/:id` -> `ErrorReportModelPostgres.update()` | Would be `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | Error report id, status `resolved` | Should include changed status and whether `reviewNote` was supplied | No audit reason support currently | TODO: backend updates the report but does not call `recordAdminAudit()`. |
| Subscriber delete | `admin-next/app/subscribers/subscribers-page.tsx` delete action | `DELETE /admin/subscribers/:id` or `DELETE /editorial/alert-subscriptions/:id` | Would be `actorId`, `actorRole`, `metadata.actorEmail` from `req.user` | Subscriber or alert subscription id | Should include subscription type only; do not log endpoint keys or secret material | No audit reason support currently | TODO: both delete routes remove the subscriber but do not write an audit entry. |

## Additional Implemented Audit Events

These are not in the minimum launch checklist above, but the backend currently also writes audit entries for:

- Community forum delete: `admin_community_forum_deleted`.
- Community Q&A delete: `admin_community_qa_deleted`.
- Password recovery request/completion: `password_recovery_requested` and `password_recovery_completed` in `backend/src/routes/auth.ts`.

Taxonomy create/update/delete routes currently mutate data without audit entries. They are not listed in the requested high-risk set, but they should be reviewed before treating taxonomy management as production-critical.
