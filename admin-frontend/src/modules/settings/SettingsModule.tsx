import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdminAuth } from '../../app/useAdminAuth';
import { OpsBadge, OpsCard, OpsErrorState } from '../../components/ops';
import {
    generateAdminBackupCodes,
    getAdminBackupCodeStatus,
    getAdminSetting,
    setupAdminTwoFactor,
    updateAdminSetting,
    verifyAdminTwoFactor,
} from '../../lib/api/client';
import type {
    AdminPortalRole,
    AdminSettingKey,
    AdminSettingRecord,
    AnnouncementStatusFilter,
    AnnouncementTypeFilter,
} from '../../types';

const ROLE_OPTIONS: AdminPortalRole[] = ['admin', 'editor', 'contributor', 'reviewer', 'viewer'];
const CONTENT_TYPE_OPTIONS: Array<{ value: AnnouncementTypeFilter; label: string }> = [
    { value: 'job', label: 'Jobs' },
    { value: 'result', label: 'Results' },
    { value: 'admit-card', label: 'Admit Cards' },
    { value: 'answer-key', label: 'Answer Keys' },
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'admission', label: 'Admissions' },
];
const STATUS_OPTIONS: AnnouncementStatusFilter[] = ['draft', 'pending', 'scheduled', 'published', 'archived'];

type WorkflowPolicyForm = {
    defaultStatus: AnnouncementStatusFilter;
    reviewWindowHours: number;
    autoAssignRole: AdminPortalRole;
    requiresReview: boolean;
    requiresStepUpToPublish: boolean;
};

type WorkflowDefaultsForm = Record<AnnouncementTypeFilter, WorkflowPolicyForm>;

type HomepageDefaultsForm = {
    featuredSectionOrder: string[];
    maxItemsPerSection: number;
    allowStickyOverrides: boolean;
};

type AlertThresholdsForm = {
    brokenLinksCritical: number;
    overdueReviewCritical: number;
    trafficDropPercent: number;
};

type SecurityPolicyForm = {
    enforceHttps: boolean;
    requireTwoFactor: boolean;
    maxConcurrentSessions: number;
    breakGlassReasonMinLength: number;
};

type NotificationRoutingForm = {
    reviewQueue: string[];
    securityAlerts: string[];
    incidentEscalation: string[];
};

const DEFAULT_WORKFLOW_DEFAULTS: WorkflowDefaultsForm = {
    job: {
        defaultStatus: 'pending',
        reviewWindowHours: 24,
        autoAssignRole: 'reviewer',
        requiresReview: true,
        requiresStepUpToPublish: true,
    },
    result: {
        defaultStatus: 'pending',
        reviewWindowHours: 12,
        autoAssignRole: 'editor',
        requiresReview: true,
        requiresStepUpToPublish: true,
    },
    'admit-card': {
        defaultStatus: 'pending',
        reviewWindowHours: 12,
        autoAssignRole: 'editor',
        requiresReview: true,
        requiresStepUpToPublish: false,
    },
    'answer-key': {
        defaultStatus: 'pending',
        reviewWindowHours: 8,
        autoAssignRole: 'reviewer',
        requiresReview: true,
        requiresStepUpToPublish: false,
    },
    syllabus: {
        defaultStatus: 'pending',
        reviewWindowHours: 12,
        autoAssignRole: 'contributor',
        requiresReview: true,
        requiresStepUpToPublish: false,
    },
    admission: {
        defaultStatus: 'pending',
        reviewWindowHours: 24,
        autoAssignRole: 'reviewer',
        requiresReview: true,
        requiresStepUpToPublish: true,
    },
};

const DEFAULT_HOMEPAGE_DEFAULTS: HomepageDefaultsForm = {
    featuredSectionOrder: ['important', 'job', 'result', 'admit-card'],
    maxItemsPerSection: 12,
    allowStickyOverrides: true,
};

const DEFAULT_ALERT_THRESHOLDS: AlertThresholdsForm = {
    brokenLinksCritical: 10,
    overdueReviewCritical: 5,
    trafficDropPercent: 35,
};

