import { useCallback, useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { useAdminAuth } from '../../app/useAdminAuth';
import { AdminStepUpCard } from '../../components/AdminStepUpCard';
import { OpsCard, OpsErrorState, OpsToolbar } from '../../components/ops';
import { useAdminNotifications } from '../../components/ops/legacy-port';
import { ModuleScaffold } from '../../components/workspace';
import {
    autosaveAnnouncementDraft,
    createAdminContentRecord,
    createAnnouncementDraft,
    getRecentEditorDrafts,
    getTemplateRecords,
} from '../../lib/api/client';
import type { AdminAutosavePayload, AdminDraftRecord, AnnouncementTypeFilter, TemplateRecord } from '../../types';

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
    applyOnlineLink: string;
    notificationPdfLink: string;
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
    applyOnlineLink: '',
    notificationPdfLink: '',
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

const toImportantLinkRecords = (form: FormState) => {
    if (form.type !== 'job') return [];
    return [
        form.applyOnlineLink.trim()
            ? { label: 'Apply Online', url: form.applyOnlineLink.trim(), type: 'apply' }
            : null,
        form.notificationPdfLink.trim()
            ? { label: 'Notification PDF', url: form.notificationPdfLink.trim(), type: 'notification' }
            : null,
    ].filter(Boolean);
};

const getPublishValidationMessage = (form: FormState): string | null => {
    if (!['published', 'scheduled'].includes(form.status)) return null;
    if (form.type === 'job') {
        if (!form.applyOnlineLink.trim() && !form.externalLink.trim()) {
            return 'Add an Apply Online link before publishing or scheduling a Job post.';
        }
        if (!form.notificationPdfLink.trim()) {
            return 'Add a Notification PDF link before publishing or scheduling a Job post.';
        }
        if (!parseLines(form.importantDates).length) {
            return 'Add Important Dates before publishing or scheduling a Job post.';
        }
        if (!form.deadline) {
            return 'Add the application deadline before publishing or scheduling a Job post.';
        }
        if (!form.eligibility.trim()) {
            return 'Add Eligibility / Qualification details before publishing or scheduling a Job post.';
        }
    }
    return null;
};

const mapCreateErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        const raw = error.message.trim();
        if (!raw) return 'Failed to create post.';
        if (raw.startsWith('Validation failed for')) {
            const detail = raw.split(': ').slice(1).join(': ').replace(/^[A-Z_]+:\s*/, '').trim();
            return detail || raw;
        }
        return raw.replace(/^[A-Z_]+:\s*/, '');
    }
    return 'Failed to create post.';
};

