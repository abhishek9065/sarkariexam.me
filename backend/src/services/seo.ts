import { getTopSearches } from './analytics.js';
import { prisma } from './postgres/prisma.js';

export async function getSEOMetrics() {
  try {
    const [total, withMeta, indexed, withSchema] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({
        where: {
          AND: [
            { seoDescription: { not: null } },
            { seoDescription: { not: '' } },
          ],
        },
      }),
      prisma.post.count({ where: { seoIndexable: true } }),
      prisma.post.count({
        where: {
          AND: [
            { seoCanonicalPath: { not: null } },
            { seoCanonicalPath: { not: '' } },
          ],
        },
      }),
    ]);

    const healthScore = total > 0 ? Math.round((withMeta / total) * 100) : 0;
    return { total, withMeta, indexed, withSchema, healthScore };
  } catch {
    return { total: 0, withMeta: 0, indexed: 0, withSchema: 0, healthScore: 0 };
  }
}

export async function getTopSearchQueries(limit = 20) {
  try {
    const nowIso = new Date().toISOString();
    const rows = await getTopSearches(30, limit);
    return rows.map((row) => ({
      _id: row.query,
      count: row.count,
      lastSearched: nowIso,
    }));
  } catch {
    return [];
  }
}

export async function getIndexCoverage() {
  try {
    const [indexed, noindex, total] = await Promise.all([
      prisma.post.count({ where: { seoIndexable: true } }),
      prisma.post.count({ where: { seoIndexable: false } }),
      prisma.post.count(),
    ]);

    const missing = Math.max(0, total - indexed - noindex);
    return { indexed, noindex, missing };
  } catch {
    return { indexed: 0, noindex: 0, missing: 0 };
  }
}

export const seoService = { getSEOMetrics, getTopSearchQueries, getIndexCoverage };
export default seoService;