const DEFAULT_SECURITY_POLICY: SecurityPolicyForm = {
    enforceHttps: true,
    requireTwoFactor: true,
    maxConcurrentSessions: 3,
    breakGlassReasonMinLength: 12,
};

const DEFAULT_NOTIFICATION_ROUTING: NotificationRoutingForm = {
    reviewQueue: ['ops@sarkariexams.me'],
    securityAlerts: ['security@sarkariexams.me'],
    incidentEscalation: ['owner@sarkariexams.me'],
};

const parseLines = (value: string) => value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const formatMetadata = (record: AdminSettingRecord | undefined) => {
    if (!record?.updatedAt) return 'Not updated yet';
    const updatedLabel = new Date(record.updatedAt).toLocaleString();
    return record.updatedBy
        ? `Updated ${updatedLabel} by ${record.updatedBy}`
        : `Updated ${updatedLabel}`;
};

const readRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const readBoolean = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;

const readPositiveInt = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.round(parsed));
        }
    }
    return fallback;
};

const readStringArray = (value: unknown, fallback: string[]) =>
    Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim())
        : fallback;

const readRole = (value: unknown, fallback: AdminPortalRole): AdminPortalRole =>
    typeof value === 'string' && ROLE_OPTIONS.includes(value as AdminPortalRole)
        ? value as AdminPortalRole
        : fallback;

const readStatus = (value: unknown, fallback: AnnouncementStatusFilter): AnnouncementStatusFilter =>
    typeof value === 'string' && STATUS_OPTIONS.includes(value as AnnouncementStatusFilter)
        ? value as AnnouncementStatusFilter
        : fallback;

const toWorkflowDefaults = (payload?: Record<string, unknown>): WorkflowDefaultsForm => {
    const normalized = {} as WorkflowDefaultsForm;
    for (const contentType of CONTENT_TYPE_OPTIONS) {
        const fallback = DEFAULT_WORKFLOW_DEFAULTS[contentType.value];
        const current = readRecord(payload?.[contentType.value]);
        normalized[contentType.value] = {
            defaultStatus: readStatus(current.defaultStatus, fallback.defaultStatus),
            reviewWindowHours: readPositiveInt(current.reviewWindowHours, fallback.reviewWindowHours),
            autoAssignRole: readRole(current.autoAssignRole, fallback.autoAssignRole),
            requiresReview: readBoolean(current.requiresReview, fallback.requiresReview),
            requiresStepUpToPublish: readBoolean(current.requiresStepUpToPublish, fallback.requiresStepUpToPublish),
        };
    }
    return normalized;
};

const toHomepageDefaults = (payload?: Record<string, unknown>): HomepageDefaultsForm => {
    const data = readRecord(payload);
    return {
        featuredSectionOrder: readStringArray(data.featuredSectionOrder, DEFAULT_HOMEPAGE_DEFAULTS.featuredSectionOrder),
        maxItemsPerSection: readPositiveInt(data.maxItemsPerSection, DEFAULT_HOMEPAGE_DEFAULTS.maxItemsPerSection),
        allowStickyOverrides: readBoolean(data.allowStickyOverrides, DEFAULT_HOMEPAGE_DEFAULTS.allowStickyOverrides),
    };
};

const toAlertThresholds = (payload?: Record<string, unknown>): AlertThresholdsForm => {
    const data = readRecord(payload);
    return {
        brokenLinksCritical: readPositiveInt(data.brokenLinksCritical, DEFAULT_ALERT_THRESHOLDS.brokenLinksCritical),
        overdueReviewCritical: readPositiveInt(data.overdueReviewCritical, DEFAULT_ALERT_THRESHOLDS.overdueReviewCritical),
        trafficDropPercent: readPositiveInt(data.trafficDropPercent, DEFAULT_ALERT_THRESHOLDS.trafficDropPercent),
    };
};

