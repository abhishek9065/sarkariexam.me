import type {
    Announcement,
    AnnouncementCard,
    ContentType,
    HomepageFeedData,
    HomepageFeedSections,
    SearchSuggestion,
    Tag,
} from '@/app/lib/types';

type Seed = {
    id: string;
    slug: string;
    type: ContentType;
    title: string;
    organization: string;
    location?: string;
    totalPosts?: number;
    deadlineDays?: number | null;
    postedHoursAgo: number;
    updatedHoursAgo?: number;
    minQualification?: string;
    ageLimit?: string;
    applicationFee?: string;
    salaryMin?: number;
    salaryMax?: number;
    content: string;
    externalLink?: string;
    importantDates?: Array<{ label: string; dateOffsetDays: number; description?: string }>;
    tags?: string[];
    jobDetails?: Record<string, unknown>;
};

function hoursAgo(offset: number): string {
    return new Date(Date.now() - offset * 3_600_000).toISOString();
}

function daysFromNow(offset: number): string {
    return new Date(Date.now() + offset * 86_400_000).toISOString();
}

function makeTags(values: string[] = []): Tag[] {
    return values.map((name, index) => ({
        id: index + 1,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));
}

function makeAnnouncement(seed: Seed): Announcement {
    return {
        id: seed.id,
        title: seed.title,
        slug: seed.slug,
        type: seed.type,
        category: seed.type,
        organization: seed.organization,
        content: seed.content,
        externalLink: seed.externalLink ?? `https://www.${seed.organization.toLowerCase().replace(/[^a-z0-9]+/g, '')}.gov.in`,
        location: seed.location,
        deadline: seed.deadlineDays == null ? null : daysFromNow(seed.deadlineDays),
        minQualification: seed.minQualification,
        ageLimit: seed.ageLimit,
        applicationFee: seed.applicationFee,
        salaryMin: seed.salaryMin,
        salaryMax: seed.salaryMax,
        totalPosts: seed.totalPosts,
        postedBy: 'SarkariExams.me Desk',
        postedAt: hoursAgo(seed.postedHoursAgo),
        updatedAt: hoursAgo(seed.updatedHoursAgo ?? Math.max(1, seed.postedHoursAgo - 2)),
        isActive: true,
        viewCount: 1200 + seed.id.length * 137,
        tags: makeTags(seed.tags),
        importantDates: seed.importantDates?.map((item, index) => ({
            id: `${seed.id}-date-${index + 1}`,
            eventName: item.label,
            eventDate: daysFromNow(item.dateOffsetDays),
            description: item.description,
        })),
        jobDetails: seed.jobDetails,
    };
}

const SEEDS: Seed[] = [
    {
        id: 'job-1',
        slug: 'upsc-civil-services-2026',
        type: 'job',
        title: 'UPSC Civil Services 2026 Online Form',
        organization: 'UPSC',
        location: 'All India',
        totalPosts: 1206,
        deadlineDays: 18,
        postedHoursAgo: 4,
        minQualification: 'Graduate',
        ageLimit: '21-32 Years',
        applicationFee: 'General / OBC: Rs 100 | SC / ST / Female: Nil',
        salaryMin: 56100,
        salaryMax: 177500,
        tags: ['UPSC', 'Graduate', 'Civil Services'],
        importantDates: [
            { label: 'Application Start', dateOffsetDays: -2 },
            { label: 'Last Date', dateOffsetDays: 18 },
            { label: 'Prelims Exam', dateOffsetDays: 92 },
        ],
        content: '<p>Union Public Service Commission has released the Civil Services Examination 2026 notification for national-level administrative posts. Candidates should verify the official notification before applying.</p>',
        jobDetails: {
            officialPortal: 'https://upsc.gov.in',
            applicationSteps: [
                'Complete One Time Registration.',
                'Fill personal and educational details carefully.',
                'Upload scanned documents and photograph.',
                'Review the form and submit before the deadline.',
            ],
            faqs: [
                { question: 'Who can apply?', answer: 'Graduates from a recognized university who meet age criteria can apply.' },
                { question: 'Is there an age relaxation?', answer: 'Yes, age relaxation applies as per UPSC rules for reserved categories.' },
            ],
        },
    },
    {
        id: 'job-2',
        slug: 'ssc-cgl-2026-notification',
        type: 'job',
        title: 'SSC CGL 2026 Notification for 17,727 Vacancies',
        organization: 'SSC',
        location: 'All India',
        totalPosts: 17727,
        deadlineDays: 12,
        postedHoursAgo: 12,
        minQualification: 'Graduate',
        ageLimit: '18-32 Years',
        applicationFee: 'General / OBC: Rs 100 | SC / ST / Female: Nil',
        salaryMin: 25500,
        salaryMax: 142400,
        tags: ['SSC', 'CGL', 'Graduate'],
        importantDates: [
            { label: 'Notification Released', dateOffsetDays: -1 },
            { label: 'Last Date to Apply', dateOffsetDays: 12 },
            { label: 'Tier I Exam Window', dateOffsetDays: 58 },
        ],
        content: '<p>Staff Selection Commission has opened Combined Graduate Level 2026 applications for multiple ministries and departments. Review post-wise eligibility and age limits in the official notice.</p>',
    },
    {
        id: 'job-3',
        slug: 'rrb-ntpc-2026-recruitment',
        type: 'job',
        title: 'RRB NTPC 2026 Recruitment',
        organization: 'Railway Recruitment Board',
        location: 'All India',
        totalPosts: 11558,
        deadlineDays: 6,
        postedHoursAgo: 20,
        minQualification: '12th / Graduate',
        ageLimit: '18-33 Years',
        applicationFee: 'General / OBC: Rs 500 | SC / ST / Female: Rs 250',
        salaryMin: 19900,
        salaryMax: 92300,
        tags: ['RRB', 'Railway', 'NTPC'],
        importantDates: [
            { label: 'Apply Online Start', dateOffsetDays: -3 },
            { label: 'Apply Online Last Date', dateOffsetDays: 6 },
            { label: 'Fee Payment Last Date', dateOffsetDays: 8 },
        ],
        content: '<p>RRB NTPC 2026 online application is live for graduate and undergraduate categories. Region-wise vacancy details and CBT pattern are available in the official notification.</p>',
    },
    {
        id: 'job-4',
        slug: 'bihar-police-constable-2026',
        type: 'job',
        title: 'Bihar Police Constable 2026 Online Form',
        organization: 'CSBC Bihar',
        location: 'Bihar',
        totalPosts: 19838,
        deadlineDays: 0,
        postedHoursAgo: 28,
        minQualification: '12th Pass',
        ageLimit: '18-25 Years',
        applicationFee: 'General / OBC / EWS: Rs 675 | SC / ST: Rs 180',
        salaryMin: 21700,
        salaryMax: 69100,
        tags: ['Police', 'Bihar', '12th Pass'],
        importantDates: [
            { label: 'Form Start', dateOffsetDays: -18 },
            { label: 'Last Date Today', dateOffsetDays: 0 },
        ],
        content: '<p>Central Selection Board of Constable has announced Bihar Police Constable recruitment. Candidates should verify district-level requirements and physical standards before submitting the form.</p>',
    },
    {
        id: 'result-1',
        slug: 'upsc-cse-prelims-2025-result',
        type: 'result',
        title: 'UPSC CSE Prelims 2025 Result Declared',
        organization: 'UPSC',
        location: 'All India',
        postedHoursAgo: 5,
        tags: ['UPSC', 'Result'],
        content: '<p>UPSC has released the Civil Services Preliminary Examination 2025 result. Qualified candidates should prepare for the mains form and related documentation.</p>',
    },
    {
        id: 'result-2',
        slug: 'ssc-chsl-tier-1-2025-result',
        type: 'result',
        title: 'SSC CHSL Tier I 2025 Result Out',
        organization: 'SSC',
        location: 'All India',
        postedHoursAgo: 11,
        tags: ['SSC', 'CHSL', 'Result'],
        content: '<p>SSC CHSL Tier I result and cut-off marks have been released. Candidates should download the official PDF from the commission website.</p>',
    },
    {
        id: 'result-3',
        slug: 'ibps-clerk-mains-2025-result',
        type: 'result',
        title: 'IBPS Clerk Mains 2025 Result Available',
        organization: 'IBPS',
        location: 'All India',
        postedHoursAgo: 34,
        tags: ['IBPS', 'Banking', 'Result'],
        content: '<p>IBPS Clerk mains result is now available with state-wise score information. Final allotment and document verification updates should be tracked on the official IBPS portal.</p>',
    },
    {
        id: 'result-4',
        slug: 'bpsc-70th-prelims-result-2025',
        type: 'result',
        title: 'BPSC 70th Prelims 2025 Result Released',
        organization: 'BPSC',
        location: 'Bihar',
        postedHoursAgo: 46,
        tags: ['BPSC', 'State PSC', 'Result'],
        content: '<p>BPSC has declared the 70th preliminary result. Candidates shortlisted for the mains stage should check the next schedule on the official commission site.</p>',
    },
    {
        id: 'admit-1',
        slug: 'ssc-gd-2026-admit-card',
        type: 'admit-card',
        title: 'SSC GD Constable 2026 Admit Card Released',
        organization: 'SSC',
        location: 'All India',
        postedHoursAgo: 6,
        tags: ['SSC', 'Admit Card'],
        content: '<p>SSC GD admit card is live for upcoming exam phases. Region-wise download links should be verified before exam day.</p>',
    },
    {
        id: 'admit-2',
        slug: 'rrb-alp-2026-hall-ticket',
        type: 'admit-card',
        title: 'RRB ALP 2026 CBT I Hall Ticket',
        organization: 'Railway Recruitment Board',
        location: 'All India',
        postedHoursAgo: 15,
        tags: ['RRB', 'Admit Card'],
        content: '<p>RRB ALP hall ticket has been released for CBT I. Candidates should verify exam city, reporting time, and instructions before travel.</p>',
    },
    {
        id: 'admit-3',
        slug: 'neet-ug-2026-admit-card',
        type: 'admit-card',
        title: 'NEET UG 2026 Admit Card Download',
        organization: 'NTA',
        location: 'All India',
        postedHoursAgo: 31,
        tags: ['NTA', 'Medical', 'Admit Card'],
        content: '<p>NEET UG admit card has been activated for eligible candidates. Cross-check subject code, center details, and reporting instructions.</p>',
    },
    {
        id: 'admit-4',
        slug: 'upsc-cds-1-2026-admit-card',
        type: 'admit-card',
        title: 'UPSC CDS I 2026 Admit Card',
        organization: 'UPSC',
        location: 'All India',
        postedHoursAgo: 52,
        tags: ['UPSC', 'Defence', 'Admit Card'],
        content: '<p>UPSC CDS I 2026 admit card is now live. Download the official hall ticket and review photo identity requirements before exam day.</p>',
    },
    {
        id: 'answer-1',
        slug: 'ssc-cpo-2026-answer-key',
        type: 'answer-key',
        title: 'SSC CPO 2026 Paper I Answer Key',
        organization: 'SSC',
        location: 'All India',
        postedHoursAgo: 7,
        tags: ['SSC', 'Answer Key'],
        content: '<p>SSC CPO response sheet and answer key are available. Review the objection timeline carefully because the challenge window is limited.</p>',
    },
    {
        id: 'answer-2',
        slug: 'upsc-capf-2026-answer-key',
        type: 'answer-key',
        title: 'UPSC CAPF 2026 Answer Key Released',
        organization: 'UPSC',
        location: 'All India',
        postedHoursAgo: 18,
        tags: ['UPSC', 'CAPF', 'Answer Key'],
        content: '<p>UPSC CAPF answer key has been published. Candidates should compare the official set code before estimating expected marks.</p>',
    },
    {
        id: 'answer-3',
        slug: 'rrb-ntpc-2026-answer-key',
        type: 'answer-key',
        title: 'RRB NTPC 2026 CBT I Answer Key',
        organization: 'Railway Recruitment Board',
        location: 'All India',
        postedHoursAgo: 44,
        tags: ['RRB', 'Answer Key'],
        content: '<p>RRB NTPC provisional answer key has been uploaded along with response sheets. Candidates should note the objection fee and deadline in the official notice.</p>',
    },
    {
        id: 'answer-4',
        slug: 'ctet-february-2026-answer-key',
        type: 'answer-key',
        title: 'CTET February 2026 Answer Key',
        organization: 'CBSE',
        location: 'All India',
        postedHoursAgo: 63,
        tags: ['CTET', 'Teaching', 'Answer Key'],
        content: '<p>CTET answer key and objection notice are now available. Track final answer key and scorecard release from the official portal.</p>',
    },
    {
        id: 'syllabus-1',
        slug: 'upsc-civil-services-2026-syllabus',
        type: 'syllabus',
        title: 'UPSC Civil Services 2026 Syllabus PDF',
        organization: 'UPSC',
        location: 'All India',
        postedHoursAgo: 9,
        tags: ['UPSC', 'Syllabus'],
        content: '<p>UPSC Civil Services detailed syllabus is available with prelims and mains topic coverage. Candidates should align preparation directly with the official subject outline.</p>',
    },
    {
        id: 'syllabus-2',
        slug: 'ssc-cgl-2026-syllabus',
        type: 'syllabus',
        title: 'SSC CGL 2026 Exam Pattern and Syllabus',
        organization: 'SSC',
        location: 'All India',
        postedHoursAgo: 22,
        tags: ['SSC', 'Syllabus'],
        content: '<p>SSC CGL exam pattern and subject coverage have been refreshed for the new cycle. Review quantitative aptitude, reasoning, English, and general awareness sections carefully.</p>',
    },
    {
        id: 'syllabus-3',
        slug: 'rrb-ntpc-2026-syllabus',
        type: 'syllabus',
        title: 'RRB NTPC 2026 CBT Syllabus Updated',
        organization: 'Railway Recruitment Board',
        location: 'All India',
        postedHoursAgo: 37,
        tags: ['RRB', 'Syllabus'],
        content: '<p>RRB NTPC syllabus update includes CBT structure and topic priorities. Candidates should also review the official normalization and stage progression rules.</p>',
    },
    {
        id: 'syllabus-4',
        slug: 'nda-2026-maths-gat-syllabus',
        type: 'syllabus',
        title: 'NDA 2026 Mathematics and GAT Syllabus',
        organization: 'UPSC',
        location: 'All India',
        postedHoursAgo: 58,
        tags: ['UPSC', 'Defence', 'Syllabus'],
        content: '<p>NDA syllabus coverage is available for mathematics and the General Ability Test. Use the official topic scope before beginning mock test planning.</p>',
    },
    {
        id: 'admission-1',
        slug: 'neet-ug-2026-online-application',
        type: 'admission',
        title: 'NEET UG 2026 Online Application',
        organization: 'NTA',
        location: 'All India',
        deadlineDays: 14,
        postedHoursAgo: 8,
        minQualification: '12th with PCB',
        applicationFee: 'General: Rs 1700 | OBC / EWS: Rs 1600 | SC / ST / PwD: Rs 1000',
        tags: ['Medical', 'Admission'],
        importantDates: [
            { label: 'Registration Start', dateOffsetDays: -2 },
            { label: 'Registration Last Date', dateOffsetDays: 14 },
            { label: 'Exam Date', dateOffsetDays: 65 },
        ],
        content: '<p>NEET UG 2026 registration is open for undergraduate medical admissions. Check category-wise fees and document upload rules before submitting the application.</p>',
    },
    {
        id: 'admission-2',
        slug: 'cuet-ug-2026-registration',
        type: 'admission',
        title: 'CUET UG 2026 Registration Form',
        organization: 'NTA',
        location: 'All India',
        deadlineDays: 9,
        postedHoursAgo: 17,
        minQualification: '12th Pass / Appearing',
        tags: ['CUET', 'Admission'],
        importantDates: [
            { label: 'Apply Online Start', dateOffsetDays: -4 },
            { label: 'Apply Online Last Date', dateOffsetDays: 9 },
        ],
        content: '<p>CUET UG online registration has started for central university admissions. Candidates should match subject selections with target program requirements before payment.</p>',
    },
    {
        id: 'admission-3',
        slug: 'up-bed-2026-admission-form',
        type: 'admission',
        title: 'UP BEd 2026 Admission Form',
        organization: 'Bundelkhand University',
        location: 'Uttar Pradesh',
        deadlineDays: 3,
        postedHoursAgo: 27,
        minQualification: 'Graduate',
        tags: ['Teaching', 'UP', 'Admission'],
        importantDates: [
            { label: 'Registration Start', dateOffsetDays: -15 },
            { label: 'Last Date', dateOffsetDays: 3 },
            { label: 'Entrance Test', dateOffsetDays: 34 },
        ],
        content: '<p>UP BEd Joint Entrance Examination application form remains open for a limited time. Check eligibility and required academic percentage before submission.</p>',
    },
    {
        id: 'admission-4',
        slug: 'bihar-deled-2026-admission',
        type: 'admission',
        title: 'Bihar DElEd Admission 2026',
        organization: 'BSEB',
        location: 'Bihar',
        deadlineDays: 1,
        postedHoursAgo: 43,
        minQualification: '12th Pass',
        tags: ['Bihar', 'Diploma', 'Admission'],
        importantDates: [
            { label: 'Form Start', dateOffsetDays: -11 },
            { label: 'Last Date', dateOffsetDays: 1 },
        ],
        content: '<p>Bihar DElEd admission registration window is close to ending. Verify training institute eligibility, reservation rules, and counselling updates on the board website.</p>',
    },
];

export const FALLBACK_ANNOUNCEMENTS: Announcement[] = SEEDS.map(makeAnnouncement);

export function getFallbackAnnouncementCards(type?: ContentType): AnnouncementCard[] {
    return FALLBACK_ANNOUNCEMENTS
        .filter((item) => !type || item.type === type)
        .map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            type: item.type,
            category: item.category,
            organization: item.organization,
            location: item.location,
            deadline: item.deadline,
            totalPosts: item.totalPosts,
            postedAt: item.postedAt,
            viewCount: item.viewCount,
        }))
        .sort((left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime());
}

