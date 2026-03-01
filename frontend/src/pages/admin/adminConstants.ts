/**
 * Shared constants for the Admin module.
 * Extracted from AdminPage.tsx — single source of truth.
 * Supersedes the subset previously duplicated in components/admin/constants.ts.
 */

import type {
    AdminTab,
    AdminPermission,
    ContentType,
    AnnouncementStatus,
} from './adminTypes';

// ─── API / Security ─────────────────────────────────────────────────────────

export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';
export const ADMIN_STEP_UP_HEADER_NAME = 'X-Admin-Step-Up-Token';
export const ADMIN_APPROVAL_HEADER_NAME = 'X-Admin-Approval-Id';
export const ADMIN_BREAK_GLASS_REASON_HEADER_NAME = 'X-Admin-Break-Glass-Reason';
export const DEFAULT_BREAK_GLASS_REASON_MIN_LENGTH = 12;
export const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ─── Content / Category Options ─────────────────────────────────────────────

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
    { value: 'job', label: 'Latest Jobs' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'result', label: 'Latest Results' },
    { value: 'admission', label: 'Admissions' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'answer-key', label: 'Answer Keys' },
];

export const CATEGORY_OPTIONS: Array<{ value: string; label: string; icon: string }> = [
    { value: 'Central Government', label: 'Central Government', icon: '🏛️' },
    { value: 'State Government', label: 'State Government', icon: '🏢' },
    { value: 'Banking', label: 'Banking', icon: '🏦' },
    { value: 'Railways', label: 'Railways', icon: '🚆' },
    { value: 'Defence', label: 'Defence', icon: '🛡️' },
    { value: 'PSU', label: 'PSU', icon: '⚡' },
    { value: 'University', label: 'University', icon: '🎓' },
    { value: 'Police', label: 'Police', icon: '🚓' },
];

export const STATUS_OPTIONS: { value: AnnouncementStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

// ─── LocalStorage Keys ──────────────────────────────────────────────────────

export const LIST_FILTER_STORAGE_KEY = 'adminListFilters';
export const LIST_FILTER_PRESETS_KEY = 'adminListFilterPresets';
export const ADMIN_USER_STORAGE_KEY = 'adminUserProfile';
export const ADMIN_TIMEZONE_KEY = 'adminTimezoneMode';
export const ADMIN_SIDEBAR_KEY = 'adminSidebarCollapsed';

// ─── Tab Metadata ───────────────────────────────────────────────────────────

export const ADMIN_TAB_META: Record<AdminTab, { label: string; description: string }> = {
    analytics: {
        label: 'Analytics Command Center',
        description: 'Track traffic, conversions, and listing performance in real time.',
    },
    list: {
        label: 'All Announcements',
        description: 'Filter, audit, and edit every listing across categories.',
    },
    review: {
        label: 'Review Queue',
        description: 'Triage pending posts, QA alerts, and approvals in one pipeline.',
    },
    add: {
        label: 'Quick Add',
        description: 'Publish fast updates with lightweight form controls.',
    },
    detailed: {
        label: 'Detailed Post',
        description: 'Craft full listings with structured details, eligibility, and links.',
    },
    bulk: {
        label: 'Bulk Import',
        description: 'Apply bulk updates, scheduling, and status changes safely.',
    },
    queue: {
        label: 'Schedule Queue',
        description: 'Monitor scheduled releases and publish time-sensitive notices.',
    },
    users: {
        label: 'User Insights',
        description: 'Understand subscriber growth, activity, and cohorts.',
    },
    community: {
        label: 'Community Moderation',
        description: 'Resolve flags, forums, QA, and study group activity.',
    },
    errors: {
        label: 'Error Reports',
        description: 'Review client error logs and respond quickly to regressions.',
    },
    audit: {
        label: 'Audit Log',
        description: 'Trace admin actions for accountability and compliance.',
    },
    security: {
        label: 'Security Center',
        description: 'Manage access policies, sessions, and risk alerts.',
    },
};

export const READ_ONLY_MESSAGE = 'Read-only role: changes are restricted for your account.';

export const TAB_PERMISSION_MAP: Record<AdminTab, AdminPermission> = {
    analytics: 'analytics:read',
    list: 'announcements:read',
    review: 'announcements:approve',
    add: 'announcements:write',
    detailed: 'announcements:write',
    bulk: 'announcements:write',
    queue: 'announcements:read',
    security: 'security:read',
    users: 'admin:read',
    audit: 'audit:read',
    community: 'admin:read',
    errors: 'admin:read',
};

// ─── Review / Audit ─────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = [
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'bulk_update',
    'bulk_approve',
    'bulk_reject',
];

export const ACTIVE_USER_WINDOWS = [15, 30, 60, 120];

export const REVIEW_NOTE_TEMPLATES = [
    { id: 'approve_clean', label: 'Approve: QA verified', value: 'QA verified. Ready for publish.' },
    { id: 'approve_fast', label: 'Approve: Time-sensitive', value: 'Time-sensitive update. Publishing now.' },
    { id: 'reject_missing_docs', label: 'Reject: Missing details', value: 'Rejected: Missing mandatory details and official references.' },
    { id: 'reject_link_invalid', label: 'Reject: Invalid link', value: 'Rejected: Official link invalid or unreachable.' },
];

// ─── Default Form Data ──────────────────────────────────────────────────────

export const DEFAULT_FORM_DATA = {
    title: '',
    type: 'job' as ContentType,
    category: 'Central Government',
    organization: '',
    externalLink: '',
    location: 'All India',
    deadline: '',
    totalPosts: '',
    minQualification: '',
    ageLimit: '',
    applicationFee: '',
    salaryMin: '',
    salaryMax: '',
    difficulty: '' as '' | 'easy' | 'medium' | 'hard',
    cutoffMarks: '',
    status: 'draft' as AnnouncementStatus,
    publishAt: '',
};

export type FormData = typeof DEFAULT_FORM_DATA;
