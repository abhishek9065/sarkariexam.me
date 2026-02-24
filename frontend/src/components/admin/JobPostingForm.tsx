import { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import { JobTemplates } from './JobTemplates';
import type { JobTemplate } from './JobTemplates.data';
import './JobPostingForm.css';

interface ImportantDate {
    name: string;
    date: string;
}

interface ApplicationFee {
    category: string;
    amount: number;
}

interface AgeRelaxation {
    category: string;
    years: number;
    maxAge: number;
}

interface VacancyDetail {
    category: string;
    male: number;
    female: number;
    total: number;
}

interface ExamSubject {
    name: string;
    questions: number;
    marks: number;
}

interface SelectionStep {
    step: number;
    name: string;
    description: string;
}

interface ImportantLink {
    label: string;
    url: string;
    type: 'primary' | 'secondary';
}

interface FAQ {
    question: string;
    answer: string;
}

export interface JobDetails {
    importantDates: ImportantDate[];
    applicationFees: ApplicationFee[];
    ageLimits: {
        minAge: number;
        maxAge: number;
        asOnDate: string;
        relaxations: AgeRelaxation[];
    };
    vacancies: {
        total: number;
        details: VacancyDetail[];
    };
    eligibility: {
        nationality: string;
        domicile: string;
        education: string;
        additional: string[];
    };
    salary: {
        payLevel: string;
        payScale: string;
        inHandSalary: string;
    };
    physicalRequirements: {
        male: {
            heightGeneral: string;
            heightSCST: string;
            chestNormal: string;
            chestExpanded: string;
            running: string;
        };
        female: {
            heightGeneral: string;
            heightSCST: string;
            running: string;
        };
    };
    examPattern: {
        totalQuestions: number;
        totalMarks: number;
        duration: string;
        negativeMarking: string;
        subjects: ExamSubject[];
    };
    selectionProcess: SelectionStep[];
    howToApply: string[];
    importantLinks: ImportantLink[];
    faqs: FAQ[];
}

interface JobPostingFormProps {
    initialData?: Partial<JobDetails>;
    onSubmit: (data: JobDetails) => void;
    onPreview?: (data: JobDetails) => void;
    onCancel: () => void;
    isDisabled?: boolean;
}

const defaultJobDetails: JobDetails = {
    importantDates: [
        { name: 'Application Begin', date: '' },
        { name: 'Last Date to Apply', date: '' },
    ],
    applicationFees: [
        { category: 'General / OBC', amount: 0 },
        { category: 'SC / ST', amount: 0 },
    ],
    ageLimits: {
        minAge: 18,
        maxAge: 30,
        asOnDate: '',
        relaxations: [],
    },
    vacancies: {
        total: 0,
        details: [],
    },
    eligibility: {
        nationality: 'Indian Citizen',
        domicile: '',
        education: '',
        additional: [],
    },
    salary: {
        payLevel: '',
        payScale: '',
        inHandSalary: '',
    },
    physicalRequirements: {
        male: { heightGeneral: '', heightSCST: '', chestNormal: '', chestExpanded: '', running: '' },
        female: { heightGeneral: '', heightSCST: '', running: '' },
    },
    examPattern: {
        totalQuestions: 0,
        totalMarks: 0,
        duration: '',
        negativeMarking: '',
        subjects: [],
    },
    selectionProcess: [],
    howToApply: [],
    importantLinks: [],
    faqs: [],
};

type TabType = 'dates' | 'fees' | 'eligibility' | 'vacancies' | 'exam' | 'links';

export function JobPostingForm({ initialData, onSubmit, onPreview, onCancel, isDisabled }: JobPostingFormProps) {
    const draftKey = 'jobDetailsDraft';
    const [activeTab, setActiveTab] = useState<TabType>('dates');
    const [jobDetails, setJobDetails] = useState<JobDetails>(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            return { ...defaultJobDetails, ...initialData };
        }
        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                return { ...defaultJobDetails, ...JSON.parse(saved) };
            }
        } catch {
            // Ignore invalid drafts.
        }
        return { ...defaultJobDetails };
    });
    const [draftAlert, setDraftAlert] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showValidation, setShowValidation] = useState(false);

    const validation = useMemo(() => {
        const dateErrors = jobDetails.importantDates.map((date) => {
            const touched = Boolean(date.name.trim() || date.date);
            return {
                name: touched && !date.name.trim(),
                date: touched && !date.date,
            };
        });
        const feeErrors = jobDetails.applicationFees.map((fee) => {
            const touched = Boolean(fee.category.trim() || fee.amount);
            return {
                category: touched && !fee.category.trim(),
                amount: false,
            };
        });
        const ageErrors = {
            minAge: jobDetails.ageLimits.minAge <= 0,
            maxAge: jobDetails.ageLimits.maxAge <= 0 || jobDetails.ageLimits.maxAge < jobDetails.ageLimits.minAge,
            asOnDate: !jobDetails.ageLimits.asOnDate,
        };
        const hasRequiredErrors =
            dateErrors.some((entry) => entry.name || entry.date)
            || feeErrors.some((entry) => entry.category || entry.amount)
            || ageErrors.minAge
            || ageErrors.maxAge;
        return { dateErrors, feeErrors, ageErrors, hasRequiredErrors };
    }, [jobDetails]);

    const disableActions = validation.hasRequiredErrors || isSubmitting || Boolean(isDisabled);
    const disabledReason = isDisabled
        ? 'Complete Basic Information to save'
        : validation.hasRequiredErrors
            ? 'Please fix validation errors before saving'
            : undefined;

    const totalVacancies = useMemo(
        () => jobDetails.vacancies.details.reduce((sum, v) => sum + v.total, 0),
        [jobDetails.vacancies.details]
    );

    const tabCompletion = useMemo(() => {
        const datesComplete =
            jobDetails.importantDates.length > 0
            && jobDetails.importantDates.every((date) => date.name.trim() && date.date)
            && jobDetails.applicationFees.every((fee) => fee.category.trim())
            && !validation.ageErrors.minAge
            && !validation.ageErrors.maxAge
            && Boolean(jobDetails.ageLimits.asOnDate);
        const eligibilityComplete = Boolean(jobDetails.eligibility.education.trim() || jobDetails.eligibility.additional.length);
        const vacanciesComplete =
            jobDetails.vacancies.details.length > 0
            && jobDetails.vacancies.details.every((row) => row.category.trim() && row.total > 0);
        const examComplete =
            jobDetails.examPattern.totalQuestions > 0
            && jobDetails.examPattern.totalMarks > 0;
        const linksComplete =
            jobDetails.importantLinks.length > 0
            && jobDetails.importantLinks.every((link) => link.label.trim() && link.url.trim());
        return {
            dates: datesComplete,
            fees: datesComplete, // Fees are part of the dates tab
            eligibility: eligibilityComplete,
            vacancies: vacanciesComplete,
            exam: examComplete,
            links: linksComplete,
        };
    }, [jobDetails, validation.ageErrors]);

    const completedSections = Object.values(tabCompletion).filter(Boolean).length;
    const totalSections = Object.keys(tabCompletion).length;
    const completionPercent = Math.round((completedSections / totalSections) * 100);

    const todayStart = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now.getTime();
    }, []);

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setJobDetails({ ...defaultJobDetails, ...initialData });
            setShowValidation(false);
            setDraftAlert(null);
            setLastSavedAt(null);
        }
    }, [initialData]);

    const tabs = [
        { id: 'dates' as TabType, label: '📅 Dates & Fees', icon: '📅' },
        { id: 'eligibility' as TabType, label: '📚 Eligibility', icon: '📚' },
        { id: 'vacancies' as TabType, label: '📊 Vacancies', icon: '📊' },
        { id: 'exam' as TabType, label: '📝 Exam & Selection', icon: '📝' },
        { id: 'links' as TabType, label: '🔗 Links & FAQs', icon: '🔗' },
    ];

    const formatDateInput = (date: Date) => {
        const pad = (num: number) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };
    const parseDateInput = (value?: string) => {
        if (!value) return null;
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return null;
        return date;
    };

    const formatSavedTime = (timestamp: number) => {
        const diffMs = Date.now() - timestamp;
        if (diffMs < 60 * 1000) return 'Last saved just now';
        if (diffMs < 60 * 60 * 1000) return `Last saved ${Math.round(diffMs / 60000)}m ago`;
        return `Last saved ${Math.round(diffMs / (60 * 60 * 1000))}h ago`;
    };

    const applyDatePreset = (index: number, days: number) => {
        const preset = new Date();
        preset.setDate(preset.getDate() + days);
        updateArrayItem('importantDates', index, 'date', formatDateInput(preset));
        setDraftAlert(null);
    };

    const applyAgeDatePreset = (days: number) => {
        const preset = new Date();
        preset.setDate(preset.getDate() + days);
        updateField('ageLimits.asOnDate', formatDateInput(preset));
        setDraftAlert(null);
    };

    const updateImportantDate = (index: number, field: keyof ImportantDate, value: string) => {
        const next = [...jobDetails.importantDates];
        next[index] = { ...next[index], [field]: value };
        if (field === 'date') {
            next.sort((a, b) => {
                if (!a.date && !b.date) return 0;
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
        }
        updateField('importantDates', next);
    };

    // Helper to update nested state
    const updateField = (path: string, value: any) => {
        setJobDetails(prev => {
            const keys = path.split('.');
            const newState = { ...prev };
            let current: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    // Add item to array
    const addArrayItem = (path: string, item: any) => {
        const keys = path.split('.');
        let current: any = jobDetails;
        for (const key of keys) {
            current = current[key];
        }
        updateField(path, [...current, item]);
    };

    // Remove item from array
    const removeArrayItem = (path: string, index: number) => {
        const keys = path.split('.');
        let current: any = jobDetails;
        for (const key of keys) {
            current = current[key];
        }
        updateField(path, current.filter((_: any, i: number) => i !== index));
    };

    // Update array item
    const updateArrayItem = (path: string, index: number, field: string, value: any) => {
        const keys = path.split('.');
        let current: any = jobDetails;
        for (const key of keys) {
            current = current[key];
        }
        const newArray = [...current];
        newArray[index] = { ...newArray[index], [field]: value };
        updateField(path, newArray);
    };

    useEffect(() => {
        setIsSavingDraft(true);
        const handle = window.setTimeout(() => {
            try {
                localStorage.setItem(draftKey, JSON.stringify(jobDetails));
                setLastSavedAt(Date.now());
            } catch {
                // Ignore storage errors.
            } finally {
                setIsSavingDraft(false);
            }
        }, 600);
        return () => window.clearTimeout(handle);
    }, [jobDetails]);

    useEffect(() => {
        if (!lastSavedAt) return;
        const interval = window.setInterval(() => {
            setLastSavedAt((value) => value);
        }, 60000);
        return () => window.clearInterval(interval);
    }, [lastSavedAt]);

    const handleSubmit = async () => {
        if (validation.hasRequiredErrors) {
            setShowValidation(true);
            setDraftAlert('Please fix highlighted fields before saving.');
            return;
        }
        setIsSubmitting(true);
        // Recalculate totals
        const finalData = {
            ...jobDetails,
            vacancies: {
                ...jobDetails.vacancies,
                total: totalVacancies,
            },
        };
        try {
            await Promise.resolve(onSubmit(finalData));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePreview = () => {
        if (validation.hasRequiredErrors) {
            setShowValidation(true);
            setDraftAlert('Complete required fields before previewing.');
            return;
        }
        setIsPreviewing(true);
        const finalData = {
            ...jobDetails,
            vacancies: {
                ...jobDetails.vacancies,
                total: totalVacancies,
            },
        };
        onPreview?.(finalData);
        window.setTimeout(() => setIsPreviewing(false), 400);
    };

    const confirmRemove = (label: string) => window.confirm(`Remove ${label}? This cannot be undone.`);

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftAlert('Draft cleared');
        setLastSavedAt(null);
    };

    const handleTemplateSelect = (template: JobTemplate) => {
        if (window.confirm(`Apply "${template.name}" template? This will replace current form data.`)) {
            setJobDetails((prev) => ({
                ...prev,
                ...template.data,
            }));
            setDraftAlert(`Applied ${template.name} template`);
        }
    };

    return (
        <div className="job-posting-form">
            <div className="form-header-actions">
                <JobTemplates
                    onSelectTemplate={handleTemplateSelect}
                    disabled={isDisabled}
                />
                <button
                    className="admin-btn secondary small"
                    onClick={clearDraft}
                    type="button"
                >
                    Clear Draft
                </button>
            </div>
            {(validation.hasRequiredErrors || isDisabled) && (
                <div className="form-alert">
                    {isDisabled
                        ? 'Complete the Basic Information section to enable saving.'
                        : 'Some required fields are missing. Fix the highlighted inputs before saving.'}
                </div>
            )}
            {(draftAlert || lastSavedAt) && (
                <div className={`form-note ${draftAlert ? 'warn' : ''}`}>
                    {!draftAlert && (
                        <span className={`save-dot ${isSavingDraft ? 'saving' : 'saved'}`} aria-hidden="true" />
                    )}
                    <span>
                        {draftAlert
                            ? draftAlert
                            : lastSavedAt
                                ? formatSavedTime(lastSavedAt)
                                : ''}
                    </span>
                </div>
            )}
            <div className="form-progress">
                <div className="progress-meta">{completedSections}/{totalSections} sections completed</div>
                <div className="progress-bar">
                    <span style={{ width: `${completionPercent}%` }} />
                </div>
            </div>
            <div className="form-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tabCompletion[tab.id] && <span className="tab-check">✓</span>}
                    </button>
                ))}
            </div>

            <div className="form-content">
                {/* Dates & Fees Tab */}
                {activeTab === 'dates' && (
                    <div className="tab-panel">
                        <h3>📅 Important Dates</h3>
                        <p className="form-hint">Tip: Click a date field to open the calendar picker.</p>
                        <div className="dynamic-list">
                            {jobDetails.importantDates.map((date, index) => {
                                const dateTime = date.date ? new Date(date.date).getTime() : null;
                                const isPastDate = dateTime !== null && !Number.isNaN(dateTime) && dateTime < todayStart;
                                return (
                                    <div key={index} className="list-row">
                                        <input
                                            type="text"
                                            placeholder="Event Name"
                                            value={date.name}
                                            className={(showValidation || date.name.trim() || date.date)
                                                ? (validation.dateErrors[index]?.name ? 'field-invalid' : 'field-valid')
                                                : ''}
                                            aria-invalid={((showValidation || date.name.trim() || date.date) && validation.dateErrors[index]?.name) || undefined}
                                            title={validation.dateErrors[index]?.name ? 'Event name is required' : 'Looks good'}
                                            onChange={(e) => updateImportantDate(index, 'name', e.target.value)}
                                        />
                                        <DatePicker
                                            selected={parseDateInput(date.date)}
                                            onChange={(selected: Date | null) => updateImportantDate(index, 'date', selected ? formatDateInput(selected) : '')}
                                            className={[
                                                'job-datepicker-input',
                                                (showValidation || date.name.trim() || date.date)
                                                    ? (validation.dateErrors[index]?.date ? 'field-invalid' : 'field-valid')
                                                    : '',
                                                isPastDate ? 'date-past' : '',
                                            ].filter(Boolean).join(' ')}
                                            calendarClassName="job-datepicker-calendar"
                                            popperClassName="job-datepicker-popper"
                                            placeholderText="Select date"
                                            dateFormat="dd MMM yyyy"
                                            aria-invalid={((showValidation || date.name.trim() || date.date) && validation.dateErrors[index]?.date) ? "true" : undefined}
                                            title={validation.dateErrors[index]?.date ? 'Date is required' : 'Looks good'}
                                        />
                                        {isPastDate && <span className="date-flag">Past</span>}
                                        <div className="date-presets">
                                            <button type="button" className="preset-btn" onClick={() => applyDatePreset(index, 0)}>Today</button>
                                            <button type="button" className="preset-btn" onClick={() => applyDatePreset(index, 1)}>+1d</button>
                                            <button type="button" className="preset-btn" onClick={() => applyDatePreset(index, 7)}>+7d</button>
                                            <button type="button" className="preset-btn" onClick={() => applyDatePreset(index, 30)}>+30d</button>
                                        </div>
                                        <button
                                            className="remove-btn"
                                            onClick={() => {
                                                if (!confirmRemove('this date')) return;
                                                removeArrayItem('importantDates', index);
                                            }}
                                            aria-label="Remove date"
                                            title="Remove date"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                            <button className="add-btn" onClick={() => addArrayItem('importantDates', { name: '', date: '' })}>
                                + Add Date
                            </button>
                        </div>

                        <h3>💰 Application Fees</h3>
                        <div className="dynamic-list">
                            {jobDetails.applicationFees.map((fee, index) => (
                                <div key={index} className="list-row">
                                    <input
                                        type="text"
                                        placeholder="Category"
                                        value={fee.category}
                                        className={(showValidation || fee.category.trim() || fee.amount)
                                            ? (validation.feeErrors[index]?.category ? 'field-invalid' : 'field-valid')
                                            : ''}
                                        aria-invalid={((showValidation || fee.category.trim() || fee.amount) && validation.feeErrors[index]?.category) || undefined}
                                        onChange={(e) => updateArrayItem('applicationFees', index, 'category', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Amount (₹)"
                                        value={fee.amount || ''}
                                        className=""
                                        aria-invalid={undefined}
                                        onChange={(e) => updateArrayItem('applicationFees', index, 'amount', parseInt(e.target.value) || 0)}
                                    />
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this fee')) return;
                                            removeArrayItem('applicationFees', index);
                                        }}
                                        aria-label="Remove fee"
                                        title="Remove fee"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => addArrayItem('applicationFees', { category: '', amount: 0 })}>
                                + Add Fee Category
                            </button>
                        </div>

                        <h3>👤 Age Limits</h3>
                        <p className="form-hint">Required fields are highlighted. Add relaxations only if they apply.</p>
                        <div className="age-limits-section">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Minimum Age</label>
                                    <input
                                        type="number"
                                        value={jobDetails.ageLimits.minAge}
                                        className={(showValidation || jobDetails.ageLimits.minAge)
                                            ? (validation.ageErrors.minAge ? 'field-invalid' : 'field-valid')
                                            : ''}
                                        onChange={(e) => updateField('ageLimits.minAge', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Maximum Age</label>
                                    <input
                                        type="number"
                                        value={jobDetails.ageLimits.maxAge}
                                        className={(showValidation || jobDetails.ageLimits.maxAge)
                                            ? (validation.ageErrors.maxAge ? 'field-invalid' : 'field-valid')
                                            : ''}
                                        onChange={(e) => updateField('ageLimits.maxAge', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>As on Date</label>
                                    <DatePicker
                                        selected={parseDateInput(jobDetails.ageLimits.asOnDate)}
                                        onChange={(selected: Date | null) => updateField('ageLimits.asOnDate', selected ? formatDateInput(selected) : '')}
                                        className={[
                                            'job-datepicker-input',
                                            (showValidation || jobDetails.ageLimits.asOnDate)
                                                ? (validation.ageErrors.asOnDate ? 'field-invalid' : 'field-valid')
                                                : '',
                                        ].filter(Boolean).join(' ')}
                                        calendarClassName="job-datepicker-calendar"
                                        popperClassName="job-datepicker-popper"
                                        placeholderText="Select date"
                                        dateFormat="dd MMM yyyy"
                                    />
                                    <div className="date-presets">
                                        <button type="button" className="preset-btn" onClick={() => applyAgeDatePreset(0)}>Today</button>
                                        <button type="button" className="preset-btn" onClick={() => applyAgeDatePreset(7)}>+7d</button>
                                        <button type="button" className="preset-btn" onClick={() => applyAgeDatePreset(30)}>+30d</button>
                                    </div>
                                </div>
                            </div>

                            <h4>Age Relaxations</h4>
                            <div className="dynamic-list">
                                {jobDetails.ageLimits.relaxations.map((rel, index) => (
                                    <div key={index} className="list-row">
                                        <input
                                            type="text"
                                            placeholder="Category"
                                            value={rel.category}
                                            onChange={(e) => {
                                                const newRel = [...jobDetails.ageLimits.relaxations];
                                                newRel[index] = { ...newRel[index], category: e.target.value };
                                                updateField('ageLimits.relaxations', newRel);
                                            }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Years (+)"
                                            value={rel.years || ''}
                                            onChange={(e) => {
                                                const newRel = [...jobDetails.ageLimits.relaxations];
                                                newRel[index] = { ...newRel[index], years: parseInt(e.target.value) || 0 };
                                                updateField('ageLimits.relaxations', newRel);
                                            }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max age"
                                            value={rel.maxAge || ''}
                                            onChange={(e) => {
                                                const newRel = [...jobDetails.ageLimits.relaxations];
                                                newRel[index] = { ...newRel[index], maxAge: parseInt(e.target.value) || 0 };
                                                updateField('ageLimits.relaxations', newRel);
                                            }}
                                        />
                                        <button
                                            className="remove-btn"
                                            onClick={() => {
                                                if (!confirmRemove('this relaxation')) return;
                                                updateField('ageLimits.relaxations', jobDetails.ageLimits.relaxations.filter((_, i) => i !== index));
                                            }}
                                            aria-label="Remove relaxation"
                                            title="Remove relaxation"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button className="add-btn secondary" onClick={() => {
                                    updateField('ageLimits.relaxations', [...jobDetails.ageLimits.relaxations, { category: '', years: 0, maxAge: 0 }]);
                                }}>
                                    + Add Relaxation
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Eligibility Tab */}
                {activeTab === 'eligibility' && (
                    <div className="tab-panel">
                        <h3>📚 Eligibility Criteria</h3>
                        <p className="form-hint">Describe who can apply. Keep it concise and clear.</p>
                        <div className="form-group">
                            <label>Nationality</label>
                            <input
                                type="text"
                                value={jobDetails.eligibility.nationality}
                                onChange={(e) => updateField('eligibility.nationality', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Domicile</label>
                            <input
                                type="text"
                                placeholder="e.g., Must be domicile of Uttar Pradesh"
                                value={jobDetails.eligibility.domicile}
                                onChange={(e) => updateField('eligibility.domicile', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Education Qualification</label>
                            <textarea
                                placeholder="e.g., 12th Pass (Intermediate) from any recognized board"
                                value={jobDetails.eligibility.education}
                                onChange={(e) => updateField('eligibility.education', e.target.value)}
                            />
                        </div>

                        <h3>💵 Salary Details</h3>
                        <p className="form-hint">Use currency symbols to clarify pay ranges.</p>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Pay Level</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Level - 3"
                                    value={jobDetails.salary.payLevel}
                                    onChange={(e) => updateField('salary.payLevel', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Pay Scale</label>
                                <input
                                    type="text"
                                    placeholder="e.g., ₹21,700 - ₹69,100"
                                    value={jobDetails.salary.payScale}
                                    onChange={(e) => updateField('salary.payScale', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>In-Hand Salary</label>
                                <input
                                    type="text"
                                    placeholder="e.g., ₹25,000 - ₹30,000"
                                    value={jobDetails.salary.inHandSalary}
                                    onChange={(e) => updateField('salary.inHandSalary', e.target.value)}
                                />
                            </div>
                        </div>

                        <h3>🏃 Physical Requirements</h3>
                        <p className="form-hint">Include only if the official notification specifies requirements.</p>
                        <div className="physical-req-section">
                            <h4>👨 Male Candidates</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Height (General)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 168 cm"
                                        value={jobDetails.physicalRequirements.male.heightGeneral}
                                        onChange={(e) => updateField('physicalRequirements.male.heightGeneral', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Height (SC/ST)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 160 cm"
                                        value={jobDetails.physicalRequirements.male.heightSCST}
                                        onChange={(e) => updateField('physicalRequirements.male.heightSCST', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Chest (Normal)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 79 cm"
                                        value={jobDetails.physicalRequirements.male.chestNormal}
                                        onChange={(e) => updateField('physicalRequirements.male.chestNormal', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Chest (Expanded)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 84 cm"
                                        value={jobDetails.physicalRequirements.male.chestExpanded}
                                        onChange={(e) => updateField('physicalRequirements.male.chestExpanded', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Running</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 4.8 km in 25 minutes"
                                        value={jobDetails.physicalRequirements.male.running}
                                        onChange={(e) => updateField('physicalRequirements.male.running', e.target.value)}
                                    />
                                </div>
                            </div>

                            <h4>👩 Female Candidates</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Height (General)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 152 cm"
                                        value={jobDetails.physicalRequirements.female.heightGeneral}
                                        onChange={(e) => updateField('physicalRequirements.female.heightGeneral', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Height (SC/ST)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 147 cm"
                                        value={jobDetails.physicalRequirements.female.heightSCST}
                                        onChange={(e) => updateField('physicalRequirements.female.heightSCST', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Running</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 2.4 km in 14 minutes"
                                        value={jobDetails.physicalRequirements.female.running}
                                        onChange={(e) => updateField('physicalRequirements.female.running', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vacancies Tab */}
                {activeTab === 'vacancies' && (
                    <div className="tab-panel">
                        <h3>📊 Category-wise Vacancy Details</h3>
                        <p className="form-hint">Totals auto-calculate from male/female counts.</p>
                        <div className="vacancy-table">
                            <div className="vacancy-header">
                                <span>Category</span>
                                <span>Male</span>
                                <span>Female</span>
                                <span>Total</span>
                                <span></span>
                            </div>
                            {jobDetails.vacancies.details.map((vac, index) => (
                                <div key={index} className="vacancy-row">
                                    <input
                                        type="text"
                                        placeholder="Category"
                                        value={vac.category}
                                        onChange={(e) => {
                                            const newVac = [...jobDetails.vacancies.details];
                                            newVac[index] = { ...newVac[index], category: e.target.value };
                                            updateField('vacancies.details', newVac);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Male"
                                        value={vac.male || ''}
                                        onChange={(e) => {
                                            const newVac = [...jobDetails.vacancies.details];
                                            const male = parseInt(e.target.value) || 0;
                                            newVac[index] = { ...newVac[index], male, total: male + newVac[index].female };
                                            updateField('vacancies.details', newVac);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Female"
                                        value={vac.female || ''}
                                        onChange={(e) => {
                                            const newVac = [...jobDetails.vacancies.details];
                                            const female = parseInt(e.target.value) || 0;
                                            newVac[index] = { ...newVac[index], female, total: newVac[index].male + female };
                                            updateField('vacancies.details', newVac);
                                        }}
                                    />
                                    <input type="number" value={vac.total} disabled className="total-field" />
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this category')) return;
                                            updateField('vacancies.details', jobDetails.vacancies.details.filter((_, i) => i !== index));
                                        }}
                                        aria-label="Remove vacancy category"
                                        title="Remove vacancy category"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn secondary" onClick={() => {
                                updateField('vacancies.details', [...jobDetails.vacancies.details, { category: '', male: 0, female: 0, total: 0 }]);
                            }}>
                                + Add Category
                            </button>
                        </div>
                        <div className="total-vacancies">
                            <strong>Total Vacancies: </strong>
                            {totalVacancies}
                        </div>
                    </div>
                )}

                {/* Exam & Selection Tab */}
                {activeTab === 'exam' && (
                    <div className="tab-panel">
                        <h3>📝 Exam Pattern</h3>
                        <p className="form-hint">Leave blank if the pattern hasn’t been announced.</p>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Total Questions</label>
                                <input
                                    type="number"
                                    value={jobDetails.examPattern.totalQuestions || ''}
                                    onChange={(e) => updateField('examPattern.totalQuestions', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Total Marks</label>
                                <input
                                    type="number"
                                    value={jobDetails.examPattern.totalMarks || ''}
                                    onChange={(e) => updateField('examPattern.totalMarks', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Duration</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 2 Hours"
                                    value={jobDetails.examPattern.duration}
                                    onChange={(e) => updateField('examPattern.duration', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Negative Marking</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 0.25 marks"
                                    value={jobDetails.examPattern.negativeMarking}
                                    onChange={(e) => updateField('examPattern.negativeMarking', e.target.value)}
                                />
                            </div>
                        </div>

                        <h4>Subject-wise Breakdown</h4>
                        <div className="dynamic-list">
                            {jobDetails.examPattern.subjects.map((sub, index) => (
                                <div key={index} className="list-row">
                                    <input
                                        type="text"
                                        placeholder="Subject Name"
                                        value={sub.name}
                                        onChange={(e) => {
                                            const newSubs = [...jobDetails.examPattern.subjects];
                                            newSubs[index] = { ...newSubs[index], name: e.target.value };
                                            updateField('examPattern.subjects', newSubs);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Questions"
                                        value={sub.questions || ''}
                                        onChange={(e) => {
                                            const newSubs = [...jobDetails.examPattern.subjects];
                                            newSubs[index] = { ...newSubs[index], questions: parseInt(e.target.value) || 0 };
                                            updateField('examPattern.subjects', newSubs);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Marks"
                                        value={sub.marks || ''}
                                        onChange={(e) => {
                                            const newSubs = [...jobDetails.examPattern.subjects];
                                            newSubs[index] = { ...newSubs[index], marks: parseInt(e.target.value) || 0 };
                                            updateField('examPattern.subjects', newSubs);
                                        }}
                                    />
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this subject')) return;
                                            updateField('examPattern.subjects', jobDetails.examPattern.subjects.filter((_, i) => i !== index));
                                        }}
                                        aria-label="Remove subject"
                                        title="Remove subject"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn secondary" onClick={() => {
                                updateField('examPattern.subjects', [...jobDetails.examPattern.subjects, { name: '', questions: 0, marks: 0 }]);
                            }}>
                                + Add Subject
                            </button>
                        </div>

                        <h3>🎯 Selection Process</h3>
                        <p className="form-hint">Add steps in the order candidates will experience them.</p>
                        <div className="dynamic-list">
                            {jobDetails.selectionProcess.map((step, index) => (
                                <div key={index} className="list-row step-row">
                                    <span className="step-number">{step.step}</span>
                                    <input
                                        type="text"
                                        placeholder="Step Name"
                                        value={step.name}
                                        onChange={(e) => {
                                            const newSteps = [...jobDetails.selectionProcess];
                                            newSteps[index] = { ...newSteps[index], name: e.target.value };
                                            updateField('selectionProcess', newSteps);
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={step.description}
                                        onChange={(e) => {
                                            const newSteps = [...jobDetails.selectionProcess];
                                            newSteps[index] = { ...newSteps[index], description: e.target.value };
                                            updateField('selectionProcess', newSteps);
                                        }}
                                    />
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this step')) return;
                                            const newSteps = jobDetails.selectionProcess.filter((_, i) => i !== index)
                                                .map((s, i) => ({ ...s, step: i + 1 }));
                                            updateField('selectionProcess', newSteps);
                                        }}
                                        aria-label="Remove step"
                                        title="Remove step"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn secondary" onClick={() => {
                                updateField('selectionProcess', [
                                    ...jobDetails.selectionProcess,
                                    { step: jobDetails.selectionProcess.length + 1, name: '', description: '' }
                                ]);
                            }}>
                                + Add Step
                            </button>
                        </div>
                    </div>
                )}

                {/* Links & FAQs Tab */}
                {activeTab === 'links' && (
                    <div className="tab-panel">
                        <h3>🔗 Important Links</h3>
                        <p className="form-hint">Add official links first. Use “Primary” for key actions.</p>
                        <div className="dynamic-list">
                            {jobDetails.importantLinks.map((link, index) => (
                                <div key={index} className="list-row">
                                    <input
                                        type="text"
                                        placeholder="Label (e.g., Apply Online)"
                                        value={link.label}
                                        onChange={(e) => {
                                            const newLinks = [...jobDetails.importantLinks];
                                            newLinks[index] = { ...newLinks[index], label: e.target.value };
                                            updateField('importantLinks', newLinks);
                                        }}
                                    />
                                    <input
                                        type="url"
                                        placeholder="URL"
                                        value={link.url}
                                        onChange={(e) => {
                                            const newLinks = [...jobDetails.importantLinks];
                                            newLinks[index] = { ...newLinks[index], url: e.target.value };
                                            updateField('importantLinks', newLinks);
                                        }}
                                    />
                                    <select
                                        value={link.type}
                                        onChange={(e) => {
                                            const newLinks = [...jobDetails.importantLinks];
                                            newLinks[index] = { ...newLinks[index], type: e.target.value as 'primary' | 'secondary' };
                                            updateField('importantLinks', newLinks);
                                        }}
                                    >
                                        <option value="primary">Primary</option>
                                        <option value="secondary">Secondary</option>
                                    </select>
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this link')) return;
                                            updateField('importantLinks', jobDetails.importantLinks.filter((_, i) => i !== index));
                                        }}
                                        aria-label="Remove link"
                                        title="Remove link"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn secondary" onClick={() => {
                                updateField('importantLinks', [...jobDetails.importantLinks, { label: '', url: '', type: 'primary' }]);
                            }}>
                                + Add Link
                            </button>
                        </div>

                        <h3>📝 How to Apply</h3>
                        <p className="form-hint">Use short steps. Each line should be a clear action.</p>
                        <div className="dynamic-list">
                            {jobDetails.howToApply.map((step, index) => (
                                <div key={index} className="list-row">
                                    <span className="step-number">{index + 1}</span>
                                    <input
                                        type="text"
                                        placeholder="Step instruction"
                                        value={step}
                                        onChange={(e) => {
                                            const newSteps = [...jobDetails.howToApply];
                                            newSteps[index] = e.target.value;
                                            updateField('howToApply', newSteps);
                                        }}
                                    />
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this step')) return;
                                            updateField('howToApply', jobDetails.howToApply.filter((_, i) => i !== index));
                                        }}
                                        aria-label="Remove step"
                                        title="Remove step"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn secondary" onClick={() => {
                                updateField('howToApply', [...jobDetails.howToApply, '']);
                            }}>
                                + Add Step
                            </button>
                        </div>

                        <h3>❓ Frequently Asked Questions</h3>
                        <p className="form-hint">Add common queries from candidates to reduce support load.</p>
                        <div className="faq-list">
                            {jobDetails.faqs.map((faq, index) => (
                                <div key={index} className="faq-item">
                                    <input
                                        type="text"
                                        placeholder="Question"
                                        value={faq.question}
                                        onChange={(e) => {
                                            const newFaqs = [...jobDetails.faqs];
                                            newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                                            updateField('faqs', newFaqs);
                                        }}
                                    />
                                    <textarea
                                        placeholder="Answer"
                                        value={faq.answer}
                                        onChange={(e) => {
                                            const newFaqs = [...jobDetails.faqs];
                                            newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                                            updateField('faqs', newFaqs);
                                        }}
                                    />
                                    <button
                                        className="remove-btn"
                                        onClick={() => {
                                            if (!confirmRemove('this FAQ')) return;
                                            updateField('faqs', jobDetails.faqs.filter((_, i) => i !== index));
                                        }}
                                        aria-label="Remove FAQ"
                                        title="Remove FAQ"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="add-btn secondary" onClick={() => {
                                updateField('faqs', [...jobDetails.faqs, { question: '', answer: '' }]);
                            }}>
                                + Add FAQ
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="form-actions">
                <button className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
                <button className="btn-secondary subtle" onClick={clearDraft} type="button">Clear draft</button>
                {onPreview && (
                    <button
                        className="btn-outline"
                        onClick={handlePreview}
                        disabled={isPreviewing || disableActions}
                        title={disableActions ? disabledReason : 'Preview this job post'}
                    >
                        {isPreviewing ? 'Opening preview…' : 'Preview (modal)'}
                    </button>
                )}
                <button
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={disableActions}
                    title={disableActions ? disabledReason : 'Save job details'}
                >
                    {isSubmitting ? 'Saving…' : 'Save Job Details'}
                </button>
                {disableActions && (
                    <span className="form-disabled-note">Please fix validation errors above to save.</span>
                )}
            </div>
        </div>
    );
}

export default JobPostingForm;
