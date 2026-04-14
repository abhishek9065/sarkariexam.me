# Content Model

## Canonical Aggregate
The primary public content unit is `Post`.

## Post Types
- `job`
- `result`
- `admit_card`
- `admission`
- `answer_key`
- `syllabus`

## Workflow Status
- `draft`
- `in_review`
- `approved`
- `published`
- `archived`

`expired` is derived from dates and archive policy, not used as the editorial workflow status.

## Core Entities
### Organization
- `id`
- `name`
- `slug`
- `shortName`
- `kind`
- `officialWebsite`
- `priority`
- `stateSlugs`
- `postCount`
- `createdAt`
- `updatedAt`

### State
- `id`
- `name`
- `slug`
- `code`
- `region`
- `postCount`
- `createdAt`
- `updatedAt`

### Category
- `id`
- `name`
- `slug`
- `postTypes`
- `priority`
- `postCount`
- `createdAt`
- `updatedAt`

### CollegeOrUniversity
- stored as `Institution`
- `id`
- `name`
- `slug`
- `kind`
- `stateSlugs`
- `officialWebsite`
- `postCount`
- `createdAt`
- `updatedAt`

### Exam
- `id`
- `name`
- `slug`
- `organizationSlug`
- `examLevel`
- `postCount`
- `createdAt`
- `updatedAt`

### Post
- `id`
- `legacyAnnouncementId?`
- `type`
- `title`
- `slug`
- `legacySlugs`
- `summary`
- `body`
- `shortInfo`
- `status`
- `verificationStatus`
- `verificationNote`
- `officialSources`
- `organization`
- `categories`
- `states`
- `qualificationTags`
- `institution?`
- `exam?`
- `importantDates`
- `eligibility`
- `feeRules`
- `vacancyRows`
- `admissionPrograms`
- `seo`
- `flags`
- `home`
- `searchText`
- `publishedAt?`
- `updatedAt`
- `expiresAt?`
- `archivedAt?`
- `createdBy`
- `updatedBy`
- `approvedBy?`
- `publishedBy?`
- `currentVersion`

### PostVersion
- `id`
- `postId`
- `version`
- `snapshot`
- `note`
- `reason`
- `actorId`
- `createdAt`

### OfficialSource
- embedded in `Post`
- `label`
- `url`
- `sourceType`
- `isPrimary`
- `capturedAt?`

### ImportantDate
- embedded in `Post`
- `label`
- `date`
- `kind`
- `isPrimary`
- `note?`

### Eligibility
- embedded in `Post`
- `label`
- `description`
- `qualificationSlug?`
- `minAge?`
- `maxAge?`
- `relaxationNote?`

### FeeRule
- embedded in `Post`
- `category`
- `amount`
- `currency`
- `paymentNote?`

### VacancyRow
- embedded in `Post`
- `postName`
- `department?`
- `category?`
- `vacancies`
- `payLevel?`
- `salaryNote?`

### AdmissionProgram
- embedded in `Post`
- `programName`
- `level`
- `department?`
- `intake?`
- `eligibilityNote?`

### AlertSubscription
- `id`
- `email?`
- `channel`
- `stateSlugs`
- `categorySlugs`
- `organizationSlugs`
- `qualificationSlugs`
- `keywords`
- `frequency`
- `isVerified`
- `isActive`
- `createdAt`
- `updatedAt`

### AuditLog
- `id`
- `entityType`
- `entityId`
- `action`
- `actorId`
- `actorRole`
- `summary`
- `metadata`
- `createdAt`

## Denormalized Query Fields on Post
- `organizationSlug`
- `organizationName`
- `stateSlugs`
- `stateNames`
- `categorySlugs`
- `categoryNames`
- `qualificationSlugs`
- `institutionSlug`
- `examSlug`
- `isUrgent`
- `isNew`
- `isLastDate`
- `publishedAt`
- `updatedAt`
- `lastDate`
- `expiresAt`
- `isExpired`
- `searchText`

These fields exist to support fast public listing filters and taxonomy landing pages without expensive join-like behavior.

## SEO Fields
- `seo.metaTitle`
- `seo.metaDescription`
- `seo.canonicalPath`
- `seo.indexable`
- `seo.ogImage?`
- `seo.schemaType`

## Defaults
- Slug is editor-overridable but validated for uniqueness
- Missing taxonomy references are upserted automatically during save where safe
- Publish requires at least one official source for the four primary content types unless an explicit override note is stored
- Archive can be manual or derived from expiry policy