const toSecurityPolicy = (payload?: Record<string, unknown>): SecurityPolicyForm => {
    const data = readRecord(payload);
    return {
        enforceHttps: readBoolean(data.enforceHttps, DEFAULT_SECURITY_POLICY.enforceHttps),
        requireTwoFactor: readBoolean(data.requireTwoFactor, DEFAULT_SECURITY_POLICY.requireTwoFactor),
        maxConcurrentSessions: readPositiveInt(data.maxConcurrentSessions, DEFAULT_SECURITY_POLICY.maxConcurrentSessions),
        breakGlassReasonMinLength: readPositiveInt(data.breakGlassReasonMinLength, DEFAULT_SECURITY_POLICY.breakGlassReasonMinLength),
    };
};

const toNotificationRouting = (payload?: Record<string, unknown>): NotificationRoutingForm => {
    const data = readRecord(payload);
    return {
        reviewQueue: readStringArray(data.reviewQueue, DEFAULT_NOTIFICATION_ROUTING.reviewQueue),
        securityAlerts: readStringArray(data.securityAlerts, DEFAULT_NOTIFICATION_ROUTING.securityAlerts),
        incidentEscalation: readStringArray(data.incidentEscalation, DEFAULT_NOTIFICATION_ROUTING.incidentEscalation),
    };
};

function SettingCardMeta({
    tone,
    label,
    record,
}: {
    tone: 'info' | 'warning' | 'success' | 'danger';
    label: string;
    record: AdminSettingRecord | undefined;
}) {
    return (
        <div className="ops-meta-row">
            <OpsBadge tone={tone}>{label}</OpsBadge>
            <span>{formatMetadata(record)}</span>
        </div>
    );
}

function SettingCardActions({
    saving,
    saveLabel,
    resetLabel = 'Reset',
    onSave,
    onReset,
}: {
    saving: boolean;
    saveLabel: string;
    resetLabel?: string;
    onSave: () => void;
    onReset: () => void;
}) {
    return (
        <div className="ops-actions">
            <button type="button" className="admin-btn primary" disabled={saving} onClick={onSave}>
                {saving ? 'Saving...' : saveLabel}
            </button>
            <button type="button" className="admin-btn subtle" onClick={onReset}>
                {resetLabel}
            </button>
        </div>
    );
}

