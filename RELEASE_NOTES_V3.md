# SarkariExams Admin UI V3 Release Notes

Date: 2026-02-02

## Highlights
- New Admin V3 layout with collapsible sidebar, hero metrics, and responsive navigation.
- Improved list management with filter summaries, bulk actions, and clearer sorting cues.
- Enhanced forms with date/time pickers, touched-field validation, and numeric constraints.
- Analytics upgrades: weekly trend view, content mix donut, KPI deltas, and popular announcements.
- Accessibility improvements: aria labels, live regions, and clearer focus/feedback states.
- Security center upgrades: active session manager, backup code recovery, and session health indicators.
- Performance improvements with lazy-loaded admin modules and lighter initial payload.

## UI / UX Updates
- Unified operations hub layout and workspace context header.
- Reduced navigation redundancy (context actions hide when active).
- Empty states include actionable CTAs to clear filters.
- QA panel styling improved with clear severity tones.
- Light/dark theme toggle and time zone selector surfaced in sidebar settings.
- Skip-to-content link, aria-current nav markers, and dialog roles added for keyboard users.

## Forms
- Date picker for deadlines and datetime picker for scheduled publish time.
- Inline validation that respects touched fields and submit attempts.
- Numeric input constraints for totals and salary ranges.

## Analytics
- Weekly trend chart and trend table with optional zero-day visibility.
- Content mix donut and category chips.
- Popular announcements table with actions.
- KPI deltas for weekly views and searches.
- Export preview panel with latest rollup snapshot and freshness indicator.

## Security
- Backup code generation flow for admin 2FA recovery.
- Active session dashboard with risk labels and one-click termination.
- Session banner highlights current device, IP, and last activity.

## Accessibility
- ARIA labels for icon-only table actions and bulk selection.
- Toast stack uses live regions for status updates.

## Testing
- Playwright admin smoke spec added (conditional on admin test env vars).

## Notes for Deployment
- Frontend build: `npm run build` in `frontend/`.
- Backend environment: set `ADMIN_BACKUP_CODE_SALT` for backup-code hashing.
