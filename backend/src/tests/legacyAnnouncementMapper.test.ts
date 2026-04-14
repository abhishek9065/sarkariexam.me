import { describe, expect, it } from 'vitest';

import { mapAnnouncementToPostInput } from '../services/legacyAnnouncementMapper.js';

describe('mapAnnouncementToPostInput', () => {
  it('maps legacy announcement data into the new post aggregate shape', () => {
    const mapped = mapAnnouncementToPostInput({
      id: 'legacy-1',
      type: 'job',
      title: 'UP Police Constable Recruitment 2026',
      slug: 'up-police-constable-2026',
      category: 'Police Jobs',
      organization: 'UP Police Recruitment Board',
      location: 'Uttar Pradesh',
      minQualification: '12th Pass',
      ageLimit: '18-25 Years',
      content: '<p>Apply online for 19220 vacancies.</p>',
      externalLink: 'https://uppbpb.gov.in/recruitment-2026',
      deadline: '2026-05-15',
      applicationFee: '400',
      totalPosts: 19220,
      status: 'published',
      updatedAt: '2026-04-01T10:00:00.000Z',
      importantDates: [{ eventName: 'Notification Released', eventDate: '2026-03-30' }],
      home: { section: 'featured-jobs', stickyRank: 1, highlight: true, trendingScore: 95 },
      tags: [{ slug: 'new', label: 'New' }],
      jobDetails: {
        applicationStartDate: '2026-04-02',
        examDate: '2026-08-01',
        orgShort: 'UPPRB',
        salary: 'Rs. 21,700 - 69,100',
        applicationFee: { general: '400', sc: '400' },
        eligibility: { nationality: 'Indian Citizen' },
        vacancyBreakdown: [{ post: 'Constable', dept: 'Civil Police', vacancies: 19220, payLevel: 'Level 3' }],
      },
    } as any);

    expect(mapped.title).toBe('UP Police Constable Recruitment 2026');
    expect(mapped.type).toBe('job');
    expect(mapped.status).toBe('published');
    expect(mapped.organization?.slug).toBe('up-police-recruitment-board');
    expect(mapped.categories[0]?.slug).toBe('police-jobs');
    expect(mapped.states[0]?.slug).toBe('uttar-pradesh');
    expect(mapped.qualifications[0]?.slug).toBe('12th-pass');
    expect(mapped.officialSources[0]).toMatchObject({
      label: 'Official Source',
      url: 'https://uppbpb.gov.in/recruitment-2026',
      isPrimary: true,
    });
    expect(mapped.importantDates.map((item) => item.kind)).toEqual(['application_start', 'other', 'last_date', 'exam_date']);
    expect(mapped.feeRules).toHaveLength(2);
    expect(mapped.vacancyRows[0]).toMatchObject({
      postName: 'Constable',
      department: 'Civil Police',
      vacancies: '19220',
      payLevel: 'Level 3',
    });
    expect(mapped.flags.featured).toBe(true);
    expect(mapped.postCount).toBe('19220');
    expect(mapped.salary).toContain('21,700');
    expect(mapped.expiresAt).toBe('2026-05-15');
  });
});

