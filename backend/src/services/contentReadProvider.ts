import ContentPageModelPostgres from '../models/contentPages.postgres.js';
import ContentTaxonomyModelPostgres from '../models/contentTaxonomies.postgres.js';
import PostModelPostgres from '../models/posts.postgres.js';

export function getContentPostReadModel() {
  return PostModelPostgres;
}

export function getContentTaxonomyReadModel() {
  return ContentTaxonomyModelPostgres;
}

export function getContentPageReadModel() {
  return ContentPageModelPostgres;
}
