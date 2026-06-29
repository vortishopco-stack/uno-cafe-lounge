-- =============================================================
-- Migration: Add admin-configurable Grand Wheel segments and
-- Lucky Scratch prize tables.
-- =============================================================
-- Run this in the Supabase SQL Editor on an EXISTING deployment
-- to enable the new Game Prize Configuration admin UI.
-- Safe to re-run (uses ON CONFLICT DO NOTHING).
--
-- What this does:
--   1. Inserts two JSON config rows into app_settings:
--        - game_config_grand_wheel   → JSON array of segments
--        - game_config_lucky_scratch → JSON array of prizes
--      These mirror the hardcoded defaults in the app so the
--      admin sees pre-populated values when they first open the
--      Game Prize Configuration card.
--
--   2. The app reads these rows via the existing public RLS
--      policies on app_settings (public SELECT, admin INSERT/
--      UPDATE/DELETE). No new policies or tables are needed.
--
-- Note: If you skip this migration entirely, the app still works
-- — it falls back to hardcoded defaults. Running this migration
-- just pre-populates the admin form with the current default
-- values so the admin can tweak from a known starting point.
-- =============================================================

-- Default Grand Wheel segments (12 segments) — same as
-- DEFAULT_GRAND_WHEEL_SEGMENTS in src/lib/api.ts.
INSERT INTO public.app_settings (key, value) VALUES
  (
    'game_config_grand_wheel',
    '[
      {"label":"0","value":0,"color":"#374151"},
      {"label":"20","value":20,"color":"#7c3aed"},
      {"label":"50","value":50,"color":"#a855f7"},
      {"label":"0","value":0,"color":"#1f2937"},
      {"label":"100","value":100,"color":"#ec4899"},
      {"label":"10","value":10,"color":"#8b5cf6"},
      {"label":"0","value":0,"color":"#374151"},
      {"label":"30","value":30,"color":"#6366f1"},
      {"label":"200","value":200,"color":"#f59e0b"},
      {"label":"0","value":0,"color":"#1f2937"},
      {"label":"75","value":75,"color":"#c084fc"},
      {"label":"5","value":5,"color":"#7c3aed"}
    ]'
  )
ON CONFLICT (key) DO NOTHING;

-- Default Lucky Scratch prize table (5 prizes) — same as
-- DEFAULT_LUCKY_SCRATCH_PRIZES in src/lib/api.ts.
INSERT INTO public.app_settings (key, value) VALUES
  (
    'game_config_lucky_scratch',
    '[
      {"emoji":"🏆","label":"Jackpot!","value":300,"weight":3},
      {"emoji":"🎉","label":"Big Win!","value":100,"weight":10},
      {"emoji":"☕","label":"Free Coffee!","value":50,"weight":20},
      {"emoji":"🍪","label":"Small Treat!","value":20,"weight":30},
      {"emoji":"😊","label":"Try Again","value":0,"weight":37}
    ]'
  )
ON CONFLICT (key) DO NOTHING;

-- Done. The admin can now open Settings → Game Prize Configuration
-- and edit the Grand Wheel segments and Lucky Scratch prizes.
-- Changes take effect immediately for new game sessions (the games
-- fetch the config on mount).
