import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

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
            setSuccessMessage(`Created announcement: ${data.title || 'Untitled'}`);
            setForm(defaultForm);
        },
    });

    return (
        <div className="admin-card">
            <h2>Quick Add</h2>
            <p className="admin-muted">Fast posting flow for operations teams.</p>
            <form
                style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
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
                    style={{ gridColumn: '1 / -1' }}
                />
                <select
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                >
                    <option value="job">Job</option>
                    <option value="result">Result</option>
                    <option value="admit-card">Admit Card</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="answer-key">Answer Key</option>
                    <option value="admission">Admission</option>
                </select>
                <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                </select>
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
                    style={{ gridColumn: '1 / -1' }}
                />
                <input
                    value={form.minQualification}
                    onChange={(event) => setForm((current) => ({ ...current, minQualification: event.target.value }))}
                    placeholder="Minimum qualification"
                    style={{ gridColumn: '1 / -1' }}
                />
                <textarea
                    value={form.content}
                    onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    placeholder="Content / summary"
                    style={{ gridColumn: '1 / -1', minHeight: 140, border: '1px solid #d6dde3', borderRadius: 8, padding: 10 }}
                />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                    <button type="submit" className="admin-btn primary" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Creating...' : 'Create Announcement'}
                    </button>
                    <button type="button" className="admin-btn" onClick={() => setForm(defaultForm)}>
                        Reset
                    </button>
                </div>
            </form>
            {mutation.isError ? (
                <div style={{ color: '#b91c1c', marginTop: 10 }}>
                    {mutation.error instanceof Error ? mutation.error.message : 'Failed to create announcement.'}
                </div>
            ) : null}
            {successMessage ? <div style={{ color: '#166534', marginTop: 10 }}>{successMessage}</div> : null}
        </div>
    );
}
