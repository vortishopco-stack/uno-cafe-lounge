-- =============================================
-- Migration: Add bilingual (Arabic + English) support for Rewards.
--
-- Safe to re-run (idempotent). For EXISTING deployments only.
-- Fresh installs already include this in supabase/schema.sql.
--
-- Companion to migrate-add-bilingual-menu.sql — same pattern.
--
-- What this adds:
--   1. rewards:
--        name_en TEXT, name_ar TEXT
--        description_en TEXT, description_ar TEXT
--   2. Backfill: existing `name` / `description` values are copied
--      into the new *_en columns so no data is lost.
--   3. The original `name` / `description` columns are KEPT for
--      backward compatibility (older reads still work).
--
-- Application code reads the new bilingual columns and falls back
-- to the legacy column when the localized value is empty/NULL.
-- =============================================

-- ---------------------------------------------------------------
-- 1. rewards: add name_en / name_ar / description_en / description_ar
-- ---------------------------------------------------------------
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS name_en TEXT;

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS description_en TEXT;

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Backfill name_en / description_en from the legacy columns.
UPDATE public.rewards
SET name_en = COALESCE(NULLIF(TRIM(name_en), ''), name)
WHERE name_en IS NULL OR TRIM(name_en) = '';

UPDATE public.rewards
SET description_en = COALESCE(NULLIF(TRIM(description_en), ''), description, '')
WHERE description_en IS NULL OR TRIM(description_en) = '';

-- Arabic fallback to English (admin will localize later).
UPDATE public.rewards
SET name_ar = COALESCE(NULLIF(TRIM(name_ar), ''), name_en, name)
WHERE name_ar IS NULL OR TRIM(name_ar) = '';

UPDATE public.rewards
SET description_ar = COALESCE(NULLIF(TRIM(description_ar), ''), description_en, description, '')
WHERE description_ar IS NULL OR TRIM(description_ar) = '';

-- ---------------------------------------------------------------
-- Done. RLS policies on rewards already cover the new columns
-- (RLS is column-agnostic in Postgres). No trigram indexes are
-- added here because rewards are not searchable in the customer
-- UI — they're just listed. If you add a rewards search later,
-- run migrate-add-bilingual-menu.sql first to enable pg_trgm,
-- then add an analogous index here.
-- =============================================
