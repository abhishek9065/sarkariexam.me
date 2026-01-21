import { Announcement, ContentType } from '../types.js';

// Mock announcements data for development when PostgreSQL is unavailable
const rawMockAnnouncements = [
    // JOBS
    {
        id: 1,
        title: 'UPSC Civil Services 2024 - IAS/IPS/IFS Recruitment',
        slug: 'upsc-civil-services-2024',
        type: 'job',
        category: 'Central Government',
        organization: 'Union Public Service Commission',
        content: 'Applications invited for Civil Services Examination 2024.',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        deadline: new Date('2024-03-15'),
        minQualification: 'Graduate',
        ageLimit: '21-32 years',
        applicationFee: '₹100',
        totalPosts: 1056,
        postedAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
        isActive: true,
        viewCount: 15420,
        tags: [{ id: 1, name: 'UPSC', slug: 'upsc' }]
    },
    {
        id: 2,
        title: 'SSC CGL 2024 - Combined Graduate Level Examination',
        slug: 'ssc-cgl-2024',
        type: 'job',
        category: 'Central Government',
        organization: 'Staff Selection Commission',
        content: 'SSC CGL 2024 notification for Group B and C posts.',
        externalLink: 'https://ssc.nic.in',
        location: 'All India',
        deadline: new Date('2024-02-28'),
        totalPosts: 8000,
        postedAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        isActive: true,
        viewCount: 23567,
        tags: [{ id: 3, name: 'SSC', slug: 'ssc' }]
    },
    {
        id: 3,
        title: 'IBPS PO 2024 - Probationary Officer Recruitment',
        slug: 'ibps-po-2024',
        type: 'job',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        deadline: new Date('2024-03-20'),
        totalPosts: 4500,
        postedAt: new Date('2024-01-08'),
        updatedAt: new Date('2024-01-08'),
        isActive: true,
        viewCount: 18932,
        tags: [{ id: 5, name: 'IBPS', slug: 'ibps' }]
    },
    {
        id: 4,
        title: 'Indian Army Agniveer Rally 2024',
        slug: 'indian-army-agniveer-2024',
        type: 'job',
        category: 'Defence',
        organization: 'Indian Army',
        externalLink: 'https://joinindianarmy.nic.in',
        location: 'Multiple States',
        deadline: new Date('2024-03-10'),
        totalPosts: 25000,
        postedAt: new Date('2024-01-22'),
        updatedAt: new Date('2024-01-22'),
        isActive: true,
        viewCount: 54321,
        tags: [{ id: 17, name: 'Army', slug: 'army' }]
    },
    {
        id: 5,
        title: 'UPPSC PCS 2024 Preliminary Exam',
        slug: 'uppsc-pcs-2024',
        type: 'job',
        category: 'State Government',
        organization: 'UPPSC',
        externalLink: 'https://uppsc.up.nic.in',
        location: 'Uttar Pradesh',
        deadline: new Date('2024-02-25'),
        totalPosts: 450,
        postedAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-18'),
        isActive: true,
        viewCount: 19876,
        tags: [{ id: 19, name: 'UPPSC', slug: 'uppsc' }]
    },
    {
        id: 6,
        title: 'CSIR-CMERI Technician Recruitment 2026 Apply Online',
        slug: 'csir-cmeri-technician-2026',
        type: 'job',
        category: 'Central Government',
        organization: 'CSIR-CMERI',
        externalLink: 'https://cmeri.res.in',
        location: 'All India',
        deadline: new Date('2024-04-15'),
        totalPosts: 100,
        postedAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
        isActive: true,
        viewCount: 8765,
        tags: []
    },
    {
        id: 7,
        title: 'UPPSC Medical Officer Recruitment 2026',
        slug: 'uppsc-medical-officer-2026',
        type: 'job',
        category: 'State Government',
        organization: 'UPPSC',
        externalLink: 'https://uppsc.up.nic.in',
        location: 'Uttar Pradesh',
        deadline: new Date('2024-04-20'),
        totalPosts: 2158,
        postedAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26'),
        isActive: true,
        viewCount: 12345,
        tags: []
    },
    {
        id: 8,
        title: 'Bank of India Credit Officer Recruitment 2025',
        slug: 'boi-credit-officer-2025',
        type: 'job',
        category: 'Banking',
        organization: 'Bank of India',
        externalLink: 'https://bankofindia.co.in',
        location: 'All India',
        deadline: new Date('2024-03-30'),
        totalPosts: 514,
        postedAt: new Date('2024-01-27'),
        updatedAt: new Date('2024-01-27'),
        isActive: true,
        viewCount: 9876,
        tags: []
    },

    // RESULTS
    {
        id: 20,
        title: 'RRB NTPC 2024 Result - CBT Stage 1',
        slug: 'rrb-ntpc-2024-result',
        type: 'result',
        category: 'Railways',
        organization: 'Railway Recruitment Board',
        externalLink: 'https://rrbcdg.gov.in',
        location: 'All India',
        postedAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-12'),
        isActive: true,
        viewCount: 45678,
        tags: [{ id: 7, name: 'RRB', slug: 'rrb' }]
    },
    {
        id: 21,
        title: 'UPSC CMS Final Result 2025 [Out] Roll No Wise List',
        slug: 'upsc-cms-final-result-2025',
        type: 'result',
        category: 'Central Government',
        organization: 'UPSC',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        postedAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28'),
        isActive: true,
        viewCount: 34567,
        tags: []
    },
    {
        id: 22,
        title: 'IOCL JE Result 2025 Link, Junior Engineer Scorecard',
        slug: 'iocl-je-result-2025',
        type: 'result',
        category: 'PSU',
        organization: 'Indian Oil Corporation',
        externalLink: 'https://iocl.com',
        location: 'All India',
        postedAt: new Date('2024-01-27'),
        updatedAt: new Date('2024-01-27'),
        isActive: true,
        viewCount: 23456,
        tags: []
    },
    {
        id: 23,
        title: 'BSEB Bihar DEIEd 2nd Selection List 2025 [OUT]',
        slug: 'bseb-bihar-deied-selection-2025',
        type: 'result',
        category: 'State Government',
        organization: 'Bihar School Examination Board',
        externalLink: 'https://biharboardonline.com',
        location: 'Bihar',
        postedAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26'),
        isActive: true,
        viewCount: 18765,
        tags: []
    },
    {
        id: 24,
        title: 'IBPS RRB Prelims Result 2025 [Link] Scorecard',
        slug: 'ibps-rrb-prelims-result-2025',
        type: 'result',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        postedAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
        isActive: true,
        viewCount: 29876,
        tags: []
    },
    {
        id: 25,
        title: 'SSC CGL Tier-1 Result 2025 (Out) Marks, Scorecard',
        slug: 'ssc-cgl-tier1-result-2025',
        type: 'result',
        category: 'Central Government',
        organization: 'SSC',
        externalLink: 'https://ssc.nic.in',
        location: 'All India',
        postedAt: new Date('2024-01-24'),
        updatedAt: new Date('2024-01-24'),
        isActive: true,
        viewCount: 45678,
        tags: []
    },

    // ADMIT CARDS
    {
        id: 30,
        title: 'NEET UG 2024 Admit Card Released',
        slug: 'neet-ug-2024-admit-card',
        type: 'admit-card',
        category: 'Medical',
        organization: 'National Testing Agency',
        externalLink: 'https://nta.ac.in',
        location: 'All India',
        postedAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        isActive: true,
        viewCount: 67890,
        tags: [{ id: 9, name: 'NEET', slug: 'neet' }]
    },
    {
        id: 31,
        title: 'UP Police Home Guard Admit Card 2026 Link',
        slug: 'up-police-home-guard-admit-2026',
        type: 'admit-card',
        category: 'State Government',
        organization: 'UP Police',
        externalLink: 'https://uppbpb.gov.in',
        location: 'Uttar Pradesh',
        deadline: new Date('2024-02-10'),
        postedAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28'),
        isActive: true,
        viewCount: 23456,
        tags: []
    },
    {
        id: 32,
        title: 'RSSB Ayush Officer Admit Card 2025 Link',
        slug: 'rssb-ayush-officer-admit-2025',
        type: 'admit-card',
        category: 'State Government',
        organization: 'RSSB Rajasthan',
        externalLink: 'https://rsmssb.rajasthan.gov.in',
        location: 'Rajasthan',
        postedAt: new Date('2024-01-27'),
        updatedAt: new Date('2024-01-27'),
        isActive: true,
        viewCount: 12345,
        tags: []
    },
    {
        id: 33,
        title: 'IBPS RRB Mains Admit Card 2025 [OUT]',
        slug: 'ibps-rrb-mains-admit-2025',
        type: 'admit-card',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        postedAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26'),
        isActive: true,
        viewCount: 34567,
        tags: []
    },
    {
        id: 34,
        title: 'UGC NET December Admit Card 2025 (Link)',
        slug: 'ugc-net-december-admit-2025',
        type: 'admit-card',
        category: 'Central Government',
        organization: 'NTA',
        externalLink: 'https://ugcnet.nta.nic.in',
        location: 'All India',
        postedAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
        isActive: true,
        viewCount: 45678,
        tags: []
    },

    // ANSWER KEYS
    {
        id: 40,
        title: 'JEE Main 2024 Answer Key Released',
        slug: 'jee-main-2024-answer-key',
        type: 'answer-key',
        category: 'Engineering',
        organization: 'National Testing Agency',
        externalLink: 'https://jeemain.nta.nic.in',
        location: 'All India',
        deadline: new Date('2024-02-05'),
        postedAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28'),
        isActive: true,
        viewCount: 34567,
        tags: [{ id: 13, name: 'JEE', slug: 'jee' }]
    },
    {
        id: 41,
        title: 'Delhi DDA Answer Key 2025 [Out] Download Link',
        slug: 'delhi-dda-answer-key-2025',
        type: 'answer-key',
        category: 'Central Government',
        organization: 'DDA',
        externalLink: 'https://dda.org.in',
        location: 'Delhi',
        postedAt: new Date('2024-01-27'),
        updatedAt: new Date('2024-01-27'),
        isActive: true,
        viewCount: 12345,
        tags: []
    },
    {
        id: 42,
        title: 'MAHA TET 2025 Answer Key [Out] Paper 1 & 2',
        slug: 'maha-tet-answer-key-2025',
        type: 'answer-key',
        category: 'State Government',
        organization: 'Maharashtra State Council',
        externalLink: 'https://mahatet.in',
        location: 'Maharashtra',
        postedAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26'),
        isActive: true,
        viewCount: 23456,
        tags: []
    },
    {
        id: 43,
        title: 'Bihar JEEViKA Answer Key 2025 [Out] Download',
        slug: 'bihar-jeevika-answer-key-2025',
        type: 'answer-key',
        category: 'State Government',
        organization: 'Bihar Rural Livelihoods',
        externalLink: 'https://brlps.in',
        location: 'Bihar',
        postedAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
        isActive: true,
        viewCount: 8765,
        tags: []
    },
    {
        id: 44,
        title: 'SSC CHSL 10+2 Answer Key 2025 (Tier-1)',
        slug: 'ssc-chsl-answer-key-2025',
        type: 'answer-key',
        category: 'Central Government',
        organization: 'SSC',
        externalLink: 'https://ssc.nic.in',
        location: 'All India',
        postedAt: new Date('2024-01-24'),
        updatedAt: new Date('2024-01-24'),
        isActive: true,
        viewCount: 34567,
        tags: []
    },

    // ADMISSIONS
    {
        id: 50,
        title: 'DU Admissions 2024 - UG Programs',
        slug: 'du-admissions-2024',
        type: 'admission',
        category: 'University',
        organization: 'Delhi University',
        externalLink: 'https://admission.uod.ac.in',
        location: 'Delhi',
        deadline: new Date('2024-06-30'),
        postedAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
        isActive: true,
        viewCount: 28976,
        tags: [{ id: 15, name: 'DU', slug: 'du' }]
    },
    {
        id: 51,
        title: 'CUET PG 2026 Online Form {Apply} Exam Date',
        slug: 'cuet-pg-2026-form',
        type: 'admission',
        category: 'University',
        organization: 'NTA',
        externalLink: 'https://cuet.samarth.ac.in',
        location: 'All India',
        deadline: new Date('2024-05-15'),
        postedAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28'),
        isActive: true,
        viewCount: 23456,
        tags: []
    },
    {
        id: 52,
        title: 'JEE Main 2025 Session-1 January 2026',
        slug: 'jee-main-2025-session1',
        type: 'admission',
        category: 'Engineering',
        organization: 'NTA',
        externalLink: 'https://jeemain.nta.nic.in',
        location: 'All India',
        deadline: new Date('2024-04-30'),
        postedAt: new Date('2024-01-27'),
        updatedAt: new Date('2024-01-27'),
        isActive: true,
        viewCount: 45678,
        tags: []
    },
    {
        id: 53,
        title: 'NTA AISSEE 2026 (Sainik School) Admission Class',
        slug: 'nta-aissee-2026',
        type: 'admission',
        category: 'School',
        organization: 'NTA',
        externalLink: 'https://aissee.nta.nic.in',
        location: 'All India',
        deadline: new Date('2024-03-15'),
        postedAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26'),
        isActive: true,
        viewCount: 34567,
        tags: []
    },
    {
        id: 54,
        title: 'IIT GATE 2026 Admission, Apply Online Form',
        slug: 'iit-gate-2026',
        type: 'admission',
        category: 'Engineering',
        organization: 'IIT',
        externalLink: 'https://gate.iitg.ac.in',
        location: 'All India',
        deadline: new Date('2024-04-20'),
        postedAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
        isActive: true,
        viewCount: 56789,
        tags: []
    },

    // SYLLABUS
    {
        id: 60,
        title: 'GATE 2024 Syllabus - Computer Science',
        slug: 'gate-2024-syllabus-cs',
        type: 'syllabus',
        category: 'Engineering',
        organization: 'IIT Delhi',
        externalLink: 'https://gate2024.iisc.ac.in',
        location: 'All India',
        postedAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        isActive: true,
        viewCount: 12345,
        tags: [{ id: 11, name: 'GATE', slug: 'gate' }]
    },
    {
        id: 61,
        title: 'SSC CGL 2025 Syllabus PDF Download',
        slug: 'ssc-cgl-2025-syllabus',
        type: 'syllabus',
        category: 'Central Government',
        organization: 'SSC',
        externalLink: 'https://ssc.nic.in',
        location: 'All India',
        postedAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28'),
        isActive: true,
        viewCount: 23456,
        tags: []
    },
    {
        id: 62,
        title: 'UPSC CSE 2025 Syllabus - Prelims & Mains',
        slug: 'upsc-cse-2025-syllabus',
        type: 'syllabus',
        category: 'Central Government',
        organization: 'UPSC',
        externalLink: 'https://upsc.gov.in',
        location: 'All India',
        postedAt: new Date('2024-01-27'),
        updatedAt: new Date('2024-01-27'),
        isActive: true,
        viewCount: 34567,
        tags: []
    },
    {
        id: 63,
        title: 'IBPS PO 2025 Syllabus & Exam Pattern',
        slug: 'ibps-po-2025-syllabus',
        type: 'syllabus',
        category: 'Banking',
        organization: 'IBPS',
        externalLink: 'https://ibps.in',
        location: 'All India',
        postedAt: new Date('2024-01-26'),
        updatedAt: new Date('2024-01-26'),
        isActive: true,
        viewCount: 18765,
        tags: []
    },
    {
        id: 64,
        title: 'Railway RRB NTPC 2025 Syllabus PDF',
        slug: 'rrb-ntpc-2025-syllabus',
        type: 'syllabus',
        category: 'Railways',
        organization: 'RRB',
        externalLink: 'https://rrbcdg.gov.in',
        location: 'All India',
        postedAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
        isActive: true,
        viewCount: 29876,
        tags: []
    },
];

