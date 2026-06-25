# Admin Audit Events

Admin audit events are written by backend code and are the production trace for high-risk Admin Console operations. Frontend guards and confirmations improve UX, but backend authorization and backend audit logging remain the source of truth.

## Event Shape

Audit log entries include:

| Field | Source |
| --- | --- |
| `actorId` | Authenticated admin user id from the verified token |
| `actorRole` | Authenticated admin role from the verified token |
| `actorEmail` | Stored in metadata when available |
| `action` | Stable event name listed below |
| `entityType` | Target domain such as `post`, `workflow`, `auth`, `campaign`, `community`, or `settings` |
| `entityId` | Target record id, or `site-settings` for global settings |
| `summary` | Short human-readable action summary |
| `metadata` | Non-sensitive context such as target type, target id, changed fields, status, and audit reason |
| `createdAt` | Server timestamp assigned by the audit log model |

Never log passwords, password reset tokens, auth tokens, cookies, CSRF values, API keys, push subscription secrets, or raw campaign message bodies. Settings audit events store changed field names, not values.

## Audited Actions

| Admin action | Event action | Entity type | Target | Reason/note |
| --- | --- | --- | --- | --- |
| Create post or announcement | `create` / legacy create note | `post` | Post id | Version note when provided |
| Update post or announcement | `update` / admin note | `post` | Post id | Version note when provided |
| SEO metadata update | `update` with SEO version note | `post` | Post id | SEO dashboard sends a version note |
| Submit post for review | `submit` | `workflow` | Post id | Optional workflow note |
| Approve post | `approve` | `workflow` | Post id | Optional workflow note |
| Publish post | `publish` | `workflow` | Post id | Optional workflow note |
| Unpublish post | `unpublish` | `workflow` | Post id | Optional workflow note |
| Archive post | `archive` or `Archived via admin endpoint` | `workflow` / `post` | Post id | Optional workflow note |
| Restore post | `restore` | `workflow` | Post id | Optional workflow note |
| Bulk workflow action | Requested workflow action | `workflow` | Each post id | Optional bulk note |
| Freshness sweep archive | `archive` | `workflow` | Each stale post id | Sweep note |
| User role change | `admin_user_role_changed` | `auth` | User id | Admin UI requires audit reason |
| User activation/deactivation | `admin_user_status_changed` | `auth` | User id | Admin UI requires audit reason |
| User deletion | `admin_user_deleted` | `auth` | User id | Admin UI requires audit reason |
| Campaign draft/schedule create | `admin_campaign_created` | `campaign` | Campaign id | No message body logged |
| Campaign send queued | `admin_campaign_send_queued` | `campaign` | Campaign id | Admin UI requires audit reason |
| Campaign failed-delivery retry queued | `admin_campaign_retry_queued` | `campaign` | Campaign id | Admin UI requires audit reason |
| Comment approved | `admin_comment_approved` | `community` | Comment id | Optional reason |
| Comment rejected | `admin_comment_rejected` | `community` | Comment id | Admin UI requires audit reason |
| Community Q&A answered | `admin_community_qa_answered` | `community` | Question id | Logs answer length, not answer text |
| Community Q&A deleted | `admin_community_qa_deleted` | `community` | Question id | No body logged |
| Community flag reviewed | `admin_community_flag_reviewed` | `community` | Flag id | Status in metadata |
| Community flag resolved | `admin_community_flag_resolved` | `community` | Flag id | Status in metadata |
| Community forum deleted | `admin_community_forum_deleted` | `community` | Forum id | No body logged |
| Site settings update | `admin_settings_updated` | `settings` | `site-settings` | Changed field names only |

## Frontend Reason Capture

The Admin Console sends audit reasons for:

- user role changes
- user activation/deactivation
- user deletion
- comment rejection
- campaign send
- campaign failed-delivery retry

Draft campaign creation and post draft edits do not require a reason in the UI, but backend post version notes are still recorded when supplied by the editor workflow.