const buildTypeDetails = (form: FormState): Record<string, unknown> => {
    if (form.type === 'job') {
        return {
            importantDates: parseLines(form.importantDates),
            importantLinks: toImportantLinkRecords(form),
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

const buildPersistedTypeDetails = (form: FormState, templateId?: string): Record<string, unknown> => ({
    ...buildTypeDetails(form),
    ...(templateId ? { templateId } : {}),
});

const typeCategoryDefaults: Record<AnnouncementTypeFilter, string> = {
    job: 'Latest Jobs',
    result: 'Results',
    'admit-card': 'Admit Card',
    'answer-key': 'Answer Key',
    syllabus: 'Syllabus',
    admission: 'Admission',
};

const resetTypeSpecificFields = (current: FormState, nextType: AnnouncementTypeFilter): FormState => ({
    ...current,
    type: nextType,
    category: typeCategoryDefaults[nextType],
    importantDates: '',
    applyOnlineLink: '',
    notificationPdfLink: '',
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
});

const buildDraftAutosavePayload = (form: FormState, templateId?: string): AdminAutosavePayload => ({
    title: form.title.trim(),
    type: form.type,
    category: form.category.trim(),
    organization: form.organization.trim(),
    content: form.summary.trim() || undefined,
    externalLink: form.externalLink.trim() || undefined,
    deadline: form.deadline || undefined,
    tags: parseLines(form.tags.replace(/,/g, '\n')),
    typeDetails: buildPersistedTypeDetails(form, templateId),
});

export function CreatePostModule() {
    const queryClient = useQueryClient();
    const { notifyInfo, notifySuccess } = useAdminNotifications();
    const { hasValidStepUp, stepUpToken } = useAdminAuth();
    const [searchParams] = useSearchParams();

    const [form, setForm] = useState<FormState>(defaultForm);
    const [templateId, setTemplateId] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [draftShell, setDraftShell] = useState<AdminDraftRecord | null>(null);
    const [autosaveEnabled, setAutosaveEnabled] = useState(true);
    const [lastAutosaveAt, setLastAutosaveAt] = useState<string>('');
    const [lastSavedFingerprint, setLastSavedFingerprint] = useState('');
    const [editorSessionId] = useState(() => `create-post-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const requestedTemplateId = searchParams.get('template')?.trim() ?? '';
    const requestedTemplateTypeParam = searchParams.get('type')?.trim();
    const requestedTemplateType = requestedTemplateTypeParam && Object.hasOwn(typeCategoryDefaults, requestedTemplateTypeParam)
        ? requestedTemplateTypeParam as AnnouncementTypeFilter
        : null;

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

    const recentDraftsQuery = useQuery({
        queryKey: ['admin-editor-drafts', form.type],
        queryFn: () => getRecentEditorDrafts({ type: form.type, limit: 5 }),
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const requiresPublishStepUp = form.status === 'published';
            const publishValidationMessage = getPublishValidationMessage(form);
            if (publishValidationMessage) {
                throw new Error(publishValidationMessage);
            }
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
                typeDetails: buildPersistedTypeDetails(form, templateId || undefined),
                templateId: templateId || undefined,
            };

            if (requiresPublishStepUp && (!hasValidStepUp || !stepUpToken)) {
                throw new Error('Step-up verification is required before creating a published post.');
            }

            return createAdminContentRecord(payload, requiresPublishStepUp ? stepUpToken ?? undefined : undefined);
        },
        onSuccess: async (data) => {
            setSuccess(`Created ${data.type} post: ${data.title}`);
            setForm(defaultForm);
            setTemplateId('');
            setDraftShell(null);
            setLastAutosaveAt('');
            setLastSavedFingerprint('');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-editor-drafts'] }),
            ]);
            notifySuccess('Post created', 'Content is now in workflow queue.');
        },
        onError: (error) => {
            const message = mapCreateErrorMessage(error);
            notifyInfo('Create post blocked', message);
        },
    });

    const startDraftMutation = useMutation({
        mutationFn: async () => createAnnouncementDraft({
            type: form.type,
            title: form.title.trim() || undefined,
            category: form.category.trim() || undefined,
            organization: form.organization.trim() || undefined,
            templateId: templateId || undefined,
        }),
        onSuccess: async (draft) => {
            setDraftShell(draft);
            setForm((current) => ({ ...current, status: 'draft' }));
            setLastAutosaveAt(draft.updatedAt ?? new Date().toISOString());
            setLastSavedFingerprint('');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-editor-drafts'] }),
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard-v3'] }),
            ]);
            notifySuccess('Draft shell started', 'This editor now autosaves into a draft record you can continue in Detailed Post.');
        },
        onError: (error) => {
            notifyInfo('Draft shell blocked', mapCreateErrorMessage(error));
        },
    });

    const autosaveMutation = useMutation({
        mutationFn: async () => {
            if (!draftShell?.id) {
                throw new Error('Missing draft shell for autosave.');
            }
            return autosaveAnnouncementDraft(draftShell.id, {
                ...buildDraftAutosavePayload(form, templateId || undefined),
                autosave: {
                    editorSessionId,
                    clientUpdatedAt: new Date().toISOString(),
                },
            });
        },
        onSuccess: async (data) => {
            setLastAutosaveAt(data.updatedAt ?? new Date().toISOString());
            setLastSavedFingerprint(autosaveFingerprint);
            await queryClient.invalidateQueries({ queryKey: ['admin-editor-drafts'] });
        },
        onError: (error) => {
            notifyInfo('Autosave paused', mapCreateErrorMessage(error));
        },
    });

    const applyTemplate = useCallback((template: TemplateRecord) => {
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
            applyOnlineLink: Array.isArray(payload.importantLinks)
                ? String((payload.importantLinks as Array<Record<string, unknown>>).find((item) => String(item.type ?? '').includes('apply'))?.url ?? current.applyOnlineLink)
                : current.applyOnlineLink,
            notificationPdfLink: Array.isArray(payload.importantLinks)
                ? String((payload.importantLinks as Array<Record<string, unknown>>).find((item) => String(item.type ?? '').includes('notification'))?.url ?? current.notificationPdfLink)
                : current.notificationPdfLink,
        }));
        notifyInfo('Template applied', `Applied template: ${template.name}`);
    }, [notifyInfo]);

    const recentDrafts = useMemo(
        () => recentDraftsQuery.data?.data ?? [],
        [recentDraftsQuery.data]
    );

    const autosaveFingerprint = useMemo(() => {
        if (!draftShell?.id) return '';
        return JSON.stringify({
            templateId: templateId || null,
            payload: buildDraftAutosavePayload(form, templateId || undefined),
        });
    }, [draftShell?.id, form, templateId]);

    const draftEditorRoute = draftShell ? `/detailed-post?focus=${encodeURIComponent(draftShell.id)}` : '';

    const resetComposer = useCallback(() => {
        setForm(defaultForm);
        setTemplateId('');
        setSuccess('');
        setDraftShell(null);
        setAutosaveEnabled(true);
        setLastAutosaveAt('');
        setLastSavedFingerprint('');
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
                event.preventDefault();
                if (draftShell?.id && autosaveEnabled && !autosaveMutation.isPending) {
                    autosaveMutation.mutate();
                    return;
                }
                if (!draftShell?.id && !createMutation.isPending && form.title && form.category && form.organization) {
                    createMutation.mutate();
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [autosaveEnabled, autosaveMutation, createMutation, draftShell?.id, form.title, form.category, form.organization]);

    useEffect(() => {
        if (!requestedTemplateType) return;
        if (form.type === requestedTemplateType) return;
        setForm((current) => resetTypeSpecificFields(current, requestedTemplateType));
        setTemplateId('');
    }, [form.type, requestedTemplateType]);

    useEffect(() => {
        if (!requestedTemplateId || templateOptions.length === 0) return;
        if (templateId === requestedTemplateId) return;
        const template = templateOptions.find((item) => item.id === requestedTemplateId);
        if (!template) return;
        setTemplateId(template.id);
        applyTemplate(template);
    }, [applyTemplate, requestedTemplateId, templateId, templateOptions]);

    useEffect(() => {
        if (!draftShell?.id || !autosaveEnabled) return;
        if (!autosaveFingerprint || autosaveFingerprint === lastSavedFingerprint) return;
        if (autosaveMutation.isPending || startDraftMutation.isPending) return;

        const timeout = window.setTimeout(() => {
            autosaveMutation.mutate();
        }, 1200);

        return () => window.clearTimeout(timeout);
    }, [
        autosaveEnabled,
        autosaveFingerprint,
        autosaveMutation,
        draftShell?.id,
        lastSavedFingerprint,
        startDraftMutation.isPending,
    ]);

    const publishValidationMessage = getPublishValidationMessage(form);

    return (
        <>
            <AdminStepUpCard
                title="Step-up Verification"
                description="Required before creating published posts from Create Post."
            />
            <ModuleScaffold
                eyebrow="Content Desk"
                title="Create Post"
                description="Open the main SarkariExams create flow for Jobs, Results, Admit Cards, Answer Keys, Syllabus, and Admissions."
                metrics={[
                    { key: 'type', label: 'Type', value: form.type, hint: 'The editor adapts fields and template options.' },
                    { key: 'status', label: 'Workflow status', value: form.status, hint: 'Published posts require active step-up.' },
                    { key: 'template', label: 'Template', value: selectedTemplate?.name ?? 'None', hint: 'Templates prefill the post structure.' },
                    { key: 'draft-shell', label: 'Draft shell', value: draftShell ? 'Active' : 'Not started', hint: draftShell ? 'Changes now autosave into a recoverable draft.' : 'Start a draft shell to preserve in-progress work.' },
                    { key: 'autosave', label: 'Autosave', value: draftShell ? (autosaveEnabled ? 'On' : 'Paused') : 'Draft required', hint: lastAutosaveAt ? `Last autosave ${new Date(lastAutosaveAt).toLocaleString()}` : 'Autosave activates after a draft shell is created.' },
                ]}
                headerActions={(
                    <>
                        <button type="button" className="admin-btn subtle" onClick={resetComposer}>
                            Reset editor
                        </button>
                        {draftShell ? (
                            <Link to={draftEditorRoute} className="admin-btn primary">
                                Open deep editor
                            </Link>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="admin-btn"
                                    onClick={() => startDraftMutation.mutate()}
                                    disabled={!form.title || !form.category || !form.organization || startDraftMutation.isPending}
                                >
                                    {startDraftMutation.isPending ? 'Starting draft...' : 'Start draft shell'}
                                </button>
                                <button
                                    type="button"
                                    className="admin-btn primary"
                                    onClick={() => createMutation.mutate()}
                                    disabled={!form.title || !form.category || !form.organization || createMutation.isPending}
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create post'}
                                </button>
                            </>
                        )}
                    </>
                )}
            >
                <OpsToolbar
                    controls={(
                        <>
                            <select
                                value={form.type}
                                disabled={Boolean(draftShell)}
                                onChange={(event) => {
                                    const nextType = event.target.value as AnnouncementTypeFilter;
                                    setForm((current) => resetTypeSpecificFields(current, nextType));
                                setTemplateId('');
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
                            {draftShell
                                ? `Draft shell active${lastAutosaveAt ? ` | Last autosave ${new Date(lastAutosaveAt).toLocaleTimeString()}` : ''}`
                                : form.status === 'published' && !hasValidStepUp
                                ? 'Verify step-up first, then create published post.'
                                : 'Review gate is active for high-risk publishing actions.'}
                        </span>
                        <button
                            type="button"
                            className="admin-btn small subtle"
                            onClick={resetComposer}
                        >
                            Reset form
                        </button>
                        {draftShell ? (
                            <button
                                type="button"
                                className="admin-btn small subtle"
                                onClick={() => setAutosaveEnabled((current) => !current)}
                            >
                                {autosaveEnabled ? 'Pause autosave' : 'Resume autosave'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="admin-btn small subtle"
                                onClick={() => startDraftMutation.mutate()}
                                disabled={!form.title || !form.category || !form.organization || startDraftMutation.isPending}
                            >
                                {startDraftMutation.isPending ? 'Starting draft...' : 'Start draft shell'}
                            </button>
                        )}
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
                className="ops-editor-layout"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (draftShell?.id) {
                        return;
                    }
                    setSuccess('');
                    createMutation.mutate();
                }}
            >
                <div className="ops-editor-main">
                    <input
                        className="ops-span-full"
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Post title"
                        minLength={10}
                        required
                    />
                    <div className="ops-form-grid">
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
                    </div>
                    <div className="ops-form-grid">
                        <div>
                            <label className="ops-label">Deadline</label>
                            <input
                                type="date"
                                value={form.deadline}
                                onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
                                aria-label="Application deadline"
                            />
                        </div>
                        {form.status === 'scheduled' ? (
                            <div>
                                <label className="ops-label">Scheduled Publish</label>
                                <input
                                    type="datetime-local"
                                    value={form.publishAt}
                                    onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))}
                                    aria-label="Scheduled publish date"
                                    required
                                />
                            </div>
                        ) : null}
                    </div>
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
                    <div className={`ops-char-counter ops-span-full${form.summary.length > 1000 ? ' danger' : form.summary.length > 800 ? ' warning' : ''}`}>
                        {form.summary.length} / 1,000 chars
                    </div>
                    <textarea
                        className="ops-span-full"
                        value={form.tags}
                        onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                        placeholder="Tags (one per line or comma-separated)"
                    />
                    <div className={`ops-char-counter ops-span-full${form.tags.length > 500 ? ' danger' : form.tags.length > 400 ? ' warning' : ''}`}>
                        {form.tags.length} / 500 chars
                    </div>

                    {form.type === 'job' ? (
                        <>
                            <input
                                value={form.applyOnlineLink}
                                onChange={(event) => setForm((current) => ({ ...current, applyOnlineLink: event.target.value }))}
                                placeholder="Apply Online link"
                            />
                            <input
                                value={form.notificationPdfLink}
                                onChange={(event) => setForm((current) => ({ ...current, notificationPdfLink: event.target.value }))}
                                placeholder="Notification PDF link"
                            />
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
                            <div>
                                <label className="ops-label">Result Date</label>
                                <input
                                    type="date"
                                    value={form.resultDate}
                                    onChange={(event) => setForm((current) => ({ ...current, resultDate: event.target.value }))}
                                    aria-label="Result date"
                                />
                            </div>
                        </>
                    ) : null}

                    {form.type === 'admit-card' ? (
                        <>
                            <div>
                                <label className="ops-label">Exam Date</label>
                                <input
                                    type="date"
                                    value={form.examDate}
                                    onChange={(event) => setForm((current) => ({ ...current, examDate: event.target.value }))}
                                    aria-label="Exam date"
                                />
                            </div>
                            <div>
                                <label className="ops-label">Admit Card Release</label>
                                <input
                                    type="date"
                                    value={form.admitCardReleaseDate}
                                    onChange={(event) => setForm((current) => ({ ...current, admitCardReleaseDate: event.target.value }))}
                                    aria-label="Admit card release date"
                                />
                            </div>
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

                </div>

                <div className="ops-editor-rail">
                    <OpsCard title="Publish Checklist" tone="muted">
                        <div className="ops-stack">
                            <select
                                value={form.status}
                                disabled={Boolean(draftShell)}
                                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FormState['status'] }))}
                                className="ops-span-full"
                            >
                                <option value="draft">Draft</option>
                                <option value="pending">Pending Review</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="published">Published</option>
                            </select>

                            <div className="ops-row">
                                <input type="checkbox" checked={Boolean(form.title && form.category && form.organization)} readOnly />
                                <span className="ops-inline-muted">Basic info complete</span>
                            </div>
                            <div className="ops-row">
                                <input type="checkbox" checked={Boolean(form.summary)} readOnly />
                                <span className="ops-inline-muted">Summary provided</span>
                            </div>
                            {form.type === 'job' ? (
                                <>
                                    <div className="ops-row">
                                        <input type="checkbox" checked={Boolean(form.applyOnlineLink.trim() || form.externalLink.trim())} readOnly />
                                        <span className="ops-inline-muted">Apply Online link added</span>
                                    </div>
                                    <div className="ops-row">
                                        <input type="checkbox" checked={Boolean(form.notificationPdfLink.trim())} readOnly />
                                        <span className="ops-inline-muted">Notification PDF link added</span>
                                    </div>
                                    <div className="ops-row">
                                        <input type="checkbox" checked={Boolean(parseLines(form.importantDates).length)} readOnly />
                                        <span className="ops-inline-muted">Important Dates added</span>
                                    </div>
                                    <div className="ops-row">
                                        <input type="checkbox" checked={Boolean(form.eligibility.trim())} readOnly />
                                        <span className="ops-inline-muted">Eligibility added</span>
                                    </div>
                                </>
                            ) : null}
                            {publishValidationMessage ? (
                                <div className="admin-alert warning">{publishValidationMessage}</div>
                            ) : null}

                            {draftShell ? (
                                <div className="admin-alert info">
                                    Draft shell active. Changes autosave into this draft and can be resumed in Detailed Post.
                                </div>
                            ) : null}

                            <div className="ops-inline-muted">
                                {draftShell
                                    ? `Autosave: ${autosaveEnabled ? 'On' : 'Paused'}${autosaveMutation.isPending ? ' | Saving…' : ''}${lastAutosaveAt ? ` | Last saved ${new Date(lastAutosaveAt).toLocaleTimeString()}` : ''}`
                                    : 'Use Start draft shell when you want recoverable in-progress work and a deep-editor handoff.'}
                            </div>

                            <div className="ops-actions">
                                {draftShell ? (
                                    <>
                                        <Link to={draftEditorRoute} className="admin-btn primary">
                                            Open Deep Editor
                                        </Link>
                                        <button
                                            type="button"
                                            className="admin-btn subtle"
                                            onClick={() => autosaveMutation.mutate()}
                                            disabled={!autosaveEnabled || autosaveMutation.isPending}
                                        >
                                            {autosaveMutation.isPending ? 'Saving...' : 'Save now'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="submit" className="admin-btn primary">
                                            {createMutation.isPending ? 'Creating...' : 'Create Post'}
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-btn subtle"
                                            onClick={() => startDraftMutation.mutate()}
                                            disabled={!form.title || !form.category || !form.organization || startDraftMutation.isPending}
                                        >
                                            {startDraftMutation.isPending ? 'Starting draft...' : 'Start Draft Shell'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </OpsCard>

                    <OpsCard title="Recent Draft Sessions" tone="muted">
                        <div className="ops-stack">
                            {recentDraftsQuery.isPending ? <div className="ops-inline-muted">Loading recent drafts...</div> : null}
                            {recentDraftsQuery.isError ? <div className="admin-alert warning">Recent draft sessions could not be loaded.</div> : null}
                            {!recentDraftsQuery.isPending && !recentDraftsQuery.isError && recentDrafts.length === 0 ? (
                                <div className="ops-inline-muted">No recent draft sessions for this content type.</div>
                            ) : null}
                            {recentDrafts.map((draft) => (
                                <div key={draft.id} className="ops-card">
                                    <div className="ops-stack">
                                        <strong>{draft.title}</strong>
                                        <div className="ops-inline-muted">
                                            {draft.organization ?? draft.category ?? draft.type}
                                            {draft.updatedAt ? ` | ${new Date(draft.updatedAt).toLocaleString()}` : ''}
                                        </div>
                                        <div className="ops-actions">
                                            <Link
                                                to={draft.route ?? `/detailed-post?focus=${encodeURIComponent(draft.id)}`}
                                                className="admin-btn small subtle"
                                            >
                                                Resume Draft
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </OpsCard>
                </div>
            </form>

            {createMutation.isError ? (
                <OpsErrorState message={mapCreateErrorMessage(createMutation.error)} />
            ) : null}
            {startDraftMutation.isError ? (
                <OpsErrorState message={mapCreateErrorMessage(startDraftMutation.error)} />
            ) : null}
            {success ? <div className="ops-success">{success}</div> : null}
            {draftShell ? (
                <div className="admin-alert info">
                    Draft shell active: <strong>{draftShell.title}</strong>. Continue in <Link to={draftEditorRoute}>Detailed Post</Link>.
                </div>
            ) : null}
            {selectedTemplate ? (
                <div className="admin-alert info">Using template: {selectedTemplate.name}</div>
            ) : null}
            </ModuleScaffold>
        </>
    );
}