export function getFallbackHomepageSections(): HomepageFeedSections {
    return {
        job: getFallbackAnnouncementCards('job').slice(0, 8),
        result: getFallbackAnnouncementCards('result').slice(0, 8),
        'admit-card': getFallbackAnnouncementCards('admit-card').slice(0, 8),
        'answer-key': getFallbackAnnouncementCards('answer-key').slice(0, 8),
        syllabus: getFallbackAnnouncementCards('syllabus').slice(0, 8),
        admission: getFallbackAnnouncementCards('admission').slice(0, 8),
    };
}

export function getFallbackHomepageFeed(): HomepageFeedData {
    return {
        latest: getFallbackAnnouncementCards().slice(0, 16),
        sections: getFallbackHomepageSections(),
        generatedAt: new Date().toISOString(),
    };
}

export function getFallbackAnnouncementBySlug(type: ContentType, slug: string): Announcement | null {
    return FALLBACK_ANNOUNCEMENTS.find((item) => item.type === type && item.slug === slug) ?? null;
}

export function getFallbackSearchSuggestions(query: string, type?: ContentType): SearchSuggestion[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return FALLBACK_ANNOUNCEMENTS
        .filter((item) => (!type || item.type === type)
            && `${item.title} ${item.organization} ${item.location ?? ''}`.toLowerCase().includes(normalized))
        .slice(0, 8)
        .map((item) => ({
            title: item.title,
            slug: item.slug,
            type: item.type,
            organization: item.organization,
        }));
}

export function getFallbackTrendingSearches(): string[] {
    return ['SSC CGL', 'UPSC', 'Railway', 'Bank PO', 'Police Vacancy', 'BPSC', 'NEET UG', 'CUET'];
}

export function getFallbackOrganizations(): string[] {
    return [...new Set(FALLBACK_ANNOUNCEMENTS.map((item) => item.organization))].sort((left, right) => left.localeCompare(right));
}
