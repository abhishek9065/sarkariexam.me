import '../src/config.js';

import fs from 'fs';
import path from 'path';

import PostModelMongo from '../src/models/posts.mongo.js';
import { closeConnection, connectToDatabase, getCollection } from '../src/services/cosmosdb.js';
import { mapAnnouncementToPostInput } from '../src/services/legacyAnnouncementMapper.js';

function getArgValue(name: string) {
  const index = process.argv.findIndex((item) => item === name);
  if (index < 0) return '';
  return process.argv[index + 1] || '';
}

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
  if (!uri) {
    return 'no connection string configured';
  }
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

function isAllIndiaLocation(value?: string) {
  if (!value?.trim()) return false;
  return /\ball\s*india\b/i.test(value) || /\bnational\b/i.test(value);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const reportArgIndex = process.argv.findIndex((item) => item === '--report');
  const reportPath = reportArgIndex >= 0 ? process.argv[reportArgIndex + 1] : '';
  applyConnectionOverrides();
  await connectToDatabase();

  try {
    const announcements = getCollection<any>('announcements');
    const posts = getCollection<any>('posts');
    const items = await announcements.find({}).sort({ _id: 1 }).toArray();

    let created = 0;
    let skipped = 0;
    const issues = {
      missingOfficialSources: [] as string[],
      missingVerificationNote: [] as string[],
      missingStateTags: [] as string[],
      missingQualificationTags: [] as string[],
    };

    for (const item of items) {
      const legacyId = item._id?.toString?.() || item.id;
      const existing = await posts.findOne({
        $or: [
          { legacyAnnouncementId: legacyId },
          { slug: item.slug },
        ],
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const mapped = mapAnnouncementToPostInput({
        id: legacyId,
        ...item,
      });

      if ((mapped.officialSources || []).length === 0) {
        issues.missingOfficialSources.push(mapped.slug || mapped.title);
      }
      if (!mapped.verificationNote?.trim()) {
        issues.missingVerificationNote.push(mapped.slug || mapped.title);
      }
      if ((mapped.states || []).length === 0 && item.location && !isAllIndiaLocation(String(item.location))) {
        issues.missingStateTags.push(mapped.slug || mapped.title);
      }
      if ((mapped.qualifications || []).length === 0 && item.minQualification) {
        issues.missingQualificationTags.push(mapped.slug || mapped.title);
      }

      if (dryRun) {
        created += 1;
        continue;
      }

      await PostModelMongo.create(
        {
          ...mapped,
          trust: {
            verificationNote: mapped.verificationNote,
            officialSources: mapped.officialSources,
          },
        } as any,
        'migration',
        'superadmin',
        'legacy announcement import',
      );

      created += 1;
    }

    const report = {
      mode: dryRun ? 'dry-run' : 'live',
      totals: {
        announcements: items.length,
        created,
        skipped,
      },
      qualitySignals: {
        missingOfficialSources: issues.missingOfficialSources.length,
        missingVerificationNote: issues.missingVerificationNote.length,
        missingStateTags: issues.missingStateTags.length,
        missingQualificationTags: issues.missingQualificationTags.length,
      },
      samples: {
        missingOfficialSources: issues.missingOfficialSources.slice(0, 20),
        missingVerificationNote: issues.missingVerificationNote.slice(0, 20),
        missingStateTags: issues.missingStateTags.slice(0, 20),
        missingQualificationTags: issues.missingQualificationTags.slice(0, 20),
      },
      generatedAt: new Date().toISOString(),
    };

    if (reportPath) {
      const resolvedPath = path.resolve(process.cwd(), reportPath);
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.log(`[backfill-posts] wrote report to ${resolvedPath}`);
    }

    console.log(`[backfill-posts] ${dryRun ? 'dry-run ' : ''}complete: created=${created}, skipped=${skipped}, total=${items.length}`);
    console.log(`[backfill-posts] quality: missingOfficialSources=${report.qualitySignals.missingOfficialSources} missingVerificationNote=${report.qualitySignals.missingVerificationNote} missingStateTags=${report.qualitySignals.missingStateTags} missingQualificationTags=${report.qualitySignals.missingQualificationTags}`);
  } finally {
    await closeConnection().catch(() => {});
  }
}

main().catch((error) => {
  console.error('[backfill-posts] failed', error);
  console.error(`[backfill-posts] connection hint: ${currentConnectionHint()}`);
  console.error('[backfill-posts] tip: use --uri <mongodb-uri> --db-name <database> for staging or production runs.');
  process.exit(1);
});
