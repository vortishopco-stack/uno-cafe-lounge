-- =============================================================
-- Migration: Add start_game + finish_game RPCs (two-phase game flow)
-- =============================================================
-- Run this in the Supabase SQL Editor on an EXISTING deployment
-- to enable the improved game flow:
--   1. Entry cost is deducted IMMEDIATELY when "Start Game" is clicked
--   2. Winnings are added AUTOMATICALLY when the game ends (no
--      "Collect Winnings" button needed)
--
-- What this does:
--   1. Adds `status` and `finished_at` columns to game_history
--      (status: 'started' → 'finished')
--   2. Creates `start_game(p_customer_id, p_game_type)` RPC:
--      checks cooldown + sufficient points, deducts entry cost,
--      records a game_history row with status='started'.
--   3. Creates `finish_game(p_game_id, p_winnings)` RPC:
--      adds winnings, marks the game as 'finished'. Idempotent.
--
-- The old `play_game` RPC is kept for backward compatibility —
-- existing game_history rows have status='finished' by default.
--
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =============================================================

-- 1. Add status + finished_at columns to game_history
ALTER TABLE public.game_history
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'finished' CHECK (status IN ('started', 'finished'));

ALTER TABLE public.game_history
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- Mark all existing rows as 'finished' (they were created by play_game
-- which does both deduct + add atomically).
UPDATE public.game_history SET status = 'finished' WHERE status IS NULL;

-- 2. start_game RPC
CREATE OR REPLACE FUNCTION public.start_game(
  p_customer_id UUID,
  p_game_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_cost INT;
  v_cooldown_days INT;
  v_last_play TIMESTAMPTZ;
  v_cooldown_ms BIGINT;
  v_time_since BIGINT;
  v_remaining_hours INT;
  v_new_points INT;
  v_game_id UUID;
BEGIN
  SELECT (value)::INT INTO v_entry_cost
  FROM public.app_settings WHERE key = 'game_cost_' || p_game_type;
  IF v_entry_cost IS NULL THEN
    CASE p_game_type
      WHEN 'burger_catch' THEN v_entry_cost := 50;
      WHEN 'coffee_shooter' THEN v_entry_cost := 50;
      WHEN 'grand_wheel' THEN v_entry_cost := 100;
      WHEN 'shoot_target' THEN v_entry_cost := 60;
      WHEN 'lucky_scratch' THEN v_entry_cost := 40;
      ELSE v_entry_cost := 50;
    END CASE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE key = 'game_enabled_' || p_game_type AND value = 'false'
  ) THEN
    RETURN json_build_object('error', 'This game is currently unavailable');
  END IF;

  SELECT (value)::INT INTO v_cooldown_days
  FROM public.app_settings WHERE key = 'game_cooldown_' || p_game_type;
  IF v_cooldown_days IS NULL THEN
    CASE p_game_type
      WHEN 'burger_catch' THEN v_cooldown_days := 7;
      WHEN 'coffee_shooter' THEN v_cooldown_days := 7;
      WHEN 'grand_wheel' THEN v_cooldown_days := 30;
      WHEN 'shoot_target' THEN v_cooldown_days := 7;
      WHEN 'lucky_scratch' THEN v_cooldown_days := 3;
      ELSE v_cooldown_days := 7;
    END CASE;
  END IF;

  SELECT played_at INTO v_last_play
  FROM public.game_history
  WHERE customer_id = p_customer_id AND game_type = p_game_type AND status = 'finished'
  ORDER BY played_at DESC LIMIT 1;

  IF v_last_play IS NOT NULL THEN
    v_cooldown_ms := v_cooldown_days * 24 * 60 * 60 * 1000;
    v_time_since := EXTRACT(EPOCH FROM (NOW() - v_last_play)) * 1000;
    IF v_time_since < v_cooldown_ms THEN
      v_remaining_hours := CEIL((v_cooldown_ms - v_time_since) / 3600000.0);
      RETURN json_build_object(
        'error', 'Cooldown active. Try again in ' || v_remaining_hours || ' hours',
        'cooldown_remaining', v_cooldown_ms - v_time_since
      );
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id AND points >= v_entry_cost) THEN
    RETURN json_build_object('error', 'Insufficient points');
  END IF;

  UPDATE public.customers
  SET points = points - v_entry_cost, updated_at = NOW()
  WHERE id = p_customer_id;

  INSERT INTO public.game_history (id, customer_id, game_type, entry_cost, winnings, status)
  VALUES (gen_random_uuid(), p_customer_id, p_game_type, v_entry_cost, 0, 'started')
  RETURNING id INTO v_game_id;

  SELECT points INTO v_new_points FROM public.customers WHERE id = p_customer_id;

  RETURN json_build_object(
    'game_id', v_game_id,
    'entry_cost', v_entry_cost,
    'new_points_balance', v_new_points
  );
END;
$$;

-- 3. finish_game RPC
CREATE OR REPLACE FUNCTION public.finish_game(
  p_game_id UUID,
  p_winnings INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_new_points INT;
BEGIN
  SELECT * INTO v_game FROM public.game_history WHERE id = p_game_id;
  IF v_game.id IS NULL THEN
    RETURN json_build_object('error', 'Game not found');
  END IF;

  IF v_game.status = 'finished' THEN
    SELECT points INTO v_new_points FROM public.customers WHERE id = v_game.customer_id;
    RETURN json_build_object(
      'success', TRUE,
      'already_finished', TRUE,
      'points_awarded', 0,
      'new_points_balance', v_new_points
    );
  END IF;

  IF p_winnings > 0 THEN
    UPDATE public.customers
    SET points = points + p_winnings, updated_at = NOW()
    WHERE id = v_game.customer_id;
  END IF;

  UPDATE public.game_history
  SET winnings = p_winnings,
      status = 'finished',
      finished_at = NOW()
  WHERE id = p_game_id;

  SELECT points INTO v_new_points FROM public.customers WHERE id = v_game.customer_id;

  RETURN json_build_object(
    'success', TRUE,
    'already_finished', FALSE,
    'points_awarded', p_winnings,
    'new_points_balance', v_new_points
  );
END;
$$;

-- Done. The app now:
--   1. Calls start_game() when the user clicks "Start Game" → entry cost
--      is deducted immediately and the balance updates.
--   2. Calls finish_game() automatically when the game ends → winnings
--      are added immediately. No "Collect Winnings" button needed.
