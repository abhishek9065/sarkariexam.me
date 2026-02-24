import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { OpsCard, OpsErrorState, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { createAdminAnnouncement } from '../../lib/api/client';

const defaultForm = {
    title: '',
    type: 'job',
    category: '',
    organization: '',
    content: '',
    status: 'draft',
    location: '',
    deadline: '',
    externalLink: '',
    minQualification: '',
    publishAt: '',
};

export function QuickAddModule() {
    const [form, setForm] = useState(defaultForm);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { notifyInfo } = useAdminNotifications();
    const visibilityHint = form.status === 'published'
        ? 'Published posts are visible on homepage (after cache refresh).'
        : form.status === 'scheduled'
            ? 'Scheduled posts appear only after publish time.'
            : 'Draft and pending posts are not visible on homepage.';

    const mutation = useMutation({
        mutationFn: () => {
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                type: form.type,
                category: form.category.trim(),
                organization: form.organization.trim(),
                status: form.status,
                content: form.content.trim() || undefined,
                location: form.location.trim() || undefined,
                externalLink: form.externalLink.trim() || undefined,
                minQualification: form.minQualification.trim() || undefined,
                deadline: form.deadline || undefined,
            };
            if (form.status === 'scheduled') {
                payload.publishAt = form.publishAt || undefined;
            }
            return createAdminAnnouncement(payload);
        },
        onSuccess: (data) => {
            const createdStatus = typeof data?.status === 'string' ? data.status : form.status;
            const visibilityMessage = createdStatus === 'published'
                ? 'It should appear on homepage shortly.'
                : 'Publish it to show on homepage.';
            setSuccessMessage(`Created announcement (${createdStatus}): ${data.title || 'Untitled'}. ${visibilityMessage}`);
            setForm(defaultForm);
            notifyInfo('Quick Add reset', 'Form reset for next announcement.');
        },
    });

    return (
        <OpsCard title="Quick Add" description="Fast posting flow for operations teams.">
            <OpsToolbar
                compact
                controls={
                    <>
                        <select
                            value={form.type}
                            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                        >
                            <option value="job">Type: Job</option>
                            <option value="result">Type: Result</option>
                            <option value="admit-card">Type: Admit Card</option>
                            <option value="syllabus">Type: Syllabus</option>
                            <option value="answer-key">Type: Answer Key</option>
                            <option value="admission">Type: Admission</option>
                        </select>
                        <select
                            value={form.status}
                            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                        >
                            <option value="draft">Status: Draft</option>
                            <option value="pending">Status: Pending</option>
                            <option value="scheduled">Status: Scheduled</option>
                            <option value="published">Status: Published</option>
                        </select>
                    </>
                }
                actions={
                    <>
                        <span className="ops-inline-muted">
                            {form.status === 'scheduled'
                                ? 'Publish time required before submit.'
                                : visibilityHint}
                        </span>
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={() => setForm(defaultForm)}
                        >
                            Reset form
                        </button>
                    </>
                }
            />
            <form
                className="ops-form-grid"
                onSubmit={(event) => {
                    event.preventDefault();
                    setSuccessMessage(null);
                    mutation.mutate();
                }}
            >
                <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Title"
                    required
                    minLength={10}
                    className="ops-span-full"
                />
                <input
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    placeholder="Category"
                    required
                />
                <input
                    value={form.organization}
                    onChange={(event) => setForm((current) => ({ ...current, organization: event.target.value }))}
                    placeholder="Organization"
                    required
                />
                <input
                    value={form.location}
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Location"
                />
                <input
                    type="date"
                    value={form.deadline}
                    onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
                />
                {form.status === 'scheduled' ? (
                    <input
                        type="datetime-local"
                        value={form.publishAt}
                        onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))}
                        required
                    />
                ) : null}
                <input
                    value={form.externalLink}
                    onChange={(event) => setForm((current) => ({ ...current, externalLink: event.target.value }))}
                    placeholder="External link (optional)"
                    className="ops-span-full"
                />
                <input
                    value={form.minQualification}
                    onChange={(event) => setForm((current) => ({ ...current, minQualification: event.target.value }))}
                    placeholder="Minimum qualification"
                    className="ops-span-full"
                />
                <textarea
                    value={form.content}
                    onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    placeholder="Content / summary"
                    className="ops-span-full ops-textarea"
                />
                <div className="ops-actions ops-span-full">
                    <button type="submit" className="admin-btn primary" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Creating...' : 'Create Announcement'}
                    </button>
                    <button type="button" className="admin-btn" onClick={() => setForm(defaultForm)}>
                        Reset
                    </button>
                </div>
            </form>
            {mutation.isError ? (
                <OpsErrorState message={mutation.error instanceof Error ? mutation.error.message : 'Failed to create announcement.'} />
            ) : null}
            {successMessage ? <div className="ops-success">{successMessage}</div> : null}
        </OpsCard>
    );
}
