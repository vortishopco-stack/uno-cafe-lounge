-- =============================================================
-- Migration: Remove the "Predict the Match" game
-- =============================================================
-- Run this in the Supabase SQL Editor to clean up an EXISTING
-- deployment after the predict_match game was removed from the
-- app. Safe to re-run.
--
-- What this does:
--   1. Drops the three app_settings rows that configured
--      predict_match (cost / cooldown / enabled).
--   2. Re-creates play_game() so its CASE statements no longer
--      reference predict_match (purely cosmetic — the function
--      would still work with the rows gone, but this keeps the
--      function body in sync with the app).
--   3. Leaves game_history rows for predict_match untouched so
--      customers' historical play records remain intact.
-- =============================================================

-- 1) Remove predict_match settings rows
DELETE FROM public.app_settings
WHERE key IN (
  'game_cost_predict_match',
  'game_cooldown_predict_match',
  'game_enabled_predict_match'
);

-- 2) Re-create play_game() without the predict_match cases
CREATE OR REPLACE FUNCTION public.play_game(
  p_customer_id UUID,
  p_game_type TEXT,
  p_winnings INT
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
  -- Get game cost from settings
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

  -- Block hidden (disabled) games from being played
  IF EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE key = 'game_enabled_' || p_game_type AND value = 'false'
  ) THEN
    RETURN json_build_object('error', 'This game is currently unavailable');
  END IF;

  -- Get cooldown from settings
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

  -- Check cooldown
  SELECT played_at INTO v_last_play
  FROM public.game_history
  WHERE customer_id = p_customer_id AND game_type = p_game_type
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

  -- Check sufficient points
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id AND points >= v_entry_cost) THEN
    RETURN json_build_object('error', 'Insufficient points');
  END IF;

  -- Deduct entry cost
  UPDATE public.customers
  SET points = points - v_entry_cost, updated_at = NOW()
  WHERE id = p_customer_id;

  -- Record game
  INSERT INTO public.game_history (id, customer_id, game_type, entry_cost, winnings)
  VALUES (gen_random_uuid(), p_customer_id, p_game_type, v_entry_cost, p_winnings)
  RETURNING id INTO v_game_id;

  -- Add winnings
  IF p_winnings > 0 THEN
    UPDATE public.customers
    SET points = points + p_winnings, updated_at = NOW()
    WHERE id = p_customer_id;
  END IF;

  -- Get new balance
  SELECT points INTO v_new_points FROM public.customers WHERE id = p_customer_id;

  RETURN json_build_object(
    'success', TRUE,
    'game_type', p_game_type,
    'entry_cost', v_entry_cost,
    'winnings', p_winnings,
    'net', p_winnings - v_entry_cost,
    'new_points_balance', v_new_points,
    'game_id', v_game_id
  );
END;
$$;

-- Done. The Predict the Match game is now fully removed from the database.
-- Customer UI no longer shows it (the app's GameType union was also updated).
-- Historical game_history rows for predict_match are preserved for analytics.
