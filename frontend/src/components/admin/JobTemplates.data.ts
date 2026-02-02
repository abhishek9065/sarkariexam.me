import type { JobDetails } from './JobPostingForm';

export interface JobTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    data: Partial<JobDetails>;
}

// Common templates for Indian government jobs
export const JOB_TEMPLATES: JobTemplate[] = [
    {
        id: 'ssc-cgl',
        name: 'SSC CGL',
        description: 'Staff Selection Commission Combined Graduate Level',
        icon: '📋',
        data: {
            importantDates: [
                { name: 'Application Begin', date: '' },
                { name: 'Last Date to Apply', date: '' },
                { name: 'Last Date Fee Payment', date: '' },
                { name: 'Tier-I Exam Date', date: '' },
                { name: 'Tier-II Exam Date', date: '' },
            ],
            applicationFees: [
                { category: 'General / OBC', amount: 100 },
                { category: 'SC / ST / PwD / Female', amount: 0 },
            ],
            ageLimits: {
                minAge: 18,
                maxAge: 32,
                asOnDate: '',
                relaxations: [
                    { category: 'OBC', years: 3, maxAge: 35 },
                    { category: 'SC/ST', years: 5, maxAge: 37 },
                    { category: 'PwD (Gen)', years: 10, maxAge: 42 },
                ],
            },
            eligibility: {
                nationality: 'Indian',
                domicile: '',
                education: 'Bachelor\'s Degree from a recognized University',
                additional: ['Candidates must be permanent citizens of India'],
            },
            examPattern: {
                totalQuestions: 100,
                totalMarks: 200,
                duration: '60 minutes',
                negativeMarking: '0.50 marks for each wrong answer',
                subjects: [
                    { name: 'General Intelligence & Reasoning', questions: 25, marks: 50 },
                    { name: 'General Awareness', questions: 25, marks: 50 },
                    { name: 'Quantitative Aptitude', questions: 25, marks: 50 },
                    { name: 'English Comprehension', questions: 25, marks: 50 },
                ],
            },
            selectionProcess: [
                { step: 1, name: 'Tier-I (CBE)', description: 'Computer Based Examination' },
                { step: 2, name: 'Tier-II (CBE)', description: 'Computer Based Examination' },
                { step: 3, name: 'Document Verification', description: 'Original document verification' },
            ],
        },
    },
    {
        id: 'railway-ntpc',
        name: 'Railway NTPC',
        description: 'Railway Non-Technical Popular Categories',
        icon: '🚂',
        data: {
            importantDates: [
                { name: 'Application Begin', date: '' },
                { name: 'Last Date to Apply', date: '' },
                { name: 'CBT-1 Exam Date', date: '' },
                { name: 'CBT-2 Exam Date', date: '' },
            ],
            applicationFees: [
                { category: 'General / OBC', amount: 500 },
                { category: 'SC / ST / Ex-Serviceman / Female', amount: 250 },
            ],
            ageLimits: {
                minAge: 18,
                maxAge: 33,
                asOnDate: '',
                relaxations: [
                    { category: 'OBC', years: 3, maxAge: 36 },
                    { category: 'SC/ST', years: 5, maxAge: 38 },
                ],
            },
            eligibility: {
                nationality: 'Indian',
                domicile: '',
                education: '12th Pass / Graduation (as per post)',
                additional: ['Physical standards as per Railway norms'],
            },
            examPattern: {
                totalQuestions: 100,
                totalMarks: 100,
                duration: '90 minutes',
                negativeMarking: '1/3 of marks for each wrong answer',
                subjects: [
                    { name: 'General Awareness', questions: 40, marks: 40 },
                    { name: 'Mathematics', questions: 30, marks: 30 },
                    { name: 'General Intelligence & Reasoning', questions: 30, marks: 30 },
                ],
            },
            selectionProcess: [
                { step: 1, name: 'CBT-1', description: 'Computer Based Test Stage 1' },
                { step: 2, name: 'CBT-2', description: 'Computer Based Test Stage 2' },
                { step: 3, name: 'Typing/Skill Test', description: 'Skill test for applicable posts' },
                { step: 4, name: 'Document Verification', description: 'Original documents' },
            ],
        },
    },
    {
        id: 'bank-po',
        name: 'Bank PO/Clerk',
        description: 'Banking Probationary Officer / Clerk',
        icon: '🏦',
        data: {
            importantDates: [
                { name: 'Application Begin', date: '' },
                { name: 'Last Date to Apply', date: '' },
                { name: 'Prelims Exam Date', date: '' },
                { name: 'Mains Exam Date', date: '' },
            ],
            applicationFees: [
                { category: 'General / OBC / EWS', amount: 850 },
                { category: 'SC / ST / PwD', amount: 175 },
            ],
            ageLimits: {
                minAge: 20,
                maxAge: 30,
                asOnDate: '',
                relaxations: [
                    { category: 'OBC', years: 3, maxAge: 33 },
                    { category: 'SC/ST', years: 5, maxAge: 35 },
                ],
            },
            eligibility: {
                nationality: 'Indian',
                domicile: '',
                education: 'Bachelor\'s Degree in any discipline from a recognized University',
                additional: ['Proficiency in local language is preferred'],
            },
            examPattern: {
                totalQuestions: 100,
                totalMarks: 100,
                duration: '60 minutes',
                negativeMarking: '0.25 marks for each wrong answer',
                subjects: [
                    { name: 'English Language', questions: 30, marks: 30 },
                    { name: 'Quantitative Aptitude', questions: 35, marks: 35 },
                    { name: 'Reasoning Ability', questions: 35, marks: 35 },
                ],
            },
            selectionProcess: [
                { step: 1, name: 'Prelims', description: 'Preliminary Examination' },
                { step: 2, name: 'Mains', description: 'Main Examination' },
                { step: 3, name: 'Interview', description: 'Personal Interview' },
            ],
        },
    },
    {
        id: 'state-psc',
        name: 'State PSC',
        description: 'State Public Service Commission Exam',
        icon: '🏛️',
        data: {
            importantDates: [
                { name: 'Application Begin', date: '' },
                { name: 'Last Date to Apply', date: '' },
                { name: 'Prelims Exam Date', date: '' },
                { name: 'Mains Exam Date', date: '' },
                { name: 'Interview Date', date: '' },
            ],
            applicationFees: [
                { category: 'General / OBC', amount: 200 },
                { category: 'SC / ST', amount: 0 },
            ],
            ageLimits: {
                minAge: 21,
                maxAge: 40,
                asOnDate: '',
                relaxations: [
                    { category: 'OBC', years: 3, maxAge: 43 },
                    { category: 'SC/ST', years: 5, maxAge: 45 },
                ],
            },
            eligibility: {
                nationality: 'Indian',
                domicile: 'State Domicile Required',
                education: 'Bachelor\'s Degree from a recognized University',
                additional: ['Must be a domicile of the respective state'],
            },
            selectionProcess: [
                { step: 1, name: 'Prelims', description: 'Preliminary Examination (Objective)' },
                { step: 2, name: 'Mains', description: 'Main Examination (Descriptive)' },
                { step: 3, name: 'Interview', description: 'Personality Test / Interview' },
            ],
        },
    },
    {
        id: 'defense',
        name: 'Defense Jobs',
        description: 'Army, Navy, Air Force vacancies',
        icon: '⚔️',
        data: {
            importantDates: [
                { name: 'Application Begin', date: '' },
                { name: 'Last Date to Apply', date: '' },
                { name: 'Admit Card Date', date: '' },
                { name: 'Written Exam Date', date: '' },
                { name: 'Physical Test Date', date: '' },
            ],
            applicationFees: [
                { category: 'All Categories', amount: 0 },
            ],
            ageLimits: {
                minAge: 17,
                maxAge: 25,
                asOnDate: '',
                relaxations: [],
            },
            eligibility: {
                nationality: 'Indian',
                domicile: '',
                education: '10th / 12th Pass (as per post)',
                additional: [
                    'Physical fitness requirements apply',
                    'Medical standards as per defense norms',
                ],
            },
            selectionProcess: [
                { step: 1, name: 'Written Exam', description: 'Written Examination' },
                { step: 2, name: 'Physical Test', description: 'Physical Fitness Test' },
                { step: 3, name: 'Medical Test', description: 'Medical Examination' },
                { step: 4, name: 'Document Verification', description: 'Original documents' },
            ],
        },
    },
];
