-- Hand-edited (prisma migrate dev --create-only): Prisma cannot express the
-- extension or the generated column, so they are written here by hand.

-- Trigram matching for typo-tolerant title search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- array_to_string is only STABLE; a generated column needs IMMUTABLE inputs.
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT array_to_string($1, $2) $$;

-- Weighted full-text document: title (A), vendor + tags (B), description (C).
-- GENERATED ALWAYS keeps it in sync with no triggers or app code.
ALTER TABLE "products" ADD COLUMN "search" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("vendor", '')), 'B') ||
    setweight(to_tsvector('english', immutable_array_to_string("tags", ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

-- CreateIndex
CREATE INDEX "products_search_idx" ON "products" USING GIN ("search");

-- CreateIndex
CREATE INDEX "products_title_trgm_idx" ON "products" USING GIN ("title" gin_trgm_ops);
