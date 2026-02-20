import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OpsBadge, OpsCard, OpsEmptyState, OpsErrorState, OpsTable, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import {
    createTemplateRecord,
    getTemplateRecords,
    updateTemplateRecord,
} from '../../lib/api/client';
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

const defaultTemplateForm: TemplateFormState = {
    type: 'job',
    name: '',
    description: '',
    shared: true,
    sections: '',
    payloadJson: '{}',
};

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

export function TemplatesModule() {
    const queryClient = useQueryClient();
    const { notifyError, notifyInfo, notifySuccess } = useAdminNotifications();

    const [typeFilter, setTypeFilter] = useState<AnnouncementTypeFilter | 'all'>('all');
    const [sharedFilter, setSharedFilter] = useState<SharedFilter>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<TemplateFormState>(defaultTemplateForm);

    const query = useQuery({
        queryKey: ['admin-templates', typeFilter, sharedFilter],
        queryFn: () => getTemplateRecords({ type: typeFilter, shared: sharedFilter, limit: 150 }),
    });

    const templates = useMemo(() => query.data?.data ?? [], [query.data]);

    const createMutation = useMutation({
        mutationFn: async () =>
            createTemplateRecord({
                type: form.type,
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                shared: form.shared,
                sections: parseSectionLines(form.sections),
                payload: parsePayloadJson(form.payloadJson),
            }),
        onSuccess: async (record) => {
            notifySuccess('Template created', `Template "${record.name}" is ready for speed posting.`);
            setForm(defaultTemplateForm);
            await queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
        },
        onError: (error) => {
            notifyError(
                'Create failed',
                error instanceof Error ? error.message : 'Unable to create template.'
            );
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
                shared: form.shared,
                sections: parseSectionLines(form.sections),
                payload: parsePayloadJson(form.payloadJson),
            });
        },
        onSuccess: async (record) => {
            notifySuccess('Template updated', `Updated "${record.name}".`);
            setEditingId(null);
            setForm(defaultTemplateForm);
            await queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
        },
        onError: (error) => {
            notifyError(
                'Update failed',
                error instanceof Error ? error.message : 'Unable to update template.'
            );
        },
    });

    const quickToggleMutation = useMutation({
        mutationFn: async (input: { id: string; shared: boolean }) => updateTemplateRecord(input.id, { shared: input.shared }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin-templates'] });
        },
        onError: (error) => {
            notifyError(
                'Template update failed',
                error instanceof Error ? error.message : 'Unable to change template visibility.'
            );
        },
    });

    const startEditing = (record: TemplateRecord) => {
        setEditingId(record.id);
        setForm({
            type: record.type,
            name: record.name,
            description: record.description ?? '',
            shared: Boolean(record.shared),
            sections: (record.sections ?? []).join('\n'),
            payloadJson: JSON.stringify(record.payload ?? {}, null, 2),
        });
        notifyInfo('Edit mode enabled', `Editing template "${record.name}".`);
    };

    const resetEditor = () => {
        setEditingId(null);
        setForm(defaultTemplateForm);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <OpsCard title="Templates" description="Create and maintain posting templates with reusable content blocks and payload defaults.">
            <OpsToolbar
                controls={(
                    <>
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
                )}
                actions={(
                    <>
                        <span className="ops-inline-muted">Templates: {templates.length}</span>
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={resetEditor}
                        >
                            {editingId ? 'Cancel edit' : 'Clear form'}
                        </button>
                    </>
                )}
            />

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
                        checked={form.shared}
                        onChange={(event) => setForm((current) => ({ ...current, shared: event.target.checked }))}
                    />
                    <span>Shared template</span>
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
                        {isSubmitting
                            ? (editingId ? 'Saving...' : 'Creating...')
                            : (editingId ? 'Save Template' : 'Create Template')}
                    </button>
                    {editingId ? (
                        <button type="button" className="admin-btn" onClick={resetEditor}>
                            Cancel
                        </button>
                    ) : null}
                </div>
            </form>

            {query.isPending ? <div className="admin-alert info">Loading templates...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load templates." /> : null}
            {createMutation.error ? (
                <OpsErrorState
                    message={createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create template.'}
                />
            ) : null}
            {updateMutation.error ? (
                <OpsErrorState
                    message={updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to update template.'}
                />
            ) : null}

            {!query.isPending && !query.error && templates.length === 0 ? (
                <OpsEmptyState message="No templates available: Create shared templates to speed up posting workflows." />
            ) : null}

            {templates.length > 0 ? (
                <OpsTable
                    columns={[
                        { key: 'name', label: 'Template' },
                        { key: 'type', label: 'Type' },
                        { key: 'visibility', label: 'Visibility' },
                        { key: 'sections', label: 'Sections' },
                        { key: 'updatedAt', label: 'Updated' },
                        { key: 'actions', label: 'Actions' },
                    ]}
                >
                    {templates.map((template) => (
                        <tr key={template.id}>
                            <td>
                                <strong>{template.name}</strong>
                                <div className="ops-inline-muted">{template.description || 'No description'}</div>
                            </td>
                            <td>{template.type}</td>
                            <td>
                                <OpsBadge tone={template.shared ? 'info' : 'neutral'}>{sharedLabel(template.shared)}</OpsBadge>
                            </td>
                            <td>{template.sections.length}</td>
                            <td>{template.updatedAt ? new Date(template.updatedAt).toLocaleString() : '-'}</td>
                            <td>
                                <div className="ops-actions">
                                    <button
                                        type="button"
                                        className="admin-btn small subtle"
                                        onClick={() => startEditing(template)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn small"
                                        disabled={quickToggleMutation.isPending}
                                        onClick={() => quickToggleMutation.mutate({
                                            id: template.id,
                                            shared: !template.shared,
                                        })}
                                    >
                                        {template.shared ? 'Make private' : 'Make shared'}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </OpsTable>
            ) : null}
        </OpsCard>
    );
}