function ListSettingEditor({
    settingKey,
    title,
    description,
}: {
    settingKey: Extract<AdminSettingKey, 'states' | 'boards' | 'tags'>;
    title: string;
    description: string;
}) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState('');

    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });

    useEffect(() => {
        setDraft((query.data?.values ?? []).join('\n'));
    }, [query.data?.updatedAt, query.data?.values]);

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, { values: parseLines(draft) }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
        },
    });

    return (
        <OpsCard title={title} description={description}>
            <SettingCardMeta tone="info" label="Taxonomy" record={query.data} />
            {query.isPending ? <div className="admin-alert info">Loading {title.toLowerCase()}...</div> : null}
            {query.error ? <OpsErrorState message={`Failed to load ${title.toLowerCase()}.`} /> : null}
            {!query.isPending ? (
                <div className="ops-form-grid">
                    <label className="ops-span-full">
                        <span className="ops-label">{title}</span>
                        <textarea
                            className="ops-span-full ops-textarea"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder={`Enter ${title.toLowerCase()} (one per line)`}
                        />
                    </label>
                    <div className="ops-span-full">
                        <SettingCardActions
                            saving={saveMutation.isPending}
                            saveLabel={`Save ${title}`}
                            onSave={() => saveMutation.mutate()}
                            onReset={() => setDraft((query.data?.values ?? []).join('\n'))}
                        />
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">{title} updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : `Failed to save ${title.toLowerCase()}.`} /> : null}
        </OpsCard>
    );
}

function WorkflowDefaultsEditor() {
    const settingKey: Extract<AdminSettingKey, 'workflow-defaults'> = 'workflow-defaults';
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });
    const normalized = useMemo(() => toWorkflowDefaults(query.data?.payload), [query.data?.payload]);
    const [draft, setDraft] = useState<WorkflowDefaultsForm>(normalized);

    useEffect(() => {
        setDraft(normalized);
    }, [normalized]);

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, { payload: draft as unknown as Record<string, unknown> }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
        },
    });

    const updateType = <K extends keyof WorkflowPolicyForm>(type: AnnouncementTypeFilter, field: K, value: WorkflowPolicyForm[K]) => {
        setDraft((current) => ({
            ...current,
            [type]: {
                ...current[type],
                [field]: value,
            },
        }));
    };

    return (
        <OpsCard title="Workflow Defaults" description="Set review posture, auto-assignment, and publish guardrails per content type.">
            <SettingCardMeta tone="warning" label="Workflow Policy" record={query.data} />
            {query.isPending ? <div className="admin-alert info">Loading workflow defaults...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load workflow defaults." /> : null}
            {!query.isPending ? (
                <div className="settings-policy-grid">
                    {CONTENT_TYPE_OPTIONS.map((contentType) => {
                        const record = draft[contentType.value];
                        return (
                            <div key={contentType.value} className="settings-policy-card">
                                <div className="ops-meta-row">
                                    <OpsBadge tone="info">{contentType.label}</OpsBadge>
                                </div>
                                <label>
                                    <span className="ops-label">Default status</span>
                                    <select
                                        aria-label={`${contentType.label} default status`}
                                        value={record.defaultStatus}
                                        onChange={(event) => updateType(contentType.value, 'defaultStatus', event.target.value as AnnouncementStatusFilter)}
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="ops-label">Review window (hours)</span>
                                    <input
                                        aria-label={`${contentType.label} review window hours`}
                                        type="number"
                                        min={0}
                                        value={record.reviewWindowHours}
                                        onChange={(event) => updateType(contentType.value, 'reviewWindowHours', readPositiveInt(event.target.value, 0))}
                                    />
                                </label>
                                <label>
                                    <span className="ops-label">Auto-assign role</span>
                                    <select
                                        aria-label={`${contentType.label} auto assign role`}
                                        value={record.autoAssignRole}
                                        onChange={(event) => updateType(contentType.value, 'autoAssignRole', event.target.value as AdminPortalRole)}
                                    >
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="settings-policy-toggle">
                                    <input
                                        type="checkbox"
                                        checked={record.requiresReview}
                                        onChange={(event) => updateType(contentType.value, 'requiresReview', event.target.checked)}
                                    />
                                    <span>Require review before publish</span>
                                </label>
                                <label className="settings-policy-toggle">
                                    <input
                                        type="checkbox"
                                        checked={record.requiresStepUpToPublish}
                                        onChange={(event) => updateType(contentType.value, 'requiresStepUpToPublish', event.target.checked)}
                                    />
                                    <span>Require step-up for publish</span>
                                </label>
                            </div>
                        );
                    })}
                    <div className="ops-span-full">
                        <SettingCardActions
                            saving={saveMutation.isPending}
                            saveLabel="Save Workflow Defaults"
                            onSave={() => saveMutation.mutate()}
                            onReset={() => setDraft(normalized)}
                        />
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">Workflow defaults updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save workflow defaults.'} /> : null}
        </OpsCard>
    );
}

function HomepageDefaultsEditor() {
    const settingKey: Extract<AdminSettingKey, 'homepage-defaults'> = 'homepage-defaults';
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });
    const normalized = useMemo(() => toHomepageDefaults(query.data?.payload), [query.data?.payload]);
    const [draft, setDraft] = useState<HomepageDefaultsForm>(normalized);

    useEffect(() => {
        setDraft(normalized);
    }, [normalized]);

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, {
            payload: {
                featuredSectionOrder: draft.featuredSectionOrder,
                maxItemsPerSection: draft.maxItemsPerSection,
                allowStickyOverrides: draft.allowStickyOverrides,
            },
        }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
        },
    });

    return (
        <OpsCard title="Homepage Defaults" description="Control the default homepage section order and how much content each block carries.">
            <SettingCardMeta tone="info" label="Homepage Policy" record={query.data} />
            {query.isPending ? <div className="admin-alert info">Loading homepage defaults...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load homepage defaults." /> : null}
            {!query.isPending ? (
                <div className="ops-form-grid">
                    <label className="ops-span-full">
                        <span className="ops-label">Featured section order</span>
                        <textarea
                            aria-label="Featured section order"
                            className="ops-textarea settings-text-list"
                            value={draft.featuredSectionOrder.join('\n')}
                            onChange={(event) => setDraft((current) => ({ ...current, featuredSectionOrder: parseLines(event.target.value) }))}
                            placeholder="important&#10;job&#10;result&#10;admit-card"
                        />
                    </label>
                    <label>
                        <span className="ops-label">Maximum items per section</span>
                        <input
                            aria-label="Maximum items per section"
                            type="number"
                            min={1}
                            value={draft.maxItemsPerSection}
                            onChange={(event) => setDraft((current) => ({ ...current, maxItemsPerSection: Math.max(1, readPositiveInt(event.target.value, 1)) }))}
                        />
                    </label>
                    <label className="settings-policy-toggle settings-policy-toggle-inline">
                        <input
                            type="checkbox"
                            checked={draft.allowStickyOverrides}
                            onChange={(event) => setDraft((current) => ({ ...current, allowStickyOverrides: event.target.checked }))}
                        />
                        <span>Allow sticky overrides from content ops</span>
                    </label>
                    <div className="ops-span-full">
                        <SettingCardActions
                            saving={saveMutation.isPending}
                            saveLabel="Save Homepage Defaults"
                            onSave={() => saveMutation.mutate()}
                            onReset={() => setDraft(normalized)}
                        />
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">Homepage defaults updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save homepage defaults.'} /> : null}
        </OpsCard>
    );
}

function AlertThresholdsEditor() {
    const settingKey: Extract<AdminSettingKey, 'alert-thresholds'> = 'alert-thresholds';
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });
    const normalized = useMemo(() => toAlertThresholds(query.data?.payload), [query.data?.payload]);
    const [draft, setDraft] = useState<AlertThresholdsForm>(normalized);

    useEffect(() => {
        setDraft(normalized);
    }, [normalized]);

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, { payload: draft as unknown as Record<string, unknown> }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
        },
    });

    return (
        <OpsCard title="Alert Thresholds" description="Set the numeric tripwires that should surface critical operator alerts.">
            <SettingCardMeta tone="danger" label="Operational Thresholds" record={query.data} />
            {query.isPending ? <div className="admin-alert info">Loading alert thresholds...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load alert thresholds." /> : null}
            {!query.isPending ? (
                <div className="settings-policy-grid">
                    <label className="settings-policy-card">
                        <span className="ops-label">Broken links critical threshold</span>
                        <input
                            aria-label="Broken links critical threshold"
                            type="number"
                            min={1}
                            value={draft.brokenLinksCritical}
                            onChange={(event) => setDraft((current) => ({ ...current, brokenLinksCritical: Math.max(1, readPositiveInt(event.target.value, 1)) }))}
                        />
                    </label>
                    <label className="settings-policy-card">
                        <span className="ops-label">Overdue review critical threshold</span>
                        <input
                            aria-label="Overdue review critical threshold"
                            type="number"
                            min={1}
                            value={draft.overdueReviewCritical}
                            onChange={(event) => setDraft((current) => ({ ...current, overdueReviewCritical: Math.max(1, readPositiveInt(event.target.value, 1)) }))}
                        />
                    </label>
                    <label className="settings-policy-card">
                        <span className="ops-label">Traffic drop percentage alert</span>
                        <input
                            aria-label="Traffic drop percentage alert"
                            type="number"
                            min={1}
                            max={100}
                            value={draft.trafficDropPercent}
                            onChange={(event) => setDraft((current) => ({ ...current, trafficDropPercent: Math.min(100, Math.max(1, readPositiveInt(event.target.value, 1))) }))}
                        />
                    </label>
                    <div className="ops-span-full">
                        <SettingCardActions
                            saving={saveMutation.isPending}
                            saveLabel="Save Alert Thresholds"
                            onSave={() => saveMutation.mutate()}
                            onReset={() => setDraft(normalized)}
                        />
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">Alert thresholds updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save alert thresholds.'} /> : null}
        </OpsCard>
    );
}

function SecurityPolicyEditor() {
    const settingKey: Extract<AdminSettingKey, 'security-policy'> = 'security-policy';
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });
    const normalized = useMemo(() => toSecurityPolicy(query.data?.payload), [query.data?.payload]);
    const [draft, setDraft] = useState<SecurityPolicyForm>(normalized);

    useEffect(() => {
        setDraft(normalized);
    }, [normalized]);

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, { payload: draft as unknown as Record<string, unknown> }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
        },
    });

    return (
        <OpsCard title="Security Policy" description="Tune session limits and high-risk admin guardrails without editing raw JSON.">
            <SettingCardMeta tone="success" label="Security Posture" record={query.data} />
            {query.isPending ? <div className="admin-alert info">Loading security policy...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load security policy." /> : null}
            {!query.isPending ? (
                <div className="settings-policy-grid">
                    <label className="settings-policy-toggle settings-policy-card">
                        <input
                            type="checkbox"
                            checked={draft.enforceHttps}
                            onChange={(event) => setDraft((current) => ({ ...current, enforceHttps: event.target.checked }))}
                        />
                        <span>Enforce HTTPS for all admin routes</span>
                    </label>
                    <label className="settings-policy-toggle settings-policy-card">
                        <input
                            type="checkbox"
                            checked={draft.requireTwoFactor}
                            onChange={(event) => setDraft((current) => ({ ...current, requireTwoFactor: event.target.checked }))}
                        />
                        <span>Require 2FA for all admins</span>
                    </label>
                    <label className="settings-policy-card">
                        <span className="ops-label">Maximum concurrent sessions</span>
                        <input
                            aria-label="Maximum concurrent sessions"
                            type="number"
                            min={1}
                            value={draft.maxConcurrentSessions}
                            onChange={(event) => setDraft((current) => ({ ...current, maxConcurrentSessions: Math.max(1, readPositiveInt(event.target.value, 1)) }))}
                        />
                    </label>
                    <label className="settings-policy-card">
                        <span className="ops-label">Minimum break-glass reason length</span>
                        <input
                            aria-label="Minimum break glass reason length"
                            type="number"
                            min={1}
                            value={draft.breakGlassReasonMinLength}
                            onChange={(event) => setDraft((current) => ({ ...current, breakGlassReasonMinLength: Math.max(1, readPositiveInt(event.target.value, 1)) }))}
                        />
                    </label>
                    <div className="ops-span-full">
                        <SettingCardActions
                            saving={saveMutation.isPending}
                            saveLabel="Save Security Policy"
                            onSave={() => saveMutation.mutate()}
                            onReset={() => setDraft(normalized)}
                        />
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">Security policy updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save security policy.'} /> : null}
        </OpsCard>
    );
}

function NotificationRoutingEditor() {
    const settingKey: Extract<AdminSettingKey, 'notification-routing'> = 'notification-routing';
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['admin-setting', settingKey],
        queryFn: () => getAdminSetting(settingKey),
    });
    const normalized = useMemo(() => toNotificationRouting(query.data?.payload), [query.data?.payload]);
    const [draft, setDraft] = useState<NotificationRoutingForm>(normalized);

    useEffect(() => {
        setDraft(normalized);
    }, [normalized]);

    const saveMutation = useMutation({
        mutationFn: async () => updateAdminSetting(settingKey, { payload: draft as unknown as Record<string, unknown> }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-setting', settingKey] });
        },
    });

    const updateList = (field: keyof NotificationRoutingForm, value: string) => {
        setDraft((current) => ({
            ...current,
            [field]: parseLines(value),
        }));
    };

    return (
        <OpsCard title="Notification Routing" description="Define who gets review, security, and escalation notifications from admin operations.">
            <SettingCardMeta tone="warning" label="Notification Policy" record={query.data} />
            {query.isPending ? <div className="admin-alert info">Loading notification routing...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load notification routing." /> : null}
            {!query.isPending ? (
                <div className="settings-policy-grid">
                    <label className="settings-policy-card">
                        <span className="ops-label">Review queue recipients</span>
                        <textarea
                            aria-label="Review queue recipients"
                            className="ops-textarea settings-text-list"
                            value={draft.reviewQueue.join('\n')}
                            onChange={(event) => updateList('reviewQueue', event.target.value)}
                            placeholder="ops@sarkariexams.me"
                        />
                    </label>
                    <label className="settings-policy-card">
                        <span className="ops-label">Security alert recipients</span>
                        <textarea
                            aria-label="Security alert recipients"
                            className="ops-textarea settings-text-list"
                            value={draft.securityAlerts.join('\n')}
                            onChange={(event) => updateList('securityAlerts', event.target.value)}
                            placeholder="security@sarkariexams.me"
                        />
                    </label>
                    <label className="settings-policy-card">
                        <span className="ops-label">Incident escalation recipients</span>
                        <textarea
                            aria-label="Incident escalation recipients"
                            className="ops-textarea settings-text-list"
                            value={draft.incidentEscalation.join('\n')}
                            onChange={(event) => updateList('incidentEscalation', event.target.value)}
                            placeholder="owner@sarkariexams.me"
                        />
                    </label>
                    <div className="ops-span-full">
                        <SettingCardActions
                            saving={saveMutation.isPending}
                            saveLabel="Save Notification Routing"
                            onSave={() => saveMutation.mutate()}
                            onReset={() => setDraft(normalized)}
                        />
                    </div>
                </div>
            ) : null}
            {saveMutation.isSuccess ? <div className="ops-success">Notification routing updated.</div> : null}
            {saveMutation.isError ? <OpsErrorState message={saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save notification routing.'} /> : null}
        </OpsCard>
    );
}

function AdminSecurityWorkspace() {
    const queryClient = useQueryClient();
    const { user, refresh } = useAdminAuth();
    const [latestCodes, setLatestCodes] = useState<string[]>([]);
    const [setupQrCode, setSetupQrCode] = useState<string | null>(null);
    const [setupSecret, setSetupSecret] = useState<string | null>(null);
    const [setupVerificationCode, setSetupVerificationCode] = useState('');

    const statusQuery = useQuery({
        queryKey: ['admin-backup-code-status'],
        queryFn: getAdminBackupCodeStatus,
        enabled: Boolean(user?.twoFactorEnabled),
    });

    const setupMutation = useMutation({
        mutationFn: setupAdminTwoFactor,
        onSuccess: (result) => {
            setSetupQrCode(result.qrCode);
            setSetupSecret(result.secret);
        },
    });

    const verifyMutation = useMutation({
        mutationFn: async () => verifyAdminTwoFactor(setupVerificationCode),
        onSuccess: async () => {
            await refresh();
            await queryClient.invalidateQueries({ queryKey: ['admin-backup-code-status'] });
            setSetupVerificationCode('');
        },
    });

    const regenerateMutation = useMutation({
        mutationFn: async () => generateAdminBackupCodes(),
        onSuccess: async (result) => {
            setLatestCodes(result.codes);
            await queryClient.invalidateQueries({ queryKey: ['admin-backup-code-status'] });
        },
    });

    return (
        <OpsCard
            title="Admin Authentication"
            description="Review your 2FA posture and regenerate backup codes without leaving admin vNext."
        >
            <div className="ops-meta-row">
                <OpsBadge tone={user?.twoFactorEnabled ? 'success' : 'danger'}>
                    {user?.twoFactorEnabled ? '2FA Enabled' : '2FA Required'}
                </OpsBadge>
                {statusQuery.data ? (
                    <span>
                        Backup codes: {statusQuery.data.remaining}/{statusQuery.data.total}
                    </span>
                ) : null}
            </div>

            {!user?.twoFactorEnabled ? (
                <>
                    <div className="admin-alert warning">
                        Two-factor is not enabled for this admin session yet. Start setup here to protect high-risk actions without leaving admin vNext.
                    </div>
                    <div className="ops-actions">
                        <button
                            type="button"
                            className="admin-btn primary"
                            disabled={setupMutation.isPending}
                            onClick={() => setupMutation.mutate()}
                        >
                            {setupMutation.isPending ? 'Preparing...' : 'Start Two-Factor Setup'}
                        </button>
                    </div>
                    {setupMutation.isError ? (
                        <OpsErrorState message={setupMutation.error instanceof Error ? setupMutation.error.message : 'Failed to initialize two-factor setup.'} />
                    ) : null}
                    {setupQrCode ? (
                        <div className="settings-two-factor-panel">
                            <div className="settings-two-factor-qr">
                                <img src={setupQrCode} alt="Admin settings two-factor QR code" className="settings-two-factor-image" />
                            </div>
                            {setupSecret ? (
                                <div className="admin-login-setup-secret">
                                    <span>Manual secret</span>
                                    <code>{setupSecret}</code>
                                </div>
                            ) : null}
                            <div className="admin-login-field">
                                <label className="admin-login-label" htmlFor="settings-admin-2fa-code">Verify setup code</label>
                                <input
                                    id="settings-admin-2fa-code"
                                    type="text"
                                    value={setupVerificationCode}
                                    placeholder="Enter the 6-digit authenticator code"
                                    onChange={(event) => setSetupVerificationCode(event.target.value)}
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <div className="ops-actions">
                                <button
                                    type="button"
                                    className="admin-btn primary"
                                    disabled={verifyMutation.isPending || setupVerificationCode.trim().length === 0}
                                    onClick={() => verifyMutation.mutate()}
                                >
                                    {verifyMutation.isPending ? 'Verifying...' : 'Verify Two-Factor'}
                                </button>
                            </div>
                            {verifyMutation.isError ? (
                                <OpsErrorState message={verifyMutation.error instanceof Error ? verifyMutation.error.message : 'Two-factor verification failed.'} />
                            ) : null}
                            {verifyMutation.isSuccess ? (
                                <div className="ops-success">Two-factor is enabled. Generate backup codes next.</div>
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : null}

            {statusQuery.error ? <OpsErrorState message="Failed to load backup-code status." /> : null}

            {user?.twoFactorEnabled ? (
                <div className="ops-actions">
                    <button
                        type="button"
                        className="admin-btn primary"
                        disabled={regenerateMutation.isPending}
                        onClick={() => regenerateMutation.mutate()}
                    >
                        {regenerateMutation.isPending ? 'Generating...' : 'Regenerate Backup Codes'}
                    </button>
                </div>
            ) : null}

            {regenerateMutation.isError ? (
                <OpsErrorState message={regenerateMutation.error instanceof Error ? regenerateMutation.error.message : 'Failed to generate backup codes.'} />
            ) : null}

            {latestCodes.length > 0 ? (
                <div className="settings-backup-codes">
                    <div className="admin-alert warning">
                        These backup codes are only shown once. Store them securely before leaving this page.
                    </div>
                    <div className="settings-backup-code-grid">
                        {latestCodes.map((code) => (
                            <code key={code} className="settings-backup-code">{code}</code>
                        ))}
                    </div>
                </div>
            ) : null}
        </OpsCard>
    );
}

export function SettingsModule() {
    return (
        <>
            <OpsCard
                title="Configuration Workspace"
                description="Manage taxonomy, workflow defaults, homepage posture, security policy, and operator routing from a single admin route."
            >
                <div className="ops-meta-row">
                    <OpsBadge tone="info">Access Control</OpsBadge>
                    <OpsBadge tone="warning">Workflow</OpsBadge>
                    <OpsBadge tone="success">Incident Response</OpsBadge>
                </div>
            </OpsCard>

            <ListSettingEditor
                settingKey="states"
                title="States List"
                description="Maintain state taxonomy for filtering and tagging."
            />
            <ListSettingEditor
                settingKey="boards"
                title="Exam Boards"
                description="Maintain SSC, UPSC, Railway, and other board taxonomy."
            />
            <ListSettingEditor
                settingKey="tags"
                title="Global Tags"
                description="Shared tags used for Jobs, Results, Admit Card, and SEO flows."
            />

            <WorkflowDefaultsEditor />
            <HomepageDefaultsEditor />
            <AlertThresholdsEditor />
            <SecurityPolicyEditor />
            <NotificationRoutingEditor />
            <AdminSecurityWorkspace />
        </>
    );
}
