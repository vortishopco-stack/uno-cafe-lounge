-- =============================================================
-- Migration: Switch currency display from USD ($) to JOD
-- =============================================================
-- Run this in the Supabase SQL Editor on an EXISTING deployment
-- to rename reward and mission rows that were seeded with USD ($)
-- labels. Safe to re-run (uses idempotent WHERE clauses).
--
-- What this does:
--   1. Renames reward rows whose `name` / `name_en` / `name_ar`
--      contain "$5" or "$10" to use "5 JOD" / "10 JOD" instead.
--      Also updates the Arabic form "5$" → "5 د.أ".
--   2. Renames the "Spend $200 Total" mission to "Spend 200 JOD Total".
--
-- Note: Menu item prices are stored as bare numbers (FLOAT) so
-- they need NO migration — the JOD symbol is applied at display
-- time by the formatCurrency() helper in the app.
-- =============================================================

-- 1) Rewards: replace "$5" / "$10" with "5 JOD" / "10 JOD"
--    across all six label columns (name, description, name_en,
--    name_ar, description_en, description_ar).
UPDATE public.rewards SET
  name             = REPLACE(name,             '$5 Off',  '5 JOD Off'),
  name_en          = REPLACE(name_en,          '$5 Off',  '5 JOD Off'),
  name_ar          = REPLACE(name_ar,          'خصم 5$',  'خصم 5 د.أ'),
  description      = REPLACE(description,      '$5',      '5 JOD'),
  description_en   = REPLACE(description_en,   '$5',      '5 JOD'),
  description_ar   = REPLACE(description_ar,   'خصم 5$',  'خصم 5 د.أ')
WHERE name LIKE '%$5 Off%' OR name_en LIKE '%$5 Off%' OR name_ar LIKE '%5$%';

UPDATE public.rewards SET
  name             = REPLACE(name,             '$10 Off', '10 JOD Off'),
  name_en          = REPLACE(name_en,          '$10 Off', '10 JOD Off'),
  name_ar          = REPLACE(name_ar,          'خصم 10$', 'خصم 10 د.أ'),
  description      = REPLACE(description,      '$10',     '10 JOD'),
  description_en   = REPLACE(description_en,   '$10',     '10 JOD'),
  description_ar   = REPLACE(description_ar,   'خصم 10$', 'خصم 10 د.أ')
WHERE name LIKE '%$10 Off%' OR name_en LIKE '%$10 Off%' OR name_ar LIKE '%10$%';

-- 2) Missions: rename "Spend $200 Total" → "Spend 200 JOD Total"
UPDATE public.missions
SET title = 'Spend 200 JOD Total'
WHERE title = 'Spend $200 Total';

-- Done. The app now displays all prices, rewards, and missions
-- in JOD. The legacy `name` / `description` columns are also
-- updated so any older code paths still show JOD.
