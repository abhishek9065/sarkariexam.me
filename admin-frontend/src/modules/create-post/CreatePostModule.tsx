import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { OpsCard, OpsErrorState, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { createAdminContentRecord, getTemplateRecords } from '../../lib/api/client';
import type { AnnouncementTypeFilter, TemplateRecord } from '../../types';

type FormState = {
    title: string;
    type: AnnouncementTypeFilter;
    category: string;
    organization: string;
    summary: string;
    status: 'draft' | 'pending' | 'scheduled' | 'published';
    deadline: string;
    publishAt: string;
    externalLink: string;
    tags: string;
    importantDates: string;
    applicationFee: string;
    ageLimit: string;
    vacancyDetails: string;
    eligibility: string;
    selectionProcess: string;
    salary: string;
    resultType: string;
    resultDate: string;
    admitCardReleaseDate: string;
    examDate: string;
    objectionStart: string;
    objectionEnd: string;
    syllabusMarks: string;
    counselingDates: string;
};

const defaultForm: FormState = {
    title: '',
    type: 'job',
    category: '',
    organization: '',
    summary: '',
    status: 'draft',
    deadline: '',
    publishAt: '',
    externalLink: '',
    tags: '',
    importantDates: '',
    applicationFee: '',
    ageLimit: '',
    vacancyDetails: '',
    eligibility: '',
    selectionProcess: '',
    salary: '',
    resultType: '',
    resultDate: '',
    admitCardReleaseDate: '',
    examDate: '',
    objectionStart: '',
    objectionEnd: '',
    syllabusMarks: '',
    counselingDates: '',
};

const parseLines = (input: string) => input
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const buildTypeDetails = (form: FormState): Record<string, unknown> => {
    if (form.type === 'job') {
        return {
            importantDates: parseLines(form.importantDates),
            applicationFee: form.applicationFee.trim() || undefined,
            ageLimit: form.ageLimit.trim() || undefined,
            vacancyDetails: form.vacancyDetails.trim() || undefined,
            eligibility: form.eligibility.trim() || undefined,
            selectionProcess: form.selectionProcess.trim() || undefined,
            salary: form.salary.trim() || undefined,
        };
    }
    if (form.type === 'result') {
        return {
            resultType: form.resultType.trim() || undefined,
            resultDate: form.resultDate || undefined,
        };
    }
    if (form.type === 'admit-card') {
        return {
            examDate: form.examDate || undefined,
            releaseDate: form.admitCardReleaseDate || undefined,
        };
    }
    if (form.type === 'answer-key') {
        return {
            objectionStart: form.objectionStart || undefined,
            objectionEnd: form.objectionEnd || undefined,
        };
    }
    if (form.type === 'syllabus') {
        return {
            marksBreakdown: form.syllabusMarks.trim() || undefined,
        };
    }
    return {
        counselingDates: form.counselingDates.trim() || undefined,
    };
};

const typeCategoryDefaults: Record<AnnouncementTypeFilter, string> = {
    job: 'Latest Jobs',
    result: 'Results',
    'admit-card': 'Admit Card',
    'answer-key': 'Answer Key',
    syllabus: 'Syllabus',
    admission: 'Admission',
};

export function CreatePostModule() {
    const queryClient = useQueryClient();
    const { notifyInfo, notifySuccess } = useAdminNotifications();

    const [form, setForm] = useState<FormState>(defaultForm);
    const [templateId, setTemplateId] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const templatesQuery = useQuery({
        queryKey: ['admin-templates', form.type],
        queryFn: () => getTemplateRecords({ type: form.type, limit: 50, shared: 'all' }),
    });

    const templateOptions = useMemo(
        () => templatesQuery.data?.data ?? [],
        [templatesQuery.data]
    );

    const selectedTemplate = useMemo(
        () => templateOptions.find((item) => item.id === templateId),
        [templateId, templateOptions]
    );

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload: Record<string, unknown> = {
                title: form.title.trim(),
                type: form.type,
                category: form.category.trim(),
                organization: form.organization.trim(),
                content: form.summary.trim() || undefined,
                status: form.status,
                deadline: form.deadline || undefined,
                publishAt: form.status === 'scheduled' ? (form.publishAt || undefined) : undefined,
                externalLink: form.externalLink.trim() || undefined,
                tags: parseLines(form.tags.replace(/,/g, '\n')),
                typeDetails: buildTypeDetails(form),
            };

            return createAdminContentRecord(payload);
        },
        onSuccess: async (data) => {
            setSuccess(`Created ${data.type} post: ${data.title}`);
            setForm(defaultForm);
            setTemplateId('');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
            ]);
            notifySuccess('Post created', 'Content is now in workflow queue.');
        },
    });

    const applyTemplate = (template: TemplateRecord) => {
        const payload = template.payload ?? {};
        setForm((current) => ({
            ...current,
            category: String(payload.category ?? (current.category || typeCategoryDefaults[current.type])),
            summary: String(payload.summary ?? current.summary),
            tags: Array.isArray(payload.tags) ? (payload.tags as string[]).join('\n') : current.tags,
            importantDates: Array.isArray(payload.importantDates) ? (payload.importantDates as string[]).join('\n') : current.importantDates,
            applicationFee: String(payload.applicationFee ?? current.applicationFee),
            ageLimit: String(payload.ageLimit ?? current.ageLimit),
            vacancyDetails: String(payload.vacancyDetails ?? current.vacancyDetails),
            eligibility: String(payload.eligibility ?? current.eligibility),
            selectionProcess: String(payload.selectionProcess ?? current.selectionProcess),
            salary: String(payload.salary ?? current.salary),
        }));
        notifyInfo('Template applied', `Applied template: ${template.name}`);
    };

    return (
        <OpsCard title="Create Post" description="Unified create flow for Job, Result, Admit Card, Answer Key, Syllabus, and Admission.">
            <OpsToolbar
                controls={(
                    <>
                        <select
                            value={form.type}
                            onChange={(event) => {
                                const nextType = event.target.value as AnnouncementTypeFilter;
                                setForm((current) => ({
                                    ...current,
                                    type: nextType,
                                    category: current.category || typeCategoryDefaults[nextType],
                                }));
                            }}
                        >
                            <option value="job">Job</option>
                            <option value="result">Result</option>
                            <option value="admit-card">Admit Card</option>
                            <option value="answer-key">Answer Key</option>
                            <option value="syllabus">Syllabus</option>
                            <option value="admission">Admission</option>
                        </select>
                        <select
                            value={form.status}
                            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FormState['status'] }))}
                        >
                            <option value="draft">Draft</option>
                            <option value="pending">Pending Review</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                        </select>
                        <select
                            value={templateId}
                            onChange={(event) => {
                                setTemplateId(event.target.value);
                                const template = templateOptions.find((item) => item.id === event.target.value);
                                if (template) applyTemplate(template);
                            }}
                        >
                            <option value="">Template: none</option>
                            {templateOptions.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                    </>
                )}
                actions={(
                    <>
                        <span className="ops-inline-muted">
                            Review gate is active for high-risk publishing actions.
                        </span>
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={() => {
                                setForm(defaultForm);
                                setTemplateId('');
                                setSuccess('');
                            }}
                        >
                            Reset form
                        </button>
                        <button
                            type="button"
                            className="admin-btn small"
                            onClick={() => setForm((current) => ({
                                ...current,
                                summary: `${current.summary}\n\nImportant Dates:\n- Start Date:\n- Last Date:\n\nApplication Fee:\n- General:\n- OBC:\n- SC/ST:\n\nAge Limit:\n- Minimum:\n- Maximum:\n\nImportant Links:\n- Apply Online:\n- Notification PDF:`,
                            }))}
                        >
                            Insert standard sections
                        </button>
                        <Link to="/templates" className="admin-btn small subtle">
                            Manage templates
                        </Link>
                    </>
                )}
            />

            <form
                className="ops-form-grid"
                onSubmit={(event) => {
                    event.preventDefault();
                    setSuccess('');
                    createMutation.mutate();
                }}
            >
                <input
                    className="ops-span-full"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Post title"
                    minLength={10}
                    required
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
                    className="ops-span-full"
                    value={form.externalLink}
                    onChange={(event) => setForm((current) => ({ ...current, externalLink: event.target.value }))}
                    placeholder="Primary external link (Apply / Result / Download)"
                />
                <textarea
                    className="ops-span-full ops-textarea"
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Main post content / summary"
                />
                <textarea
                    className="ops-span-full"
                    value={form.tags}
                    onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                    placeholder="Tags (one per line or comma-separated)"
                />

                {form.type === 'job' ? (
                    <>
                        <textarea
                            value={form.importantDates}
                            onChange={(event) => setForm((current) => ({ ...current, importantDates: event.target.value }))}
                            placeholder="Important dates (one per line)"
                        />
                        <input
                            value={form.applicationFee}
                            onChange={(event) => setForm((current) => ({ ...current, applicationFee: event.target.value }))}
                            placeholder="Application fee details"
                        />
                        <input
                            value={form.ageLimit}
                            onChange={(event) => setForm((current) => ({ ...current, ageLimit: event.target.value }))}
                            placeholder="Age limit + relaxation"
                        />
                        <input
                            value={form.salary}
                            onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
                            placeholder="Salary / Pay level"
                        />
                        <textarea
                            value={form.vacancyDetails}
                            onChange={(event) => setForm((current) => ({ ...current, vacancyDetails: event.target.value }))}
                            placeholder="Vacancy table / details"
                        />
                        <textarea
                            value={form.eligibility}
                            onChange={(event) => setForm((current) => ({ ...current, eligibility: event.target.value }))}
                            placeholder="Eligibility / qualification"
                        />
                        <textarea
                            className="ops-span-full"
                            value={form.selectionProcess}
                            onChange={(event) => setForm((current) => ({ ...current, selectionProcess: event.target.value }))}
                            placeholder="Selection process"
                        />
                    </>
                ) : null}

                {form.type === 'result' ? (
                    <>
                        <input
                            value={form.resultType}
                            onChange={(event) => setForm((current) => ({ ...current, resultType: event.target.value }))}
                            placeholder="Result type (Final / Tier-1 / Merit)"
                        />
                        <input
                            type="date"
                            value={form.resultDate}
                            onChange={(event) => setForm((current) => ({ ...current, resultDate: event.target.value }))}
                        />
                    </>
                ) : null}

                {form.type === 'admit-card' ? (
                    <>
                        <input
                            type="date"
                            value={form.examDate}
                            onChange={(event) => setForm((current) => ({ ...current, examDate: event.target.value }))}
                        />
                        <input
                            type="date"
                            value={form.admitCardReleaseDate}
                            onChange={(event) => setForm((current) => ({ ...current, admitCardReleaseDate: event.target.value }))}
                        />
                    </>
                ) : null}

                {form.type === 'answer-key' ? (
                    <>
                        <input
                            type="datetime-local"
                            value={form.objectionStart}
                            onChange={(event) => setForm((current) => ({ ...current, objectionStart: event.target.value }))}
                        />
                        <input
                            type="datetime-local"
                            value={form.objectionEnd}
                            onChange={(event) => setForm((current) => ({ ...current, objectionEnd: event.target.value }))}
                        />
                    </>
                ) : null}

                {form.type === 'syllabus' ? (
                    <textarea
                        className="ops-span-full"
                        value={form.syllabusMarks}
                        onChange={(event) => setForm((current) => ({ ...current, syllabusMarks: event.target.value }))}
                        placeholder="Section and marks breakdown"
                    />
                ) : null}

                {form.type === 'admission' ? (
                    <textarea
                        className="ops-span-full"
                        value={form.counselingDates}
                        onChange={(event) => setForm((current) => ({ ...current, counselingDates: event.target.value }))}
                        placeholder="Counselling / admission timeline"
                    />
                ) : null}

                <div className="ops-actions ops-span-full">
                    <button type="submit" className="admin-btn primary" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Creating...' : 'Create Post'}
                    </button>
                    <button type="button" className="admin-btn" onClick={() => setForm(defaultForm)}>
                        Clear
                    </button>
                </div>
            </form>

            {createMutation.isError ? (
                <OpsErrorState message={createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create post.'} />
            ) : null}
            {success ? <div className="ops-success">{success}</div> : null}
            {selectedTemplate ? (
                <div className="admin-alert info">Using template: {selectedTemplate.name}</div>
            ) : null}
        </OpsCard>
    );
}
