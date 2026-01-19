import { useState } from 'react';
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

export function JobPostingForm({ initialData, onSubmit, onPreview, onCancel }: JobPostingFormProps) {
    const [activeTab, setActiveTab] = useState<TabType>('dates');
    const [jobDetails, setJobDetails] = useState<JobDetails>({
        ...defaultJobDetails,
        ...initialData,
    });

    const tabs = [
        { id: 'dates' as TabType, label: '📅 Dates & Fees', icon: '📅' },
        { id: 'eligibility' as TabType, label: '📚 Eligibility', icon: '📚' },
        { id: 'vacancies' as TabType, label: '📊 Vacancies', icon: '📊' },
        { id: 'exam' as TabType, label: '📝 Exam & Selection', icon: '📝' },
        { id: 'links' as TabType, label: '🔗 Links & FAQs', icon: '🔗' },
    ];

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

    const handleSubmit = () => {
        // Recalculate totals
        const totalVacancies = jobDetails.vacancies.details.reduce((sum, v) => sum + v.total, 0);
        const finalData = {
            ...jobDetails,
            vacancies: {
                ...jobDetails.vacancies,
                total: totalVacancies,
            },
        };
        onSubmit(finalData);
    };

    const handlePreview = () => {
        const totalVacancies = jobDetails.vacancies.details.reduce((sum, v) => sum + v.total, 0);
        const finalData = {
            ...jobDetails,
            vacancies: {
                ...jobDetails.vacancies,
                total: totalVacancies,
            },
        };
        onPreview?.(finalData);
    };

    return (
        <div className="job-posting-form">
            <div className="form-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="form-content">
                {/* Dates & Fees Tab */}
                {activeTab === 'dates' && (
                    <div className="tab-panel">
                        <h3>📅 Important Dates</h3>
                        <div className="dynamic-list">
                            {jobDetails.importantDates.map((date, index) => (
                                <div key={index} className="list-row">
                                    <input
                                        type="text"
                                        placeholder="Event Name"
                                        value={date.name}
                                        onChange={(e) => updateArrayItem('importantDates', index, 'name', e.target.value)}
                                    />
                                    <input
                                        type="date"
                                        value={date.date}
                                        onChange={(e) => updateArrayItem('importantDates', index, 'date', e.target.value)}
                                    />
                                    <button className="remove-btn" onClick={() => removeArrayItem('importantDates', index)}>✕</button>
                                </div>
                            ))}
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
                                        onChange={(e) => updateArrayItem('applicationFees', index, 'category', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={fee.amount || ''}
                                        onChange={(e) => updateArrayItem('applicationFees', index, 'amount', parseInt(e.target.value) || 0)}
                                    />
                                    <button className="remove-btn" onClick={() => removeArrayItem('applicationFees', index)}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => addArrayItem('applicationFees', { category: '', amount: 0 })}>
                                + Add Fee Category
                            </button>
                        </div>

                        <h3>👤 Age Limits</h3>
                        <div className="age-limits-section">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Minimum Age</label>
                                    <input
                                        type="number"
                                        value={jobDetails.ageLimits.minAge}
                                        onChange={(e) => updateField('ageLimits.minAge', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Maximum Age</label>
                                    <input
                                        type="number"
                                        value={jobDetails.ageLimits.maxAge}
                                        onChange={(e) => updateField('ageLimits.maxAge', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>As on Date</label>
                                    <input
                                        type="date"
                                        value={jobDetails.ageLimits.asOnDate}
                                        onChange={(e) => updateField('ageLimits.asOnDate', e.target.value)}
                                    />
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
                                            placeholder="Years"
                                            value={rel.years || ''}
                                            onChange={(e) => {
                                                const newRel = [...jobDetails.ageLimits.relaxations];
                                                newRel[index] = { ...newRel[index], years: parseInt(e.target.value) || 0 };
                                                updateField('ageLimits.relaxations', newRel);
                                            }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max Age"
                                            value={rel.maxAge || ''}
                                            onChange={(e) => {
                                                const newRel = [...jobDetails.ageLimits.relaxations];
                                                newRel[index] = { ...newRel[index], maxAge: parseInt(e.target.value) || 0 };
                                                updateField('ageLimits.relaxations', newRel);
                                            }}
                                        />
                                        <button className="remove-btn" onClick={() => {
                                            updateField('ageLimits.relaxations', jobDetails.ageLimits.relaxations.filter((_, i) => i !== index));
                                        }}>✕</button>
                                    </div>
                                ))}
                                <button className="add-btn" onClick={() => {
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
                                    <button className="remove-btn" onClick={() => {
                                        updateField('vacancies.details', jobDetails.vacancies.details.filter((_, i) => i !== index));
                                    }}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => {
                                updateField('vacancies.details', [...jobDetails.vacancies.details, { category: '', male: 0, female: 0, total: 0 }]);
                            }}>
                                + Add Category
                            </button>
                        </div>
                        <div className="total-vacancies">
                            <strong>Total Vacancies: </strong>
                            {jobDetails.vacancies.details.reduce((sum, v) => sum + v.total, 0)}
                        </div>
                    </div>
                )}

                {/* Exam & Selection Tab */}
                {activeTab === 'exam' && (
                    <div className="tab-panel">
                        <h3>📝 Exam Pattern</h3>
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
                                    <button className="remove-btn" onClick={() => {
                                        updateField('examPattern.subjects', jobDetails.examPattern.subjects.filter((_, i) => i !== index));
                                    }}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => {
                                updateField('examPattern.subjects', [...jobDetails.examPattern.subjects, { name: '', questions: 0, marks: 0 }]);
                            }}>
                                + Add Subject
                            </button>
                        </div>

                        <h3>🎯 Selection Process</h3>
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
                                    <button className="remove-btn" onClick={() => {
                                        const newSteps = jobDetails.selectionProcess.filter((_, i) => i !== index)
                                            .map((s, i) => ({ ...s, step: i + 1 }));
                                        updateField('selectionProcess', newSteps);
                                    }}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => {
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
                                    <button className="remove-btn" onClick={() => {
                                        updateField('importantLinks', jobDetails.importantLinks.filter((_, i) => i !== index));
                                    }}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => {
                                updateField('importantLinks', [...jobDetails.importantLinks, { label: '', url: '', type: 'primary' }]);
                            }}>
                                + Add Link
                            </button>
                        </div>

                        <h3>📝 How to Apply</h3>
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
                                    <button className="remove-btn" onClick={() => {
                                        updateField('howToApply', jobDetails.howToApply.filter((_, i) => i !== index));
                                    }}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => {
                                updateField('howToApply', [...jobDetails.howToApply, '']);
                            }}>
                                + Add Step
                            </button>
                        </div>

                        <h3>❓ Frequently Asked Questions</h3>
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
                                    <button className="remove-btn" onClick={() => {
                                        updateField('faqs', jobDetails.faqs.filter((_, i) => i !== index));
                                    }}>✕</button>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => {
                                updateField('faqs', [...jobDetails.faqs, { question: '', answer: '' }]);
                            }}>
                                + Add FAQ
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="form-actions">
                <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                {onPreview && (
                    <button className="btn-preview" onClick={handlePreview} style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        👁️ Preview
                    </button>
                )}
                <button className="btn-primary" onClick={handleSubmit}>Save Job Details</button>
            </div>
        </div>
    );
}

export default JobPostingForm;