export const mockAnnouncements: Announcement[] = rawMockAnnouncements.map(item => ({
    ...item,
    id: item.id.toString(),
    type: item.type as ContentType,
    tags: item.tags?.map(tag => ({ ...tag })) || [],
    status: 'published',
    version: 1,
}));

// Filter mock announcements based on query params
export function filterMockAnnouncements(filters?: {
    type?: ContentType;
    search?: string;
    category?: string;
    organization?: string;
    limit?: number;
    offset?: number;
}): Announcement[] {
    let result = [...mockAnnouncements];

    if (filters?.type) {
        result = result.filter(a => a.type === filters.type);
    }

    if (filters?.category) {
        result = result.filter(a => a.category === filters.category);
    }

    if (filters?.organization) {
        result = result.filter(a => a.organization === filters.organization);
    }

    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(a =>
            a.title.toLowerCase().includes(searchLower) ||
            a.organization.toLowerCase().includes(searchLower) ||
            a.category.toLowerCase().includes(searchLower) ||
            a.content?.toLowerCase().includes(searchLower) ||
            a.tags?.some(t => t.name.toLowerCase().includes(searchLower))
        );
    }

    // Sort by posted date descending
    result.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 100;

    return result.slice(offset, offset + limit);
}

export function findMockBySlug(slug: string): Announcement | null {
    return mockAnnouncements.find(a => a.slug === slug) || null;
}
