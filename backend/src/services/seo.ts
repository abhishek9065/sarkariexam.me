import { getCollection } from './cosmosdb.js';

export async function getSEOMetrics() {
  try {
    const col = getCollection('announcements');
    const [total, withMeta, indexed, withSchema] = await Promise.all([
      col.countDocuments(),
      col.countDocuments({ 'seo.metaDescription': { $exists: true, $ne: '' } }),
      col.countDocuments({ 'seo.indexPolicy': 'index' }),
      col.countDocuments({ schema: { $exists: true } }),
    ]);
    return { total, withMeta, indexed, withSchema, healthScore: Math.round((withMeta / total) * 100) };
  } catch (error) {
    return { total: 0, withMeta: 0, indexed: 0, withSchema: 0, healthScore: 0 };
  }
}

export async function getTopSearchQueries(limit = 20) {
  try {
    const col = getCollection('analytics_events');
    const pipeline = [
      { $match: { type: 'search', timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$metadata.query', count: { $sum: 1 }, lastSearched: { $max: '$timestamp' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ];
    return await col.aggregate(pipeline).toArray();
  } catch (error) {
    return [];
  }
}

export async function getIndexCoverage() {
  try {
    const col = getCollection('announcements');
    const [indexed, noindex, missing] = await Promise.all([
      col.countDocuments({ 'seo.indexPolicy': 'index' }),
      col.countDocuments({ 'seo.indexPolicy': 'noindex' }),
      col.countDocuments({ 'seo.indexPolicy': { $exists: false } }),
    ]);
    return { indexed, noindex, missing };
  } catch (error) {
    return { indexed: 0, noindex: 0, missing: 0 };
  }
}

export const seoService = { getSEOMetrics, getTopSearchQueries, getIndexCoverage };
export default seoService;
