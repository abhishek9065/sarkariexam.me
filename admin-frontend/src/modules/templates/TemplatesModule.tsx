import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold, PermissionState, RowActionMenu, type RowAction } from '../../components/workspace';
import {
    createTemplateRecord,
    deleteTemplateRecord,
    getTemplateRecords,
    updateTemplateRecord,
} from '../../lib/api/client';
import { hasAdminPermission } from '../../lib/adminRbac';
import type { AnnouncementTypeFilter, TemplateRecord } from '../../types';

type SharedFilter = 'all' | 'true' | 'false';

type TemplateFormState = {
    type: AnnouncementTypeFilter;
    name: string;
    description: string;
    shared: boolean;
    sections: string;
    payloadJson: string;
};

const buildDefaultTemplateForm = (allowShared: boolean): TemplateFormState => ({
    type: 'job',
    name: '',
    description: '',
    shared: allowShared,
    sections: '',
    payloadJson: '{}',
});

const parseSectionLines = (value: string): string[] =>
    value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

const parsePayloadJson = (value: string): Record<string, unknown> => {
    const normalized = value.trim();
    if (!normalized) {
        return {};
    }

    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Payload JSON must be an object.');
    }
    return parsed as Record<string, unknown>;
};

const sharedLabel = (shared: boolean) => (shared ? 'Shared' : 'Private');

const duplicateTemplatePayload = (record: TemplateRecord): Omit<TemplateRecord, 'id'> => ({
    type: record.type,
    name: `${record.name} Copy`,
    description: record.description,
    shared: false,
    sections: record.sections ?? [],
    payload: record.payload ?? {},
    usageCount: 0,
    lastUsedAt: undefined,
    lastUsedBy: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    createdBy: undefined,
    updatedBy: undefined,
});

