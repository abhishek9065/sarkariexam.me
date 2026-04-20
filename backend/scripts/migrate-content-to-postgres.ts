import '../src/config.js';

import fs from 'fs';
import path from 'path';

import {
  ImportantDateKind as PrismaImportantDateKind,
  PostType as PrismaPostType,
  SubscriptionFrequency,
  TrustTag as PrismaTrustTag,
  WorkflowStatus as PrismaWorkflowStatus,
} from '@prisma/client';

import { closeConnection, connectToDatabase, getCollection } from '../src/services/cosmosdb.js';
import { closePrisma, prisma } from '../src/services/postgres/prisma.js';
import { slugify } from '../src/utils/slugify.js';

function argValue(name: string) {
  const index = process.argv.findIndex((item) => item === name);
  if (index < 0) return '';
  return process.argv[index + 1] || '';
}

function hasArg(name: string) {
  return process.argv.includes(name);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapPostType(type: string | undefined): PrismaPostType {
  if (type === 'job') return PrismaPostType.JOB;
  if (type === 'result') return PrismaPostType.RESULT;
  if (type === 'admit-card') return PrismaPostType.ADMIT_CARD;
  if (type === 'answer-key') return PrismaPostType.ANSWER_KEY;
  if (type === 'admission') return PrismaPostType.ADMISSION;
  if (type === 'scholarship') return PrismaPostType.SCHOLARSHIP;
  if (type === 'board-result' || type === 'board_result') return PrismaPostType.BOARD_RESULT;
  if (type === 'syllabus') return PrismaPostType.SYLLABUS;
  return PrismaPostType.JOB;
}

function mapWorkflowStatus(status: string | undefined): PrismaWorkflowStatus {
  if (status === 'draft') return PrismaWorkflowStatus.DRAFT;
  if (status === 'in_review') return PrismaWorkflowStatus.IN_REVIEW;
  if (status === 'approved') return PrismaWorkflowStatus.APPROVED;
  if (status === 'published') return PrismaWorkflowStatus.PUBLISHED;
  if (status === 'archived') return PrismaWorkflowStatus.ARCHIVED;
  return PrismaWorkflowStatus.DRAFT;
}

function mapTag(tag: string | undefined): PrismaTrustTag | null {
  if (tag === 'new') return PrismaTrustTag.NEW;
  if (tag === 'hot') return PrismaTrustTag.HOT;
  if (tag === 'update') return PrismaTrustTag.UPDATE;
  if (tag === 'last-date') return PrismaTrustTag.LAST_DATE;
  return null;
}

function mapImportantDateKind(kind: string | undefined): PrismaImportantDateKind | null {
  if (kind === 'application_start') return PrismaImportantDateKind.APPLICATION_START;
  if (kind === 'last_date') return PrismaImportantDateKind.LAST_DATE;
  if (kind === 'exam_date') return PrismaImportantDateKind.EXAM_DATE;
  if (kind === 'result_date') return PrismaImportantDateKind.RESULT_DATE;
  if (kind === 'admit_card') return PrismaImportantDateKind.ADMIT_CARD;
  if (kind === 'counselling') return PrismaImportantDateKind.COUNSELLING;
  if (kind === 'other') return PrismaImportantDateKind.OTHER;
  return null;
}

async function upsertOrganizationFromRef(ref: any) {
  if (!ref?.name?.trim()) return null;
  const name = String(ref.name).trim();
  const slug = slugify(ref.slug || name);
  return prisma.organization.upsert({
    where: { slug },
    update: {
      name,
      shortName: ref.shortName?.trim() || name.slice(0, 60),
      officialWebsite: ref.officialWebsite?.trim() || null,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
    create: {
      name,
      slug,
      shortName: ref.shortName?.trim() || name.slice(0, 60),
      officialWebsite: ref.officialWebsite?.trim() || null,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
  });
}

async function upsertStateFromRef(ref: any) {
  if (!ref?.name?.trim()) return null;
  const name = String(ref.name).trim();
  const slug = slugify(ref.slug || name);
  return prisma.state.upsert({
    where: { slug },
    update: {
      name,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
    create: {
      name,
      slug,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
  });
}

async function upsertCategoryFromRef(ref: any) {
  if (!ref?.name?.trim()) return null;
  const name = String(ref.name).trim();
  const slug = slugify(ref.slug || name);
  return prisma.category.upsert({
    where: { slug },
    update: {
      name,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
    create: {
      name,
      slug,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
  });
}

async function upsertQualificationFromRef(ref: any) {
  if (!ref?.name?.trim()) return null;
  const name = String(ref.name).trim();
  const slug = slugify(ref.slug || name);
  return prisma.qualification.upsert({
    where: { slug },
    update: {
      name,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
    create: {
      name,
      slug,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
  });
}

async function upsertCollegeFromRef(ref: any) {
  if (!ref?.name?.trim()) return null;
  const name = String(ref.name).trim();
  const slug = slugify(ref.slug || name);
  return prisma.college.upsert({
    where: { slug },
    update: {
      name,
      shortName: ref.shortName?.trim() || name.slice(0, 60),
      officialWebsite: ref.officialWebsite?.trim() || null,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
    create: {
      name,
      slug,
      shortName: ref.shortName?.trim() || name.slice(0, 60),
      officialWebsite: ref.officialWebsite?.trim() || null,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
    },
  });
}

async function upsertExamFromRef(ref: any, organizationId?: string | null) {
  if (!ref?.name?.trim()) return null;
  const name = String(ref.name).trim();
  const slug = slugify(ref.slug || name);
  return prisma.exam.upsert({
    where: { slug },
    update: {
      name,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
      organizationId: organizationId || null,
    },
    create: {
      name,
      slug,
      description: ref.description?.trim() || null,
      priority: Number.isFinite(ref.priority) ? Number(ref.priority) : 0,
      organizationId: organizationId || null,
    },
  });
}

async function migrateTaxonomyCollections(dryRun: boolean) {
  const states = await getCollection<any>('states').find({}).toArray();
  const organizations = await getCollection<any>('organizations').find({}).toArray();
  const categories = await getCollection<any>('categories').find({}).toArray();
  const institutions = await getCollection<any>('institutions').find({}).toArray();
  const exams = await getCollection<any>('exams').find({}).toArray();
  const qualifications = await getCollection<any>('qualifications').find({}).toArray();

  if (dryRun) {
    return {
      states: states.length,
      organizations: organizations.length,
      categories: categories.length,
      institutions: institutions.length,
      exams: exams.length,
      qualifications: qualifications.length,
    };
  }

  for (const item of states) await upsertStateFromRef(item);
  for (const item of organizations) await upsertOrganizationFromRef(item);
  for (const item of categories) await upsertCategoryFromRef(item);
  for (const item of institutions) await upsertCollegeFromRef(item);
  for (const item of qualifications) await upsertQualificationFromRef(item);
  for (const item of exams) await upsertExamFromRef(item, null);

  return {
    states: states.length,
    organizations: organizations.length,
    categories: categories.length,
    institutions: institutions.length,
    exams: exams.length,
    qualifications: qualifications.length,
  };
}

async function migratePosts(dryRun: boolean, limit: number) {
  const posts = await getCollection<any>('posts').find({}).sort({ _id: 1 }).limit(limit > 0 ? limit : 0).toArray();

  if (dryRun) {
    return { scanned: posts.length, migrated: posts.length };
  }

  let migrated = 0;

  for (const doc of posts) {
    const postId = doc._id?.toString?.() || doc.id;
    if (!postId) continue;

    await prisma.$transaction(async (tx) => {
      const organization = await upsertOrganizationFromRef(doc.organization);
      const institution = await upsertCollegeFromRef(doc.institution);
      const exam = await upsertExamFromRef(doc.exam, organization?.id);

      const qualifications = [] as Array<{ id: string; slug: string }>;
      for (const item of doc.qualifications || []) {
        const upserted = await upsertQualificationFromRef(item);
        if (upserted) qualifications.push({ id: upserted.id, slug: upserted.slug });
      }

      const categoryIds: string[] = [];
      for (const item of doc.categories || []) {
        const upserted = await upsertCategoryFromRef(item);
        if (upserted) categoryIds.push(upserted.id);
      }

      const stateIds: string[] = [];
      for (const item of doc.states || []) {
        const upserted = await upsertStateFromRef(item);
        if (upserted) stateIds.push(upserted.id);
      }

      let programId: string | null = null;
      const firstProgram = (doc.admissionPrograms || [])[0];
      if (firstProgram?.programName?.trim()) {
        const programSlug = slugify(firstProgram.programName);
        const program = await tx.program.upsert({
          where: { slug: programSlug },
          update: {
            name: firstProgram.programName.trim(),
            level: firstProgram.level?.trim() || null,
            department: firstProgram.department?.trim() || null,
            intake: firstProgram.intake?.trim() || null,
            collegeId: institution?.id || null,
          },
          create: {
            name: firstProgram.programName.trim(),
            slug: programSlug,
            level: firstProgram.level?.trim() || null,
            department: firstProgram.department?.trim() || null,
            intake: firstProgram.intake?.trim() || null,
            collegeId: institution?.id || null,
          },
        });
        programId = program.id;
      }

      const slug = doc.slug ? String(doc.slug).trim() : slugify(doc.title || postId);
      const legacySlugs = Array.from(new Set((doc.legacySlugs || []).map((value: string) => String(value).trim()).filter(Boolean)));

      await tx.post.upsert({
        where: { id: postId },
        update: {
          legacyAnnouncementId: doc.legacyAnnouncementId || null,
          legacyId: doc.legacyId || null,
          title: String(doc.title || '').trim(),
          slug,
          legacySlugs,
          type: mapPostType(doc.type),
          status: mapWorkflowStatus(doc.status),
          summary: String(doc.summary || '').trim(),
          shortInfo: doc.shortInfo?.trim() || null,
          body: doc.body?.trim() || null,
          organizationId: organization?.id || null,
          institutionId: institution?.id || null,
          examId: exam?.id || null,
          programId,
          location: doc.location?.trim() || null,
          salary: doc.salary?.trim() || null,
          postCount: doc.postCount?.trim() || null,
          applicationStartDate: doc.applicationStartDate?.trim() || null,
          lastDate: doc.lastDate?.trim() || null,
          examDate: doc.examDate?.trim() || null,
          resultDate: doc.resultDate?.trim() || null,
          expiresAt: parseDate(doc.expiresAt) || parseDate(doc.lastDate),
          archivedAt: parseDate(doc.archivedAt),
          publishedAt: parseDate(doc.publishedAt),
          createdAt: parseDate(doc.createdAt) || new Date(),
          updatedAt: parseDate(doc.updatedAt) || new Date(),
          createdBy: doc.createdBy || null,
          updatedBy: doc.updatedBy || null,
          approvedBy: doc.approvedBy || null,
          publishedBy: doc.publishedBy || null,
          currentVersion: Number.isFinite(doc.currentVersion) ? Number(doc.currentVersion) : 1,
          searchText: String(doc.searchText || '').trim().toLowerCase(),
          verificationNote: doc.trust?.verificationNote?.trim() || null,
          updatedLabel: doc.trust?.updatedLabel?.trim() || null,
          sourceNote: doc.sourceNote?.trim() || null,
          correctionNote: doc.correctionNote?.trim() || null,
          contentJson: doc.contentJson ? (JSON.parse(JSON.stringify(doc.contentJson)) as any) : null,
          tag: mapTag(doc.tag),
          isUrgent: Boolean(doc.flags?.urgent),
          isNew: Boolean(doc.flags?.isNew),
          isLastDate: Boolean(doc.flags?.lastDate),
          isFeatured: Boolean(doc.flags?.featured),
          homeSection: doc.home?.section?.trim() || null,
          stickyRank: Number.isFinite(doc.home?.stickyRank) ? Number(doc.home?.stickyRank) : null,
          highlight: Boolean(doc.home?.highlight),
          trendingScore: Number.isFinite(doc.home?.trendingScore) ? Number(doc.home?.trendingScore) : null,
          seoTitle: doc.seo?.metaTitle?.trim() || null,
          seoDescription: doc.seo?.metaDescription?.trim() || null,
          seoCanonicalPath: doc.seo?.canonicalPath?.trim() || null,
          seoIndexable: doc.seo?.indexable ?? true,
          seoOgImage: doc.seo?.ogImage?.trim() || null,
        },
        create: {
          id: postId,
          legacyAnnouncementId: doc.legacyAnnouncementId || null,
          legacyId: doc.legacyId || null,
          title: String(doc.title || '').trim(),
          slug,
          legacySlugs,
          type: mapPostType(doc.type),
          status: mapWorkflowStatus(doc.status),
          summary: String(doc.summary || '').trim(),
          shortInfo: doc.shortInfo?.trim() || null,
          body: doc.body?.trim() || null,
          organizationId: organization?.id || null,
          institutionId: institution?.id || null,
          examId: exam?.id || null,
          programId,
          location: doc.location?.trim() || null,
          salary: doc.salary?.trim() || null,
          postCount: doc.postCount?.trim() || null,
          applicationStartDate: doc.applicationStartDate?.trim() || null,
          lastDate: doc.lastDate?.trim() || null,
          examDate: doc.examDate?.trim() || null,
          resultDate: doc.resultDate?.trim() || null,
          expiresAt: parseDate(doc.expiresAt) || parseDate(doc.lastDate),
          archivedAt: parseDate(doc.archivedAt),
          publishedAt: parseDate(doc.publishedAt),
          createdAt: parseDate(doc.createdAt) || new Date(),
          updatedAt: parseDate(doc.updatedAt) || new Date(),
          createdBy: doc.createdBy || null,
          updatedBy: doc.updatedBy || null,
          approvedBy: doc.approvedBy || null,
          publishedBy: doc.publishedBy || null,
          currentVersion: Number.isFinite(doc.currentVersion) ? Number(doc.currentVersion) : 1,
          searchText: String(doc.searchText || '').trim().toLowerCase(),
          verificationNote: doc.trust?.verificationNote?.trim() || null,
          updatedLabel: doc.trust?.updatedLabel?.trim() || null,
          sourceNote: doc.sourceNote?.trim() || null,
          correctionNote: doc.correctionNote?.trim() || null,
          contentJson: doc.contentJson ? (JSON.parse(JSON.stringify(doc.contentJson)) as any) : null,
          tag: mapTag(doc.tag),
          isUrgent: Boolean(doc.flags?.urgent),
          isNew: Boolean(doc.flags?.isNew),
          isLastDate: Boolean(doc.flags?.lastDate),
          isFeatured: Boolean(doc.flags?.featured),
          homeSection: doc.home?.section?.trim() || null,
          stickyRank: Number.isFinite(doc.home?.stickyRank) ? Number(doc.home?.stickyRank) : null,
          highlight: Boolean(doc.home?.highlight),
          trendingScore: Number.isFinite(doc.home?.trendingScore) ? Number(doc.home?.trendingScore) : null,
          seoTitle: doc.seo?.metaTitle?.trim() || null,
          seoDescription: doc.seo?.metaDescription?.trim() || null,
          seoCanonicalPath: doc.seo?.canonicalPath?.trim() || null,
          seoIndexable: doc.seo?.indexable ?? true,
          seoOgImage: doc.seo?.ogImage?.trim() || null,
        },
      });

      await Promise.all([
        tx.postCategory.deleteMany({ where: { postId } }),
        tx.postState.deleteMany({ where: { postId } }),
        tx.postQualification.deleteMany({ where: { postId } }),
        tx.officialSource.deleteMany({ where: { postId } }),
        tx.importantDate.deleteMany({ where: { postId } }),
        tx.eligibilityRule.deleteMany({ where: { postId } }),
        tx.feeRule.deleteMany({ where: { postId } }),
        tx.vacancyRow.deleteMany({ where: { postId } }),
        tx.admissionDetail.deleteMany({ where: { postId } }),
        tx.slugAlias.deleteMany({ where: { postId } }),
      ]);

      if (categoryIds.length > 0) {
        await tx.postCategory.createMany({
          data: categoryIds.map((categoryId) => ({ postId, categoryId })),
          skipDuplicates: true,
        });
      }

      if (stateIds.length > 0) {
        await tx.postState.createMany({
          data: stateIds.map((stateId) => ({ postId, stateId })),
          skipDuplicates: true,
        });
      }

      if (qualifications.length > 0) {
        await tx.postQualification.createMany({
          data: qualifications.map((item) => ({ postId, qualificationId: item.id })),
          skipDuplicates: true,
        });
      }

      if (legacySlugs.length > 0) {
        await tx.slugAlias.createMany({
          data: legacySlugs
            .filter((item) => item !== slug)
            .map((alias) => ({
              postId,
              slug: alias,
              isLegacy: true,
            })),
          skipDuplicates: true,
        });
      }

      if ((doc.officialSources || []).length > 0) {
        await tx.officialSource.createMany({
          data: (doc.officialSources || []).map((item: any, index: number) => ({
            postId,
            label: String(item.label || '').trim(),
            url: String(item.url || '').trim(),
            sourceType: item.sourceType || null,
            isPrimary: Boolean(item.isPrimary),
            capturedAt: parseDate(item.capturedAt),
            position: index,
          })),
        });
      }

      if ((doc.importantDates || []).length > 0) {
        await tx.importantDate.createMany({
          data: (doc.importantDates || []).map((item: any, index: number) => ({
            postId,
            kind: mapImportantDateKind(item.kind),
            label: String(item.label || '').trim(),
            value: String(item.value || '').trim(),
            sortDate: parseDate(item.value),
            isPrimary: Boolean(item.isPrimary),
            note: item.note?.trim() || null,
            position: index,
          })),
        });
      }

      const qualificationBySlug = new Map<string, string>();
      for (const item of qualifications) {
        qualificationBySlug.set(item.slug, item.id);
      }

      if ((doc.eligibility || []).length > 0) {
        await tx.eligibilityRule.createMany({
          data: (doc.eligibility || []).map((item: any, index: number) => ({
            postId,
            qualificationId: item.qualificationSlug
              ? qualificationBySlug.get(slugify(String(item.qualificationSlug))) || null
              : null,
            label: String(item.label || '').trim(),
            description: String(item.description || '').trim(),
            minAge: Number.isFinite(item.minAge) ? Number(item.minAge) : null,
            maxAge: Number.isFinite(item.maxAge) ? Number(item.maxAge) : null,
            relaxationNote: item.relaxationNote?.trim() || null,
            position: index,
          })),
        });
      }

      if ((doc.feeRules || []).length > 0) {
        await tx.feeRule.createMany({
          data: (doc.feeRules || []).map((item: any, index: number) => ({
            postId,
            category: String(item.category || '').trim(),
            amount: String(item.amount || '').trim(),
            currency: item.currency?.trim() || 'INR',
            paymentNote: item.paymentNote?.trim() || null,
            position: index,
          })),
        });
      }

      if ((doc.vacancyRows || []).length > 0) {
        await tx.vacancyRow.createMany({
          data: (doc.vacancyRows || []).map((item: any, index: number) => ({
            postId,
            postName: String(item.postName || '').trim(),
            department: item.department?.trim() || null,
            category: item.category?.trim() || null,
            vacancies: String(item.vacancies || '').trim(),
            payLevel: item.payLevel?.trim() || null,
            salaryNote: item.salaryNote?.trim() || null,
            position: index,
          })),
        });
      }

      if (programId || institution?.id) {
        await tx.admissionDetail.create({
          data: {
            postId,
            collegeId: institution?.id || null,
            programId,
            intake: firstProgram?.intake?.trim() || null,
            scholarshipNote: firstProgram?.eligibilityNote?.trim() || null,
          },
        });
      }
    }, {
      maxWait: 10_000,
      timeout: 120_000,
    });

    migrated += 1;
  }

  return { scanned: posts.length, migrated };
}

async function migratePostVersions(dryRun: boolean, limit: number) {
  const versions = await getCollection<any>('post_versions').find({}).sort({ _id: 1 }).limit(limit > 0 ? limit : 0).toArray();
  if (dryRun) {
    return { scanned: versions.length, migrated: versions.length };
  }

  let migrated = 0;
  for (const item of versions) {
    const postId = String(item.postId || '');
    if (!postId) continue;

    const linkedPost = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!linkedPost) continue;

    await prisma.postVersion.upsert({
      where: {
        postId_version: {
          postId,
          version: Number(item.version || 1),
        },
      },
      update: {
        note: item.note?.trim() || null,
        reason: item.reason?.trim() || null,
        actorId: item.actorId || null,
        snapshot: item.snapshot ? (JSON.parse(JSON.stringify(item.snapshot)) as any) : {},
        createdAt: parseDate(item.createdAt) || new Date(),
      },
      create: {
        postId,
        version: Number(item.version || 1),
        note: item.note?.trim() || null,
        reason: item.reason?.trim() || null,
        actorId: item.actorId || null,
        snapshot: item.snapshot ? (JSON.parse(JSON.stringify(item.snapshot)) as any) : {},
        createdAt: parseDate(item.createdAt) || new Date(),
      },
    });

    migrated += 1;
  }

  return { scanned: versions.length, migrated };
}

async function migrateAuditLogs(dryRun: boolean, limit: number) {
  const logs = await getCollection<any>('audit_logs').find({}).sort({ _id: 1 }).limit(limit > 0 ? limit : 0).toArray();
  if (dryRun) {
    return { scanned: logs.length, migrated: logs.length };
  }

  let migrated = 0;
  for (const item of logs) {
    const id = item._id?.toString?.() || item.id;
    if (!id) continue;

    const entityId = String(item.entityId || '');
    if (!entityId) continue;

    let linkedPostId: string | null = null;
    if (['post', 'workflow'].includes(String(item.entityType || ''))) {
      const linkedPost = await prisma.post.findUnique({ where: { id: entityId }, select: { id: true } });
      linkedPostId = linkedPost?.id || null;
    }

    await prisma.auditLog.upsert({
      where: { id },
      update: {
        entityType: String(item.entityType || 'post'),
        entityId,
        postId: linkedPostId,
        action: String(item.action || 'update'),
        actorId: item.actorId || null,
        actorRole: item.actorRole || null,
        summary: String(item.summary || ''),
        metadata: item.metadata ? (JSON.parse(JSON.stringify(item.metadata)) as any) : null,
        createdAt: parseDate(item.createdAt) || new Date(),
      },
      create: {
        id,
        entityType: String(item.entityType || 'post'),
        entityId,
        postId: linkedPostId,
        action: String(item.action || 'update'),
        actorId: item.actorId || null,
        actorRole: item.actorRole || null,
        summary: String(item.summary || ''),
        metadata: item.metadata ? (JSON.parse(JSON.stringify(item.metadata)) as any) : null,
        createdAt: parseDate(item.createdAt) || new Date(),
      },
    });

    migrated += 1;
  }

  return { scanned: logs.length, migrated };
}

async function migrateSubscriptions(dryRun: boolean, limit: number) {
  const subscriptions = await getCollection<any>('alert_subscriptions')
    .find({})
    .sort({ _id: 1 })
    .limit(limit > 0 ? limit : 0)
    .toArray();

  if (dryRun) {
    return { scanned: subscriptions.length, migrated: subscriptions.length };
  }

  let migrated = 0;
  for (const item of subscriptions) {
    const id = item._id?.toString?.() || item.id;
    if (!id || !item.email) continue;

    const categorySlugs = (item.categorySlugs || []).map((value: string) => slugify(value)).filter(Boolean);
    const stateSlugs = (item.stateSlugs || []).map((value: string) => slugify(value)).filter(Boolean);
    const organizationSlugs = (item.organizationSlugs || []).map((value: string) => slugify(value)).filter(Boolean);
    const qualificationSlugs = (item.qualificationSlugs || []).map((value: string) => slugify(value)).filter(Boolean);

    const categories = await prisma.category.findMany({ where: { slug: { in: categorySlugs } }, select: { id: true } });
    const states = await prisma.state.findMany({ where: { slug: { in: stateSlugs } }, select: { id: true } });
    const organizations = await prisma.organization.findMany({ where: { slug: { in: organizationSlugs } }, select: { id: true } });
    const qualifications = await prisma.qualification.findMany({ where: { slug: { in: qualificationSlugs } }, select: { id: true } });

    await prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { email: String(item.email).trim().toLowerCase() },
        update: {
          id,
          verified: Boolean(item.verified),
          isActive: Boolean(item.isActive ?? true),
          frequency:
            item.frequency === 'instant'
              ? SubscriptionFrequency.INSTANT
              : item.frequency === 'weekly'
                ? SubscriptionFrequency.WEEKLY
                : SubscriptionFrequency.DAILY,
          verificationToken: item.verificationToken || null,
          unsubscribeToken: String(item.unsubscribeToken || id),
          source: item.source || null,
          alertCount: Number.isFinite(item.alertCount) ? Number(item.alertCount) : 0,
          lastAlertedAt: parseDate(item.lastAlertedAt),
          createdAt: parseDate(item.createdAt) || new Date(),
          updatedAt: parseDate(item.updatedAt) || new Date(),
        },
        create: {
          id,
          email: String(item.email).trim().toLowerCase(),
          verified: Boolean(item.verified),
          isActive: Boolean(item.isActive ?? true),
          frequency:
            item.frequency === 'instant'
              ? SubscriptionFrequency.INSTANT
              : item.frequency === 'weekly'
                ? SubscriptionFrequency.WEEKLY
                : SubscriptionFrequency.DAILY,
          verificationToken: item.verificationToken || null,
          unsubscribeToken: String(item.unsubscribeToken || id),
          source: item.source || null,
          alertCount: Number.isFinite(item.alertCount) ? Number(item.alertCount) : 0,
          lastAlertedAt: parseDate(item.lastAlertedAt),
          createdAt: parseDate(item.createdAt) || new Date(),
          updatedAt: parseDate(item.updatedAt) || new Date(),
        },
      });

      const subscription = await tx.subscription.findUnique({ where: { email: String(item.email).trim().toLowerCase() }, select: { id: true } });
      if (!subscription) return;

      await Promise.all([
        tx.subscriptionCategory.deleteMany({ where: { subscriptionId: subscription.id } }),
        tx.subscriptionState.deleteMany({ where: { subscriptionId: subscription.id } }),
        tx.subscriptionOrganization.deleteMany({ where: { subscriptionId: subscription.id } }),
        tx.subscriptionQualification.deleteMany({ where: { subscriptionId: subscription.id } }),
        tx.subscriptionPostType.deleteMany({ where: { subscriptionId: subscription.id } }),
      ]);

      if (categories.length > 0) {
        await tx.subscriptionCategory.createMany({
          data: categories.map((row) => ({ subscriptionId: subscription.id, categoryId: row.id })),
          skipDuplicates: true,
        });
      }
      if (states.length > 0) {
        await tx.subscriptionState.createMany({
          data: states.map((row) => ({ subscriptionId: subscription.id, stateId: row.id })),
          skipDuplicates: true,
        });
      }
      if (organizations.length > 0) {
        await tx.subscriptionOrganization.createMany({
          data: organizations.map((row) => ({ subscriptionId: subscription.id, organizationId: row.id })),
          skipDuplicates: true,
        });
      }
      if (qualifications.length > 0) {
        await tx.subscriptionQualification.createMany({
          data: qualifications.map((row) => ({ subscriptionId: subscription.id, qualificationId: row.id })),
          skipDuplicates: true,
        });
      }

      const postTypes = Array.from(new Set((item.postTypes || []).map((value: string) => String(value))));
      if (postTypes.length > 0) {
        await tx.subscriptionPostType.createMany({
          data: postTypes
            .map((value) => {
              if (value === 'job') return { subscriptionId: subscription.id, postType: PrismaPostType.JOB };
              if (value === 'result') return { subscriptionId: subscription.id, postType: PrismaPostType.RESULT };
              if (value === 'admit-card') return { subscriptionId: subscription.id, postType: PrismaPostType.ADMIT_CARD };
              if (value === 'answer-key') return { subscriptionId: subscription.id, postType: PrismaPostType.ANSWER_KEY };
              if (value === 'admission') return { subscriptionId: subscription.id, postType: PrismaPostType.ADMISSION };
              if (value === 'syllabus') return { subscriptionId: subscription.id, postType: PrismaPostType.SYLLABUS };
              return null;
            })
            .filter(Boolean) as Array<{ subscriptionId: string; postType: PrismaPostType }>,
          skipDuplicates: true,
        });
      }
    }, {
      maxWait: 10_000,
      timeout: 120_000,
    });

    migrated += 1;
  }

  return { scanned: subscriptions.length, migrated };
}

async function main() {
  const dryRun = hasArg('--dry-run');
  const reportPath = argValue('--report');
  const limit = Number(argValue('--limit') || '0');

  if (!process.env.POSTGRES_PRISMA_URL?.trim()) {
    throw new Error('POSTGRES_PRISMA_URL is not configured');
  }

  await connectToDatabase();

  try {
    const taxonomyTotals = await migrateTaxonomyCollections(dryRun);
    const postTotals = await migratePosts(dryRun, limit);
    const versionTotals = await migratePostVersions(dryRun, limit);
    const auditTotals = await migrateAuditLogs(dryRun, limit);
    const subscriptionTotals = await migrateSubscriptions(dryRun, limit);

    const report = {
      mode: dryRun ? 'dry-run' : 'live',
      totals: {
        taxonomies: taxonomyTotals,
        posts: postTotals,
        versions: versionTotals,
        auditLogs: auditTotals,
        subscriptions: subscriptionTotals,
      },
      generatedAt: new Date().toISOString(),
    };

    if (reportPath) {
      const resolvedPath = path.resolve(process.cwd(), reportPath);
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.log(`[migrate-content-to-postgres] wrote report to ${resolvedPath}`);
    }

    console.log('[migrate-content-to-postgres] completed', JSON.stringify(report.totals));
  } finally {
    await closeConnection().catch(() => {});
    await closePrisma().catch(() => {});
  }
}

main().catch((error) => {
  console.error('[migrate-content-to-postgres] failed', error);
  process.exit(1);
});
