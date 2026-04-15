-- PostgreSQL search acceleration for Sarkari content discovery.
-- Uses trigram for fuzzy/substring matching and tsvector for ranked FTS.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "posts_searchText_trgm_idx"
  ON "posts" USING GIN ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx"
  ON "posts" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "posts_summary_trgm_idx"
  ON "posts" USING GIN ("summary" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "posts_search_tsv_idx"
  ON "posts" USING GIN (
    to_tsvector(
      'simple',
      COALESCE("title", '') || ' ' || COALESCE("summary", '') || ' ' || COALESCE("searchText", '')
    )
  );

CREATE INDEX IF NOT EXISTS "content_pages_payload_gin_idx"
  ON "content_pages" USING GIN ("payload");