export function TemplatesModule() {
    const queryClient = useQueryClient();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();
    const { user, permissions } = useAdminAuth();

    const actorId = user?.userId;
    const actorRole = user?.role;
    const canWriteTemplates = hasAdminPermission(permissions, actorRole, 'announcements:write');
    const canManageSharedTemplates = actorRole === 'admin';

    const [typeFilter, setTypeFilter] = useState<AnnouncementTypeFilter | 'all'>('all');
    const [sharedFilter, setSharedFilter] = useState<SharedFilter>('all');
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<TemplateFormState>(() => buildDefaultTemplateForm(canManageSharedTemplates));

    const query = useQuery({
        queryKey: ['admin-templates', typeFilter, sharedFilter, search],
        queryFn: () => getTemplateRecords({ type: typeFilter, shared: sharedFilter, search, limit: 150 }),
    });

    const templates = useMemo(() => query.data?.data ?? [], [query.data]);
    const sharedCount = useMemo(() => templates.filter((item) => item.shared).length, [templates]);
    const privateCount = useMemo(() => templates.filter((item) => !item.shared).length, [templates]);
    const recentlyUsedCount = useMemo(() => templates.filter((item) => Boolean(item.lastUsedAt)).length, [templates]);

    const invalidateTemplates = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
        ]);
    };

    const createMutation = useMutation({
        mutationFn: async () =>
            createTemplateRecord({
                type: form.type,
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                shared: canManageSharedTemplates ? form.shared : false,
                sections: parseSectionLines(form.sections),
                payload: parsePayloadJson(form.payloadJson),
                usageCount: 0,
                lastUsedAt: undefined,
                lastUsedBy: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                createdBy: undefined,
                updatedBy: undefined,
            }),
        onSuccess: async (record) => {
            notifySuccess('Template created', `Template "${record.name}" is ready for faster editorial starts.`);
            setForm(buildDefaultTemplateForm(canManageSharedTemplates));
            await invalidateTemplates();
        },
        onError: (error) => {
            notifyError('Create failed', error instanceof Error ? error.message : 'Unable to create template.');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingId) {
                throw new Error('No template selected for update.');
            }
            return updateTemplateRecord(editingId, {
                type: form.type,
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                shared: canManageSharedTemplates ? form.shared : false,
                sections: parseSectionLines(form.sections),
                payload: parsePayloadJson(form.payloadJson),
            });
        },
        onSuccess: async (record) => {
            notifySuccess('Template updated', `Updated "${record.name}".`);
            setEditingId(null);
            setForm(buildDefaultTemplateForm(canManageSharedTemplates));
            await invalidateTemplates();
        },
        onError: (error) => {
            notifyError('Update failed', error instanceof Error ? error.message : 'Unable to update template.');
        },
    });

    const quickToggleMutation = useMutation({
        mutationFn: async (input: { id: string; shared: boolean }) => updateTemplateRecord(input.id, { shared: input.shared }),
        onSuccess: async (_, input) => {
            notifySuccess(
                'Visibility updated',
                input.shared ? 'Template is now shared with the editorial team.' : 'Template is now private to your workspace.'
            );
            await invalidateTemplates();
        },
        onError: (error) => {
            notifyError('Template update failed', error instanceof Error ? error.message : 'Unable to change template visibility.');
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: async (record: TemplateRecord) => createTemplateRecord(duplicateTemplatePayload(record)),
        onSuccess: async (record) => {
            notifySuccess('Template duplicated', `"${record.name}" was copied into your private workspace.`);
            await invalidateTemplates();
        },
        onError: (error) => {
            notifyError('Duplicate failed', error instanceof Error ? error.message : 'Unable to duplicate template.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => deleteTemplateRecord(id),
        onSuccess: async () => {
            notifySuccess('Template deleted', 'The template was removed from the workspace.');
            if (editingId) {
                setEditingId(null);
                setForm(buildDefaultTemplateForm(canManageSharedTemplates));
            }
            await invalidateTemplates();
        },
        onError: (error) => {
            notifyError('Delete failed', error instanceof Error ? error.message : 'Unable to delete template.');
        },
    });

    const canEditTemplate = (record: TemplateRecord) =>
        canManageSharedTemplates || (!record.shared && Boolean(actorId) && record.createdBy === actorId);

    const canDeleteTemplate = (record: TemplateRecord) => canEditTemplate(record);

    const startEditing = (record: TemplateRecord) => {
        setEditingId(record.id);
        setForm({
            type: record.type,
            name: record.name,
            description: record.description ?? '',
            shared: canManageSharedTemplates ? Boolean(record.shared) : false,
            sections: (record.sections ?? []).join('\n'),
            payloadJson: JSON.stringify(record.payload ?? {}, null, 2),
        });
        notifyInfo('Edit mode enabled', `Editing template "${record.name}".`);
    };

    const resetEditor = () => {
        setEditingId(null);
        setForm(buildDefaultTemplateForm(canManageSharedTemplates));
    };

    const buildActions = (template: TemplateRecord): RowAction[] => {
        const actions: RowAction[] = [];

        if (canEditTemplate(template)) {
            actions.push({
                id: 'edit',
                label: 'Edit',
                onClick: () => startEditing(template),
            });
        }

        if (canWriteTemplates) {
            actions.push({
                id: 'duplicate',
                label: 'Duplicate',
                onClick: () => duplicateMutation.mutate(template),
                disabled: duplicateMutation.isPending,
            });
        }

        if (canManageSharedTemplates) {
            actions.push({
                id: 'visibility',
                label: template.shared ? 'Make private' : 'Make shared',
                onClick: () => quickToggleMutation.mutate({ id: template.id, shared: !template.shared }),
                disabled: quickToggleMutation.isPending,
                tone: template.shared ? 'warning' : 'info',
            });
        }

        if (canDeleteTemplate(template)) {
            actions.push({
                id: 'delete',
                label: 'Delete',
                onClick: () => deleteMutation.mutate(template.id),
                disabled: deleteMutation.isPending,
                tone: 'danger',
            });
        }

        return actions;
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    if (!canWriteTemplates) {
        return (
            <ModuleScaffold
                eyebrow="Publishing"
                title="Templates"
                description="Template management is limited to roles that can create editorial content."
            >
                <PermissionState
                    title="Template management requires content-write access."
                    description="You can still use shared templates from editorial workflows where your role allows them, but you cannot create or maintain template records from this workspace."
                />
            </ModuleScaffold>
        );
    }

    return (
        <ModuleScaffold
            eyebrow="Publishing"
            title="Templates"
            description="Maintain reusable editorial scaffolds, ownership-aware private drafts, and shared templates for the publishing desk."
            metrics={[
                { key: 'templates-total', label: 'Templates', value: templates.length },
                { key: 'templates-shared', label: 'Shared', value: sharedCount, tone: sharedCount > 0 ? 'info' : 'neutral' },
                { key: 'templates-private', label: 'Private', value: privateCount, tone: privateCount > 0 ? 'warning' : 'neutral' },
                { key: 'templates-used', label: 'Recently Used', value: recentlyUsedCount, tone: recentlyUsedCount > 0 ? 'success' : 'neutral' },
            ]}
            filters={{
                controls: (
                    <>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search template name or description"
                            aria-label="Search templates"
                        />
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value as AnnouncementTypeFilter | 'all')}
                            aria-label="Filter template type"
                        >
                            <option value="all">Type: All</option>
                            <option value="job">Job</option>
                            <option value="result">Result</option>
                            <option value="admit-card">Admit Card</option>
                            <option value="answer-key">Answer Key</option>
                            <option value="syllabus">Syllabus</option>
                            <option value="admission">Admission</option>
                        </select>
                        <select
                            value={sharedFilter}
                            onChange={(event) => setSharedFilter(event.target.value as SharedFilter)}
                            aria-label="Filter template visibility"
                        >
                            <option value="all">Visibility: All</option>
                            <option value="true">Shared</option>
                            <option value="false">Private</option>
                        </select>
                    </>
                ),
                actions: (
                    <>
                        <span className="ops-inline-muted">
                            {canManageSharedTemplates
                                ? 'Admins can curate shared templates. Editors keep private working copies.'
                                : 'You can create and manage private templates. Shared templates are curated by admins.'}
                        </span>
                        <button type="button" className="admin-btn small subtle" onClick={resetEditor}>
                            {editingId ? 'Cancel edit' : 'Reset form'}
                        </button>
                    </>
                ),
            }}
        >
            <div className="ops-stack">
                <OpsCard
                    title={editingId ? 'Edit Template' : 'Create Template'}
                    description="Templates feed directly into Create Post. Use private copies for experimentation and shared templates for standard desk workflows."
                >
                    <form
                        className="ops-form-grid"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (editingId) {
                                updateMutation.mutate();
                            } else {
                                createMutation.mutate();
                            }
                        }}
                    >
                        <select
                            value={form.type}
                            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AnnouncementTypeFilter }))}
                            aria-label="Template type"
                        >
                            <option value="job">Job</option>
                            <option value="result">Result</option>
                            <option value="admit-card">Admit Card</option>
                            <option value="answer-key">Answer Key</option>
                            <option value="syllabus">Syllabus</option>
                            <option value="admission">Admission</option>
                        </select>
                        <input
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Template name"
                            required
                            minLength={2}
                        />
                        <input
                            className="ops-span-full"
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Description (optional)"
                        />
                        <label className="ops-row">
                            <input
                                type="checkbox"
                                checked={canManageSharedTemplates ? form.shared : false}
                                onChange={(event) => setForm((current) => ({ ...current, shared: event.target.checked }))}
                                disabled={!canManageSharedTemplates}
                            />
                            <span>{canManageSharedTemplates ? 'Shared template' : 'Private template only for your role'}</span>
                        </label>
                        <textarea
                            className="ops-span-full"
                            value={form.sections}
                            onChange={(event) => setForm((current) => ({ ...current, sections: event.target.value }))}
                            placeholder="Section blocks (one per line): Important Dates, Application Fee, Age Limit..."
                        />
                        <textarea
                            className="ops-span-full ops-textarea"
                            value={form.payloadJson}
                            onChange={(event) => setForm((current) => ({ ...current, payloadJson: event.target.value }))}
                            placeholder='Template payload JSON, e.g. {"category":"Latest Jobs","tags":["state","graduate"]}'
                        />
                        <div className="ops-actions ops-span-full">
                            <button type="submit" className="admin-btn primary" disabled={isSubmitting}>
                                {isSubmitting ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Template' : 'Create Template')}
                            </button>
                            {editingId ? (
                                <button type="button" className="admin-btn" onClick={resetEditor}>
                                    Cancel
                                </button>
                            ) : null}
                        </div>
                    </form>
                </OpsCard>

                {query.isPending ? <div className="admin-alert info">Loading templates...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load templates." /> : null}
                {createMutation.error ? (
                    <OpsErrorState message={createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create template.'} />
                ) : null}
                {updateMutation.error ? (
                    <OpsErrorState message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update template.'} />
                ) : null}
                {deleteMutation.error ? (
                    <OpsErrorState message={deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Failed to delete template.'} />
                ) : null}

                {!query.isPending && !query.error && templates.length === 0 ? (
                    <OpsEmptyState message="No templates available: create private desk templates or curate shared publishing templates." />
                ) : null}

                {templates.length > 0 ? (
                    <OpsTable
                        columns={[
                            { key: 'name', label: 'Template' },
                            { key: 'type', label: 'Type' },
                            { key: 'visibility', label: 'Visibility' },
                            { key: 'usage', label: 'Usage' },
                            { key: 'updatedAt', label: 'Updated' },
                            { key: 'actions', label: 'Actions' },
                        ]}
                    >
                        {templates.map((template) => {
                            const actions = buildActions(template);
                            return (
                                <tr key={template.id}>
                                    <td>
                                        <strong>{template.name}</strong>
                                        <div className="ops-inline-muted">{template.description || 'No description'}</div>
                                        {!template.shared && template.createdBy === actorId ? (
                                            <div className="ops-inline-muted">Private working copy</div>
                                        ) : null}
                                    </td>
                                    <td>{template.type}</td>
                                    <td>
                                        <OpsBadge tone={template.shared ? 'info' : 'neutral'}>{sharedLabel(template.shared)}</OpsBadge>
                                    </td>
                                    <td>
                                        <div>{template.usageCount ?? 0} uses</div>
                                        <div className="ops-inline-muted">
                                            {template.lastUsedAt ? `Last used ${new Date(template.lastUsedAt).toLocaleString()}` : 'Not used yet'}
                                        </div>
                                    </td>
                                    <td>{template.updatedAt ? new Date(template.updatedAt).toLocaleString() : '-'}</td>
                                    <td>
                                        <div className="ops-actions">
                                            <Link
                                                to={`/create-post?template=${encodeURIComponent(template.id)}&type=${encodeURIComponent(template.type)}`}
                                                className="admin-btn small subtle"
                                            >
                                                Create Post
                                            </Link>
                                            {actions.length > 0 ? (
                                                <RowActionMenu itemLabel={template.name} actions={actions} />
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </OpsTable>
                ) : null}
            </div>
        </ModuleScaffold>
    );
}
