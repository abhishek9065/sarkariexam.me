import '../src/config.js';

import fs from 'fs';
import path from 'path';

import type { Document } from 'mongodb';

import { closeConnection, connectToDatabase, getCollection } from '../src/services/cosmosdb.js';

interface AnnouncementDoc extends Document {
  _id?: { toString(): string };
  id?: string;
  slug?: string;
}

interface PostDoc extends Document {
  _id?: { toString(): string };
  slug: string;
  title: string;
  type: string;
  status: string;
  location?: string;
  legacyAnnouncementId?: string;
  officialSources?: Array<{ url?: string }>;
  trust?: { verificationNote?: string };
  seo?: { metaTitle?: string; metaDescription?: string };
  stateSlugs?: string[];
  qualificationSlugs?: string[];
  organizationSlug?: string;
  categorySlugs?: string[];
}

const getArgValue = (name: string) => {
  const index = process.argv.findIndex((item) => item === name);
  if (index < 0) return '';
  return process.argv[index + 1] || '';
};

function applyConnectionOverrides() {
  const uri = getArgValue('--uri');
  const dbName = getArgValue('--db-name');

  if (uri) {
    process.env.MONGODB_URI = uri;
    delete process.env.COSMOS_CONNECTION_STRING;
  }

  if (dbName) {
    process.env.COSMOS_DATABASE_NAME = dbName;
  }
}

function currentConnectionHint() {
  const uri = process.env.MONGODB_URI || process.env.COSMOS_CONNECTION_STRING || '';
  if (!uri) return 'no connection string configured';
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

function isAllIndiaLocation(value?: string) {
  if (!value?.trim()) return false;
  return /\ball\s*india\b/i.test(value) || /\bnational\b/i.test(value);
}

async function main() {
  const outPath = getArgValue('--out');
  applyConnectionOverrides();
  await connectToDatabase();

  try {
    const announcements = getCollection<AnnouncementDoc>('announcements');
    const posts = getCollection<PostDoc>('posts');
    const states = getCollection<Document>('states');
    const organizations = getCollection<Document>('organizations');
    const categories = getCollection<Document>('categories');
    const qualifications = getCollection<Document>('qualifications');
    const institutions = getCollection<Document>('institutions');
    const exams = getCollection<Document>('exams');

    const [announcementRows, postRows, taxonomyCounts] = await Promise.all([
      announcements.find({}, { projection: { _id: 1, id: 1, slug: 1 } }).toArray(),
      posts.find({}, {
        projection: {
          slug: 1,
          title: 1,
          type: 1,
          status: 1,
          location: 1,
          legacyAnnouncementId: 1,
          officialSources: 1,
          trust: 1,
          seo: 1,
          stateSlugs: 1,
          qualificationSlugs: 1,
          organizationSlug: 1,
          categorySlugs: 1,
        },
      }).toArray(),
      Promise.all([
        states.countDocuments({}),
        organizations.countDocuments({}),
        categories.countDocuments({}),
        qualifications.countDocuments({}),
        institutions.countDocuments({}),
        exams.countDocuments({}),
      ]),
    ]);

    const legacyIds = new Set(postRows.map((item) => item.legacyAnnouncementId).filter(Boolean));
    const postSlugs = new Set(postRows.map((item) => item.slug).filter(Boolean));
    const missingFromPosts = announcementRows.filter((item) => {
      const legacyId = item._id?.toString?.() || item.id;
      return !legacyIds.has(legacyId) && !(item.slug && postSlugs.has(item.slug));
    });

    const slugCounts = new Map<string, number>();
    for (const post of postRows) {
      slugCounts.set(post.slug, (slugCounts.get(post.slug) || 0) + 1);
    }
    const duplicateSlugs = Array.from(slugCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));

    const missingOfficialSources = postRows.filter((item) => (item.officialSources || []).length === 0);
    const missingVerificationNote = postRows.filter((item) => !item.trust?.verificationNote?.trim());
    const publishedMissingSeo = postRows.filter((item) =>
      item.status === 'published' && (!item.seo?.metaTitle?.trim() || !item.seo?.metaDescription?.trim()));
    const postsMissingStateTags = postRows.filter((item) =>
      Boolean(item.location?.trim())
      && !isAllIndiaLocation(item.location)
      && (item.stateSlugs || []).length === 0,
    );
    const postsMissingQualificationTags = postRows.filter((item) => (item.qualificationSlugs || []).length === 0);
    const postsMissingOrganization = postRows.filter((item) => !item.organizationSlug);
    const postsMissingCategory = postRows.filter((item) => (item.categorySlugs || []).length === 0);

    const report = {
      generatedAt: new Date().toISOString(),
      totals: {
        announcements: announcementRows.length,
        posts: postRows.length,
        migratedPosts: legacyIds.size,
        missingFromPosts: missingFromPosts.length,
      },
      taxonomyCounts: {
        states: taxonomyCounts[0],
        organizations: taxonomyCounts[1],
        categories: taxonomyCounts[2],
        qualifications: taxonomyCounts[3],
        institutions: taxonomyCounts[4],
        exams: taxonomyCounts[5],
      },
      qualitySignals: {
        duplicateSlugs: duplicateSlugs.length,
        missingOfficialSources: missingOfficialSources.length,
        missingVerificationNote: missingVerificationNote.length,
        publishedMissingSeo: publishedMissingSeo.length,
        postsMissingStateTags: postsMissingStateTags.length,
        postsMissingQualificationTags: postsMissingQualificationTags.length,
        postsMissingOrganization: postsMissingOrganization.length,
        postsMissingCategory: postsMissingCategory.length,
      },
      samples: {
        missingFromPosts: missingFromPosts.slice(0, 20).map((item) => item.slug || item.id || item._id?.toString?.() || ''),
        duplicateSlugs: duplicateSlugs.slice(0, 20),
        missingOfficialSources: missingOfficialSources.slice(0, 20).map((item) => item.slug),
        missingVerificationNote: missingVerificationNote.slice(0, 20).map((item) => item.slug),
        publishedMissingSeo: publishedMissingSeo.slice(0, 20).map((item) => item.slug),
        postsMissingStateTags: postsMissingStateTags.slice(0, 20).map((item) => item.slug),
        postsMissingQualificationTags: postsMissingQualificationTags.slice(0, 20).map((item) => item.slug),
        postsMissingOrganization: postsMissingOrganization.slice(0, 20).map((item) => item.slug),
        postsMissingCategory: postsMissingCategory.slice(0, 20).map((item) => item.slug),
      },
    };

    if (outPath) {
      const resolvedPath = path.resolve(process.cwd(), outPath);
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.log(`[audit-content-migration] wrote report to ${resolvedPath}`);
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await closeConnection().catch(() => {});
  }
}

main().catch((error) => {
  console.error('[audit-content-migration] failed', error);
  console.error(`[audit-content-migration] connection hint: ${currentConnectionHint()}`);
  console.error('[audit-content-migration] tip: use --uri <mongodb-uri> --db-name <database> for staging or production audits.');
  process.exit(1);
});
