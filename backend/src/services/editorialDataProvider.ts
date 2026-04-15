import AuditLogModelPostgres from '../models/auditLogs.postgres.js';
import ContentTaxonomyModelPostgres from '../models/contentTaxonomies.postgres.js';
import PostModelPostgres from '../models/posts.postgres.js';

export function getEditorialDataProvider() {
  return {
    postModel: PostModelPostgres,
    taxonomyModel: ContentTaxonomyModelPostgres,
    auditLogModel: AuditLogModelPostgres,
  };
}
