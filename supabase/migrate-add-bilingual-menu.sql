-- =============================================
-- Migration: Add bilingual (Arabic + English) support
-- for Menu Categories and Menu Items.
--
-- Safe to re-run (idempotent). For EXISTING deployments only.
-- Fresh installs already include this in supabase/schema.sql.
--
-- What this adds:
--   1. menu_categories:
--        name_en TEXT  (display name shown when locale = English)
--        name_ar TEXT  (display name shown when locale = Arabic)
--   2. menu_items:
--        name_en TEXT, name_ar TEXT
--        description_en TEXT, description_ar TEXT
--   3. Backfill: existing `name` / `description` values are copied
--      into the new *_en columns so no data is lost.
--   4. The original `name` / `description` / `display_name` columns
--      are KEPT for backward compatibility (older reads still work).
--   5. Optional GIN trigram indexes for fast bilingual ilike search.
--      These are created ONLY if the pg_trgm extension can be enabled.
--      If the extension is not available (or the user lacks privileges),
--      the indexes are silently skipped and search falls back to a
--      sequential scan — application behavior is unchanged.
--
-- Application code reads the new bilingual columns and falls back
-- to the legacy column when the localized value is empty/NULL.
-- =============================================

-- ---------------------------------------------------------------
-- 0. Try to enable the pg_trgm extension EARLY so the optional
--    trigram indexes at the end of this script can use it.
--    Supabase enables pg_trgm by default on fresh projects, but
--    existing projects may need it. This is wrapped in an exception
--    handler so the whole migration still succeeds if the current
--    role cannot create extensions.
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'pg_trgm extension could not be created (insufficient privileges). Trigram indexes will be skipped; bilingual search still works via sequential scan.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension could not be created (%). Trigram indexes will be skipped; bilingual search still works via sequential scan.', SQLERRM;
END $$;

-- ---------------------------------------------------------------
-- 1. menu_categories: add name_en / name_ar
-- ---------------------------------------------------------------
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS name_en TEXT;

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Backfill name_en from the existing display_name (or name) column.
-- Coalesce ensures we never write NULL into name_en when display_name
-- already has a value.
UPDATE public.menu_categories
SET name_en = COALESCE(NULLIF(TRIM(name_en), ''), display_name, name)
WHERE name_en IS NULL OR TRIM(name_en) = '';

-- If name_ar is still empty, fall back to the English value so the
-- customer never sees a blank label. Admins can edit later.
UPDATE public.menu_categories
SET name_ar = COALESCE(NULLIF(TRIM(name_ar), ''), name_en, display_name, name)
WHERE name_ar IS NULL OR TRIM(name_ar) = '';

-- ---------------------------------------------------------------
-- 2. menu_items: add name_en / name_ar / description_en / description_ar
-- ---------------------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_en TEXT;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS description_en TEXT;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Backfill name_en / description_en from the legacy columns.
UPDATE public.menu_items
SET
  name_en = COALESCE(NULLIF(TRIM(name_en), ''), name)
WHERE name_en IS NULL OR TRIM(name_en) = '';

UPDATE public.menu_items
SET
  description_en = COALESCE(NULLIF(TRIM(description_en), ''), description, '')
WHERE description_en IS NULL OR TRIM(description_en) = '';

-- Arabic fallback to English (admin will localize later).
UPDATE public.menu_items
SET
  name_ar = COALESCE(NULLIF(TRIM(name_ar), ''), name_en, name)
WHERE name_ar IS NULL OR TRIM(name_ar) = '';

UPDATE public.menu_items
SET
  description_ar = COALESCE(NULLIF(TRIM(description_ar), ''), description_en, description, '')
WHERE description_ar IS NULL OR TRIM(description_ar) = '';

-- ---------------------------------------------------------------
-- 3. Optional GIN trigram indexes for bilingual search.
--    These dramatically speed up ilike queries on large menus.
--    They require the pg_trgm extension (enabled in step 0).
--    Wrapped in a DO block so the whole migration still succeeds
--    even if pg_trgm is not available — search just falls back
--    to a sequential scan, which is fine for small menus.
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_menu_items_name_en_trgm
    ON public.menu_items USING gin (name_en gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_menu_items_name_ar_trgm
    ON public.menu_items USING gin (name_ar gin_trgm_ops);
EXCEPTION
  WHEN feature_not_supported THEN
    RAISE NOTICE 'Trigram indexes skipped — pg_trgm extension not available. Bilingual search will use a sequential scan.';
  WHEN undefined_object THEN
    RAISE NOTICE 'Trigram indexes skipped — operator class gin_trgm_ops not available. Bilingual search will use a sequential scan.';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Trigram indexes skipped — insufficient privileges. Bilingual search will use a sequential scan.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Trigram indexes skipped (%). Bilingual search will use a sequential scan.', SQLERRM;
END $$;

-- ---------------------------------------------------------------
-- Done. RLS policies on menu_items / menu_categories already cover
-- the new columns (RLS is column-agnostic in Postgres).
-- Application code reads the new bilingual columns and falls back
-- to the legacy `name` / `description` / `display_name` columns
-- when a localized value is empty.
-- =============================================
