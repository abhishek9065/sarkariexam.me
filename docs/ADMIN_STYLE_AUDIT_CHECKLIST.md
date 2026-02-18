# Admin vNext Style Audit Checklist

Use this checklist in every admin-vNext PR review.

## UI Drift Guardrails
- No `window.prompt(` usage in `admin-frontend/src`.
- No inline `style={` usage in `admin-frontend/src/routes` and `admin-frontend/src/modules`.
- Risky actions use modal-confirm flows, not browser prompts.

## Shared Primitive Consistency
- Announcements uses `TableToolbar` and `ActionOverflowMenu`.
- Review uses `OpsToolbar`, `OpsTable`, and confirm dialog flow.
- Bulk uses preview modal + confirm flow before execute.
- Approvals uses modal decision flow (approve/reject), no prompt fallback.

## Control Size Contract
- Comfortable mode action controls are `>= 44px`.
- Compact mode action controls are `>= 40px`.
- No cramped action rows or undersized click targets.

## Desktop-Only Policy
- `/admin` shows full desktop shell at `>= 1120px`.
- `/admin` blocks interactive admin shell below `1120px`.
- `/admin-legacy` remains available as rollback.

## Accessibility Spot Checks
- Keyboard route navigation works without mouse.
- Command palette opens/closes via keyboard and Escape.
- Modal dialogs support Escape and keep focus within actionable controls.
