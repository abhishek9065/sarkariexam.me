# Admin Workflow

## Roles
- `editor`
  - create and edit drafts
  - manage structured content fields
  - submit content for review
  - cannot publish
- `reviewer`
  - review submitted content
  - approve or reject with notes
  - cannot change publish state directly
- `admin`
  - publish approved content
  - unpublish, archive, restore
  - manage users, settings, and operational surfaces
- `superadmin`
  - full administrative access including emergency overrides

## Status Flow
- `draft`
  - editable by editor, admin, superadmin
- `in_review`
  - locked for ordinary editing until returned or approved
- `approved`
  - ready for publish by admin or superadmin
- `published`
  - visible to public APIs and SEO surfaces
- `archived`
  - removed from active feeds and available in archive/expired views

## Transition Rules
- `draft -> in_review`
  - requires minimum title, slug, type, summary, and basic taxonomy selection
- `in_review -> approved`
  - reviewer must provide an approval note or an explicit clean pass action
- `in_review -> draft`
  - reviewer rejects with reason
- `approved -> published`
  - admin or superadmin only
  - publish timestamp recorded
  - revalidation targets emitted
- `published -> archived`
  - admin or superadmin only
  - archive reason recorded
- `archived -> draft`
  - admin or superadmin only
  - restore reason recorded

## Validation Gates
- Primary content types must include:
  - title
  - slug
  - type
  - summary
  - at least one category
  - organization or institution, depending on content type
  - at least one official source
- Jobs should include eligibility and important dates where available
- Results and admit cards should include source and update timestamps
- Admissions should include institution and at least one admission program or eligibility block
- SEO fields are optional but strongly recommended; defaults are auto-derived if absent

## Versioning
- Save draft creates a version snapshot only when content changed meaningfully
- Submit, approve, publish, unpublish, archive, and restore create explicit version and audit records
- Editors can view version notes and transition history from the CMS

## Audit Expectations
- Record actor, role, target entity, action, summary, and timestamp
- Bulk operations create bulk audit entries and per-entity details where practical
- Workflow comments and rejection reasons are retained in history

## Expiry Handling
- `lastDate`, `examDate`, `resultDate`, or an explicit expiry date may drive public urgency and expiry labels
- Expired content is still available for SEO/history if useful, but clearly labeled and routed into archive behavior
- Archive is editorial; expiry is derived

## CMS UX Requirements
- Structured editor with sections for:
  - identity and taxonomy
  - trust and sources
  - dates
  - eligibility and fees
  - vacancies or admission programs
  - SEO and canonical fields
  - version note
- Workflow controls visible based on role
- Read-only history trail visible beside the editor

## Assumptions
- Workflow remains intentionally strict in v1 to support trust and editorial auditability
- Answer keys and syllabus can use the same workflow but may have lighter structured-field requirements
