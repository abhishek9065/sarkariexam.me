import './JobDetailsRenderer.css';
import type { JobDetails } from '../admin/JobPostingForm';

interface JobDetailsRendererProps {
    jobDetails: JobDetails;
}

/**
 * Renders structured job details (dates, fees, vacancies, eligibility, etc.)
 * in a premium, organized layout similar to UP Police style
 */
export function JobDetailsRenderer({ jobDetails }: JobDetailsRendererProps) {
    if (!jobDetails || Object.keys(jobDetails).length === 0) {
        return null;
    }

    const toNumber = (value: unknown) => {
        const num = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(num) ? num : 0;
    };

    const formatCount = (value?: number | null) => {
        const num = toNumber(value);
        return num.toLocaleString('en-IN');
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBA';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="job-details-renderer">
            {/* Important Dates */}
            {jobDetails.importantDates && jobDetails.importantDates.length > 0 && (
                <section className="detail-section dates-section">
                    <h3 className="section-header dates-header">📅 Important Dates</h3>
                    <div className="dates-grid">
                        {jobDetails.importantDates.map((date, i) => (
                            <div key={i} className="date-row">
                                <span className="date-label">{date.name}</span>
                                <span className="date-value">{formatDate(date.date)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Application Fees */}
            {jobDetails.applicationFees && jobDetails.applicationFees.length > 0 && (
                <section className="detail-section fees-section">
                    <h3 className="section-header fees-header">💰 Application Fee</h3>
                    <div className="fees-grid">
                        {jobDetails.applicationFees.map((fee, i) => (
                            <div key={i} className="fee-row">
                                <span className="fee-category">{fee.category}</span>
                                <span className="fee-amount">₹{fee.amount}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Age Limits */}
            {jobDetails.ageLimits && (
                <section className="detail-section age-section">
                    <h3 className="section-header age-header">👤 Age Limits</h3>
                    <div className="age-info">
                        <div className="age-main">
                            <div className="age-box">
                                <span className="age-label">Minimum Age</span>
                                <span className="age-value">{jobDetails.ageLimits.minAge || 18} Years</span>
                            </div>
                            <div className="age-box">
                                <span className="age-label">Maximum Age</span>
                                <span className="age-value">{jobDetails.ageLimits.maxAge || 30} Years</span>
                            </div>
                            {jobDetails.ageLimits.asOnDate && (
                                <div className="age-as-on">
                                    As on {formatDate(jobDetails.ageLimits.asOnDate)}
                                </div>
                            )}
                        </div>
                        {jobDetails.ageLimits.relaxations && jobDetails.ageLimits.relaxations.length > 0 && (
                            <div className="age-relaxations">
                                <h4>Age Relaxation:</h4>
                                <table className="relaxation-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Relaxation</th>
                                            <th>Max Age</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobDetails.ageLimits.relaxations.map((rel, i) => (
                                            <tr key={i}>
                                                <td>{rel.category}</td>
                                                <td>{rel.years} Years</td>
                                                <td>{rel.maxAge} Years</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Vacancies */}
            {jobDetails.vacancies && jobDetails.vacancies.details && jobDetails.vacancies.details.length > 0 && (
                <section className="detail-section vacancy-section">
                    <h3 className="section-header vacancy-header">📊 Category-wise Vacancy Details</h3>
                    <table className="vacancy-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Male</th>
                                <th>Female</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobDetails.vacancies.details.map((vac, i) => (
                                <tr key={i}>
                                    <td>{vac.category}</td>
                                    <td>{formatCount(vac.male)}</td>
                                    <td>{formatCount(vac.female)}</td>
                                    <td className="total-cell">{formatCount(vac.total)}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td><strong>Total</strong></td>
                                <td><strong>{formatCount(jobDetails.vacancies.details.reduce((s, v) => s + toNumber(v.male), 0))}</strong></td>
                                <td><strong>{formatCount(jobDetails.vacancies.details.reduce((s, v) => s + toNumber(v.female), 0))}</strong></td>
                                <td className="total-cell"><strong>{formatCount(jobDetails.vacancies.total)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            )}

            {/* Eligibility */}
            {jobDetails.eligibility && (
                <section className="detail-section eligibility-section">
                    <h3 className="section-header eligibility-header">📚 Eligibility Criteria</h3>
                    <ul className="eligibility-list">
                        {jobDetails.eligibility.nationality && (
                            <li><strong>Nationality:</strong> {jobDetails.eligibility.nationality}</li>
                        )}
                        {jobDetails.eligibility.domicile && (
                            <li><strong>Domicile:</strong> {jobDetails.eligibility.domicile}</li>
                        )}
                        {jobDetails.eligibility.education && (
                            <li><strong>Education:</strong> {jobDetails.eligibility.education}</li>
                        )}
                        {jobDetails.eligibility.additional?.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Salary */}
            {jobDetails.salary && (jobDetails.salary.payLevel || jobDetails.salary.payScale) && (
                <section className="detail-section salary-section">
                    <h3 className="section-header salary-header">💵 Salary Details</h3>
                    <div className="salary-grid">
                        {jobDetails.salary.payLevel && (
                            <div className="salary-item">
                                <span className="salary-label">Pay Level</span>
                                <span className="salary-value">{jobDetails.salary.payLevel}</span>
                            </div>
                        )}
                        {jobDetails.salary.payScale && (
                            <div className="salary-item">
                                <span className="salary-label">Pay Scale</span>
                                <span className="salary-value">{jobDetails.salary.payScale}</span>
                            </div>
                        )}
                        {jobDetails.salary.inHandSalary && (
                            <div className="salary-item highlight">
                                <span className="salary-label">In-Hand Salary</span>
                                <span className="salary-value">{jobDetails.salary.inHandSalary}</span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Physical Requirements */}
            {jobDetails.physicalRequirements && (
                <section className="detail-section physical-section">
                    <h3 className="section-header physical-header">🏃 Physical Eligibility</h3>
                    <div className="physical-grid">
                        {jobDetails.physicalRequirements.male && (
                            <div className="physical-card male">
                                <h4>👨 Male Candidates</h4>
                                <ul>
                                    {jobDetails.physicalRequirements.male.heightGeneral && (
                                        <li>Height (General): {jobDetails.physicalRequirements.male.heightGeneral}</li>
                                    )}
                                    {jobDetails.physicalRequirements.male.heightSCST && (
                                        <li>Height (SC/ST): {jobDetails.physicalRequirements.male.heightSCST}</li>
                                    )}
                                    {jobDetails.physicalRequirements.male.chestNormal && (
                                        <li>Chest (Normal): {jobDetails.physicalRequirements.male.chestNormal}</li>
                                    )}
                                    {jobDetails.physicalRequirements.male.chestExpanded && (
                                        <li>Chest (Expanded): {jobDetails.physicalRequirements.male.chestExpanded}</li>
                                    )}
                                    {jobDetails.physicalRequirements.male.running && (
                                        <li>Running: {jobDetails.physicalRequirements.male.running}</li>
                                    )}
                                </ul>
                            </div>
                        )}
                        {jobDetails.physicalRequirements.female && (
                            <div className="physical-card female">
                                <h4>👩 Female Candidates</h4>
                                <ul>
                                    {jobDetails.physicalRequirements.female.heightGeneral && (
                                        <li>Height (General): {jobDetails.physicalRequirements.female.heightGeneral}</li>
                                    )}
                                    {jobDetails.physicalRequirements.female.heightSCST && (
                                        <li>Height (SC/ST): {jobDetails.physicalRequirements.female.heightSCST}</li>
                                    )}
                                    {jobDetails.physicalRequirements.female.running && (
                                        <li>Running: {jobDetails.physicalRequirements.female.running}</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Exam Pattern */}
            {jobDetails.examPattern && jobDetails.examPattern.subjects && jobDetails.examPattern.subjects.length > 0 && (
                <section className="detail-section exam-section">
                    <h3 className="section-header exam-header">📝 Exam Pattern</h3>
                    <div className="exam-info">
                        <div className="exam-meta">
                            {jobDetails.examPattern.duration && <span>⏱️ Duration: {jobDetails.examPattern.duration}</span>}
                            {jobDetails.examPattern.totalQuestions && <span>📋 Questions: {jobDetails.examPattern.totalQuestions}</span>}
                            {jobDetails.examPattern.totalMarks && <span>📊 Total Marks: {jobDetails.examPattern.totalMarks}</span>}
                            {jobDetails.examPattern.negativeMarking && <span>⚠️ Negative Marking: {jobDetails.examPattern.negativeMarking}</span>}
                        </div>
                        <table className="exam-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Questions</th>
                                    <th>Marks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobDetails.examPattern.subjects.map((sub, i) => (
                                    <tr key={i}>
                                        <td>{sub.name}</td>
                                        <td>{sub.questions}</td>
                                        <td>{sub.marks}</td>
                                    </tr>
                                ))}
                                <tr className="total-row">
                                    <td><strong>Total</strong></td>
                                    <td><strong>{jobDetails.examPattern.totalQuestions}</strong></td>
                                    <td><strong>{jobDetails.examPattern.totalMarks}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Selection Process */}
            {jobDetails.selectionProcess && jobDetails.selectionProcess.length > 0 && (
                <section className="detail-section selection-section">
                    <h3 className="section-header selection-header">🎯 Selection Process</h3>
                    <div className="selection-steps">
                        {jobDetails.selectionProcess.map((step, i) => (
                            <div key={i} className="selection-step">
                                <div className="step-number">{step.step}</div>
                                <div className="step-content">
                                    <h4>{step.name}</h4>
                                    {step.description && <p>{step.description}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* How to Apply */}
            {jobDetails.howToApply && jobDetails.howToApply.length > 0 && (
                <section className="detail-section apply-section">
                    <h3 className="section-header apply-header">📝 How to Apply Online?</h3>
                    <ol className="apply-steps">
                        {jobDetails.howToApply.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                </section>
            )}

            {/* Important Links */}
            {jobDetails.importantLinks && jobDetails.importantLinks.length > 0 && (
                <section className="detail-section links-section">
                    <h3 className="section-header links-header">🔗 Important Links</h3>
                    <div className="links-grid">
                        {jobDetails.importantLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`link-btn ${link.type === 'primary' ? 'primary' : 'secondary'}`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* FAQs */}
            {jobDetails.faqs && jobDetails.faqs.length > 0 && (
                <section className="detail-section faq-section">
                    <h3 className="section-header faq-header">❓ Frequently Asked Questions</h3>
                    <div className="faq-list">
                        {jobDetails.faqs.map((faq, i) => (
                            <details key={i} className="faq-item">
                                <summary>{faq.question}</summary>
                                <p>{faq.answer}</p>
                            </details>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default JobDetailsRenderer;
