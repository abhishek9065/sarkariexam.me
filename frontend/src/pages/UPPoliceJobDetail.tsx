import { useState } from 'react';
import { DeadlineCountdown } from '../components/ui/DeadlineCountdown';
import { QuickActionsBar } from '../components/ui/QuickActionsBar';
import './V2.css';

/**
 * Comprehensive Job Detail Page - UP Police Constable 2026
 * Classic Sarkari Result Style with all sections
 */
export function UPPoliceJobDetail() {
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const toggleFaq = (index: number) => setActiveFaq((current) => (current === index ? null : index));

    // Job Data
    const job = {
        title: 'UP Police Constable Recruitment 2026',
        organization: 'Uttar Pradesh Police Recruitment and Promotion Board (UPPRPB)',
        postName: 'Constable (Civil Police)',
        totalPosts: 32679,
        advtNo: 'UPPRPB/2026/01',
        applyStart: '2026-01-15',
        applyEnd: '2026-02-28',
        examDate: '2026-05-15',
        admitCardDate: '2026-05-01',
        resultDate: 'To be announced',
        applyLink: 'https://uppbpb.gov.in',
        notificationLink: '#',
        officialWebsite: 'https://uppbpb.gov.in',
    };

    const importantDates = [
        { label: 'Application Begin', date: job.applyStart, type: 'start' as const },
        { label: 'Last Date to Apply', date: job.applyEnd, type: 'end' as const },
        { label: 'Last Date Fee Payment', date: job.applyEnd, type: 'end' as const },
        { label: 'Exam Date', date: job.examDate, type: 'exam' as const },
        { label: 'Admit Card Available', date: job.admitCardDate, type: 'other' as const },
    ];

    const applicationFee = [
        { category: 'General / OBC / EWS', fee: '₹400' },
        { category: 'SC / ST', fee: '₹400' },
        { category: 'PH (Divyang)', fee: '₹400' },
        { category: 'Payment Mode', fee: 'Online (Debit Card / Credit Card / Net Banking / UPI)' },
    ];

    const ageLimit = {
        cutoffDate: '01 July 2025',
        minAge: 18,
        maxAge: 22,
        relaxation: [
            { category: 'OBC (UP Domicile)', years: 3, maxAge: 25 },
            { category: 'SC / ST (UP Domicile)', years: 5, maxAge: 27 },
            { category: 'PH (General)', years: 15, maxAge: 37 },
            { category: 'PH (OBC)', years: 18, maxAge: 40 },
            { category: 'PH (SC/ST)', years: 20, maxAge: 42 },
        ],
    };

    const categoryVacancy = [
        { category: 'General', male: 8500, female: 2500, total: 11000 },
        { category: 'OBC', male: 7000, female: 2000, total: 9000 },
        { category: 'SC', male: 5500, female: 1500, total: 7000 },
        { category: 'ST', male: 600, female: 200, total: 800 },
        { category: 'EWS', male: 3500, female: 1379, total: 4879 },
    ];

    const physicalEligibility = {
        male: {
            height: { general: '168 cm', sc_st: '160 cm' },
            chest: { normal: '79 cm', expanded: '84 cm' },
            running: '4.8 km in 25 minutes',
        },
        female: {
            height: { general: '152 cm', sc_st: '147 cm' },
            running: '2.4 km in 14 minutes',
        },
    };

    const examPattern = [
        { subject: 'General Hindi', questions: 37, marks: 74 },
        { subject: 'General Knowledge / Current Affairs', questions: 38, marks: 76 },
        { subject: 'Numerical Ability', questions: 38, marks: 76 },
        { subject: 'Mental Aptitude / IQ / Reasoning', questions: 37, marks: 74 },
    ];

    const selectionProcess = [
        { step: 1, name: 'Written Exam (CBT)', description: 'Computer Based Test - 150 Questions, 300 Marks, 2 Hours' },
        { step: 2, name: 'Physical Standard Test (PST)', description: 'Height & Chest Measurement' },
        { step: 3, name: 'Physical Efficiency Test (PET)', description: 'Running Test' },
        { step: 4, name: 'Document Verification', description: 'Original Documents Verification' },
        { step: 5, name: 'Medical Examination', description: 'Medical Fitness Test' },
        { step: 6, name: 'Final Merit List', description: 'Based on Written Exam Marks' },
    ];

    const faqs = [
        { q: 'What is UP Police Constable 2026 Salary?', a: 'Pay Scale: ₹21,700 - ₹69,100 (Pay Level-3). In-hand salary approximately ₹25,000 - ₹30,000 per month.' },
        { q: 'What is the educational qualification?', a: 'Candidate must have passed 12th (Intermediate) from any recognized board.' },
        { q: 'Is there negative marking?', a: 'Yes, 0.25 marks will be deducted for each wrong answer.' },
        { q: 'Can female candidates apply?', a: 'Yes, both male and female candidates can apply. Separate vacancies are available.' },
        { q: 'Is UP domicile mandatory?', a: 'Yes, candidates must be domicile of Uttar Pradesh.' },
    ];

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="job-detail-page sr-v2-up-police">
            {/* Header */}
            <div className="job-header sr-v2-up-police-header">
                <div className="job-badge">🚔 UP Police</div>
                <h1>{job.title}</h1>
                <p className="job-org">{job.organization}</p>
                <div className="job-highlight">
                    <span className="posts-count">👥 {job.totalPosts.toLocaleString()} Posts</span>
                    <span className="post-name">📋 {job.postName}</span>
                </div>
            </div>

            {/* Deadline Countdown */}
            <DeadlineCountdown deadline={job.applyEnd} label="Last Date to Apply" />

            {/* Quick Actions */}
            <QuickActionsBar
                applyLink={job.applyLink}
                notificationLink={job.notificationLink}
            />

            {/* Important Dates */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header maroon">📅 Important Dates</h2>
                <table className="info-table">
                    <tbody>
                        {importantDates.map((item, i) => (
                            <tr key={i}>
                                <td>{item.label}</td>
                                <td className="date-cell">{formatDate(item.date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Application Fee */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header blue">💰 Application Fee</h2>
                <table className="info-table">
                    <tbody>
                        {applicationFee.map((item, i) => (
                            <tr key={i}>
                                <td>{item.category}</td>
                                <td className="fee-cell">{item.fee}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Age Limit */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header green">👤 Age Limits (As on {ageLimit.cutoffDate})</h2>
                <div className="age-box">
                    <div className="age-main">
                        <span className="age-label">Minimum Age</span>
                        <span className="age-value">{ageLimit.minAge} Years</span>
                    </div>
                    <div className="age-main">
                        <span className="age-label">Maximum Age</span>
                        <span className="age-value">{ageLimit.maxAge} Years</span>
                    </div>
                </div>
                <h4>Age Relaxation:</h4>
                <table className="info-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Relaxation</th>
                            <th>Max Age</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ageLimit.relaxation.map((item, i) => (
                            <tr key={i}>
                                <td>{item.category}</td>
                                <td>{item.years} Years</td>
                                <td className="age-cell">{item.maxAge} Years</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Category-wise Vacancy */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header orange">📊 Category-wise Vacancy Details</h2>
                <table className="info-table vacancy-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Male</th>
                            <th>Female</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryVacancy.map((item, i) => (
                            <tr key={i}>
                                <td>{item.category}</td>
                                <td>{item.male.toLocaleString()}</td>
                                <td>{item.female.toLocaleString()}</td>
                                <td className="total-cell">{item.total.toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr className="total-row">
                            <td><strong>Total</strong></td>
                            <td><strong>{categoryVacancy.reduce((a, b) => a + b.male, 0).toLocaleString()}</strong></td>
                            <td><strong>{categoryVacancy.reduce((a, b) => a + b.female, 0).toLocaleString()}</strong></td>
                            <td className="total-cell"><strong>{job.totalPosts.toLocaleString()}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Eligibility */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header purple">📚 Eligibility Criteria</h2>
                <ul className="eligibility-list">
                    <li><strong>Nationality:</strong> Indian Citizen</li>
                    <li><strong>Domicile:</strong> Must be domicile of Uttar Pradesh</li>
                    <li><strong>Education:</strong> 12th Pass (Intermediate) from any recognized board</li>
                    <li><strong>Age:</strong> 18 to 22 years (relaxation as per rules)</li>
                    <li><strong>Physical Fitness:</strong> As per UP Police standards</li>
                </ul>
            </section>

            {/* Salary */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header teal">💵 UP Police Constable Salary 2026</h2>
                <div className="salary-box">
                    <div className="salary-item">
                        <span className="salary-label">Pay Level</span>
                        <span className="salary-value">Level - 3</span>
                    </div>
                    <div className="salary-item">
                        <span className="salary-label">Pay Scale</span>
                        <span className="salary-value">₹21,700 - ₹69,100</span>
                    </div>
                    <div className="salary-item">
                        <span className="salary-label">In-Hand Salary</span>
                        <span className="salary-value highlight">₹25,000 - ₹30,000</span>
                    </div>
                </div>
            </section>

            {/* Physical Eligibility */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header red">🏃 Physical Eligibility 2026</h2>
                <div className="physical-grid">
                    <div className="physical-card male">
                        <h4>👨 Male Candidates</h4>
                        <ul>
                            <li><strong>Height (General):</strong> {physicalEligibility.male.height.general}</li>
                            <li><strong>Height (SC/ST):</strong> {physicalEligibility.male.height.sc_st}</li>
                            <li><strong>Chest (Normal):</strong> {physicalEligibility.male.chest.normal}</li>
                            <li><strong>Chest (Expanded):</strong> {physicalEligibility.male.chest.expanded}</li>
                            <li><strong>Running:</strong> {physicalEligibility.male.running}</li>
                        </ul>
                    </div>
                    <div className="physical-card female">
                        <h4>👩 Female Candidates</h4>
                        <ul>
                            <li><strong>Height (General):</strong> {physicalEligibility.female.height.general}</li>
                            <li><strong>Height (SC/ST):</strong> {physicalEligibility.female.height.sc_st}</li>
                            <li><strong>Running:</strong> {physicalEligibility.female.running}</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Exam Pattern */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header indigo">📝 Exam Pattern 2026</h2>
                <table className="info-table exam-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Questions</th>
                            <th>Marks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {examPattern.map((item, i) => (
                            <tr key={i}>
                                <td>{item.subject}</td>
                                <td>{item.questions}</td>
                                <td>{item.marks}</td>
                            </tr>
                        ))}
                        <tr className="total-row">
                            <td><strong>Total</strong></td>
                            <td><strong>{examPattern.reduce((a, b) => a + b.questions, 0)}</strong></td>
                            <td><strong>{examPattern.reduce((a, b) => a + b.marks, 0)}</strong></td>
                        </tr>
                    </tbody>
                </table>
                <div className="exam-note">
                    ⚠️ <strong>Note:</strong> Negative Marking: 0.25 marks for each wrong answer. Time: 2 Hours.
                </div>
            </section>

            {/* Selection Process */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header cyan">🎯 Selection Process</h2>
                <div className="selection-steps">
                    {selectionProcess.map((item) => (
                        <div key={item.step} className="selection-step">
                            <div className="step-number">{item.step}</div>
                            <div className="step-content">
                                <h4>{item.name}</h4>
                                <p>{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How to Apply */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header pink">📝 How to Apply Online?</h2>
                <ol className="apply-steps">
                    <li>Visit the official website: <a href={job.officialWebsite} target="_blank" rel="noopener">{job.officialWebsite}</a></li>
                    <li>Click on "Apply Online" link for UP Police Constable 2026</li>
                    <li>Register with valid Email ID and Mobile Number</li>
                    <li>Fill the application form with correct details</li>
                    <li>Upload Photo, Signature, and Documents</li>
                    <li>Pay the application fee online</li>
                    <li>Submit the form and take printout for future reference</li>
                </ol>
            </section>

            {/* Important Links */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header dark">🔗 Important Links</h2>
                <table className="links-table">
                    <tbody>
                        <tr>
                            <td>Apply Online</td>
                            <td><a href={job.applyLink} target="_blank" rel="noopener" className="link-btn green">Click Here</a></td>
                        </tr>
                        <tr>
                            <td>Download Notification</td>
                            <td><a href={job.notificationLink} target="_blank" rel="noopener" className="link-btn blue">Click Here</a></td>
                        </tr>
                        <tr>
                            <td>Official Website</td>
                            <td><a href={job.officialWebsite} target="_blank" rel="noopener" className="link-btn orange">Click Here</a></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* FAQs */}
            <section className="detail-section sr-v2-universal-section">
                <h2 className="section-header gray">❓ Frequently Asked Questions (FAQs)</h2>
                <div className="faq-list">
                    {faqs.map((faq, i) => (
                        <div key={i} className={`faq-item ${activeFaq === i ? 'active' : ''}`}>
                            <button
                                type="button"
                                className="faq-question sr-v2-faq-trigger"
                                onClick={() => toggleFaq(i)}
                                aria-expanded={activeFaq === i}
                                aria-controls={`up-police-faq-panel-${i}`}
                                id={`up-police-faq-trigger-${i}`}
                            >
                                <span>{faq.q}</span>
                                <span className="faq-toggle">{activeFaq === i ? '−' : '+'}</span>
                            </button>
                            {activeFaq === i && (
                                <div
                                    id={`up-police-faq-panel-${i}`}
                                    role="region"
                                    aria-labelledby={`up-police-faq-trigger-${i}`}
                                    className="faq-answer sr-v2-faq-panel"
                                >
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer Note */}
            <div className="detail-footer">
                <p>📌 Bookmark this page for updates. Share with friends who are preparing for UP Police Constable exam.</p>
            </div>
        </div>
    );
}

export default UPPoliceJobDetail;
