-- =============================================
-- FlavorPoints - Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. TABLES
-- =============================================

-- Customers (extends auth.users)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'employee', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_amount FLOAT NOT NULL,
  points_earned INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES public.customers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price FLOAT NOT NULL,
  category TEXT DEFAULT 'Main',
  image_url TEXT DEFAULT '',
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  points_cost INTEGER NOT NULL,
  image_url TEXT DEFAULT '',
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game History
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  entry_cost INTEGER NOT NULL,
  winnings INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missions
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  target INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward Redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  points_cost INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Sign-Ins
CREATE TABLE IF NOT EXISTS public.daily_sign_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sign_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_awarded INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, sign_in_date)
);

-- =============================================
-- 2. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_role ON public.customers(role);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON public.visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_game_history_customer ON public.game_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_missions_customer ON public.missions(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer ON public.reward_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_daily_sign_ins_customer ON public.daily_sign_ins(customer_id);
CREATE INDEX IF NOT EXISTS idx_daily_sign_ins_date ON public.daily_sign_ins(sign_in_date);

-- =============================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER - bypasses RLS to avoid recursion)
-- =============================================
-- IMPORTANT: These must be created BEFORE RLS policies that reference them!

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.customers WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers WHERE id = auth.uid() AND role = 'employee');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_employee()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers WHERE id = auth.uid() AND role IN ('admin', 'employee'));
$$;

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sign_ins ENABLE ROW LEVEL SECURITY;

-- ---------- Customers ----------
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.customers FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.customers FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all customers (uses helper function to avoid recursion)
CREATE POLICY "Admins can read all customers"
  ON public.customers FOR SELECT
  USING (public.is_admin());

-- Employees can read all customers (uses helper function to avoid recursion)
CREATE POLICY "Employees can read all customers"
  ON public.customers FOR SELECT
  USING (public.is_employee());

-- Anyone can insert (for signup)
CREATE POLICY "Allow signup insert"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------- Visits ----------
-- Users can read their own visits
CREATE POLICY "Users can read own visits"
  ON public.visits FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can read all visits
CREATE POLICY "Admins can read all visits"
  ON public.visits FOR SELECT
  USING (public.is_admin());

-- Employees can read all visits
CREATE POLICY "Employees can read all visits"
  ON public.visits FOR SELECT
  USING (public.is_employee());

-- Visits are created via RPC function (add_visit)

-- ---------- Menu Items ----------
-- Public read access
CREATE POLICY "Public read menu items"
  ON public.menu_items FOR SELECT
  USING (true);

-- Admins can manage menu items
CREATE POLICY "Admins can insert menu items"
  ON public.menu_items FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update menu items"
  ON public.menu_items FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete menu items"
  ON public.menu_items FOR DELETE
  USING (public.is_admin());

-- ---------- Rewards ----------
-- Public read access
CREATE POLICY "Public read rewards"
  ON public.rewards FOR SELECT
  USING (true);

-- Admins can manage rewards
CREATE POLICY "Admins can insert rewards"
  ON public.rewards FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update rewards"
  ON public.rewards FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete rewards"
  ON public.rewards FOR DELETE
  USING (public.is_admin());

-- ---------- Game History ----------
-- Users can read their own game history
CREATE POLICY "Users can read own game history"
  ON public.game_history FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can read all game history
CREATE POLICY "Admins can read all game history"
  ON public.game_history FOR SELECT
  USING (public.is_admin());

-- Game history is created via RPC function (play_game)

-- ---------- App Settings ----------
-- Public read access
CREATE POLICY "Public read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Admins can manage settings
CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (public.is_admin());

-- ---------- Missions ----------
-- Users can read their own missions
CREATE POLICY "Users can read own missions"
  ON public.missions FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can read all missions
CREATE POLICY "Admins can read all missions"
  ON public.missions FOR SELECT
  USING (public.is_admin());

-- Employees can read all missions
CREATE POLICY "Employees can read all missions"
  ON public.missions FOR SELECT
  USING (public.is_employee());

-- Admins can insert missions
CREATE POLICY "Admins can insert missions"
  ON public.missions FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update missions
CREATE POLICY "Admins can update missions"
  ON public.missions FOR UPDATE
  USING (public.is_admin());

-- Admins can delete missions
CREATE POLICY "Admins can delete missions"
  ON public.missions FOR DELETE
  USING (public.is_admin());

-- Missions are managed via RPC functions

-- ---------- Reward Redemptions ----------
-- Users can read their own redemptions
CREATE POLICY "Users can read own redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can read all redemptions
CREATE POLICY "Admins can read all redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (public.is_admin());

-- Redemptions are created via RPC function (redeem_reward)

-- ---------- Daily Sign-Ins ----------
-- Users can read their own daily sign-ins
CREATE POLICY "Users can read own daily sign-ins"
  ON public.daily_sign_ins FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can read all daily sign-ins
CREATE POLICY "Admins can read all daily sign-ins"
  ON public.daily_sign_ins FOR SELECT
  USING (public.is_admin());

-- Daily sign-ins are created via RPC function (claim_daily_sign_in)

-- =============================================
-- 5. POSTGRESQL FUNCTIONS (RPC)
-- =============================================

-- ADD VISIT: Employee adds a visit for a customer
CREATE OR REPLACE FUNCTION public.add_visit(
  p_customer_id UUID,
  p_invoice_amount FLOAT,
  p_created_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_per_currency FLOAT;
  v_points_earned INT;
  v_new_points INT;
  v_visit_id UUID;
  v_mission RECORD;
  v_new_progress INT;
  v_total_spend FLOAT;
  v_mission_points INT;
BEGIN
  -- Get points per currency setting
  SELECT (value)::FLOAT INTO v_points_per_currency
  FROM public.app_settings WHERE key = 'points_per_currency';

  IF v_points_per_currency IS NULL THEN
    v_points_per_currency := 1;
  END IF;

  v_points_earned := FLOOR(p_invoice_amount * v_points_per_currency);

  -- Create visit
  INSERT INTO public.visits (id, customer_id, invoice_amount, points_earned, created_by)
  VALUES (gen_random_uuid(), p_customer_id, p_invoice_amount, v_points_earned, p_created_by)
  RETURNING id INTO v_visit_id;

  -- Update customer points and visits
  UPDATE public.customers
  SET points = points + v_points_earned,
      total_visits = total_visits + 1,
      updated_at = NOW()
  WHERE id = p_customer_id
  RETURNING points INTO v_new_points;

  -- Update missions
  FOR v_mission IN
    SELECT id, type, target, progress, points AS mission_points, completed
    FROM public.missions
    WHERE customer_id = p_customer_id AND completed = false
  LOOP
    v_new_progress := v_mission.progress;

    IF v_mission.type IN ('visit_5', 'visit_10') THEN
      SELECT total_visits INTO v_new_progress
      FROM public.customers WHERE id = p_customer_id;
    ELSIF v_mission.type = 'spend_200' THEN
      SELECT COALESCE(FLOOR(SUM(invoice_amount)), 0) INTO v_new_progress
      FROM public.visits WHERE customer_id = p_customer_id;
    END IF;

    IF v_new_progress >= v_mission.target THEN
      UPDATE public.missions SET progress = v_new_progress, completed = true, updated_at = NOW()
      WHERE id = v_mission.id;

      -- Award mission points
      v_mission_points := v_mission.mission_points;
      IF v_mission_points > 0 THEN
        UPDATE public.customers SET points = points + v_mission_points, updated_at = NOW()
        WHERE id = p_customer_id;
        v_new_points := v_new_points + v_mission_points;
      END IF;
    ELSE
      UPDATE public.missions SET progress = v_new_progress, updated_at = NOW()
      WHERE id = v_mission.id;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'visit_id', v_visit_id,
    'points_earned', v_points_earned,
    'new_points_balance', v_new_points
  );
END;
$$;

-- PLAY GAME: Record a game play with entry cost and winnings
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
      ELSE v_entry_cost := 50;
    END CASE;
  END IF;

  -- Get cooldown from settings
  SELECT (value)::INT INTO v_cooldown_days
  FROM public.app_settings WHERE key = 'game_cooldown_' || p_game_type;
  IF v_cooldown_days IS NULL THEN
    CASE p_game_type
      WHEN 'burger_catch' THEN v_cooldown_days := 7;
      WHEN 'coffee_shooter' THEN v_cooldown_days := 7;
      WHEN 'grand_wheel' THEN v_cooldown_days := 30;
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
    'game_id', v_game_id,
    'entry_cost', v_entry_cost,
    'winnings', p_winnings,
    'new_points_balance', v_new_points
  );
END;
$$;

-- REDEEM REWARD: Redeem a reward for a customer (STAFF ONLY - admin/employee)
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_customer_id UUID,
  p_reward_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward_name TEXT;
  v_points_cost INT;
  v_customer_points INT;
  v_new_points INT;
  v_redemption_id UUID;
BEGIN
  -- Only admin or employee can redeem rewards (customers cannot redeem themselves)
  IF NOT public.is_admin_or_employee() THEN
    RETURN json_build_object('error', 'Only staff can redeem rewards. Please ask an employee.');
  END IF;

  -- Get reward details
  SELECT name, points_cost INTO v_reward_name, v_points_cost
  FROM public.rewards WHERE id = p_reward_id AND available = true;

  IF v_reward_name IS NULL THEN
    RETURN json_build_object('error', 'Reward not available');
  END IF;

  -- Check sufficient points
  SELECT points INTO v_customer_points
  FROM public.customers WHERE id = p_customer_id;

  IF v_customer_points < v_points_cost THEN
    RETURN json_build_object('error', 'Insufficient points');
  END IF;

  -- Deduct points
  UPDATE public.customers
  SET points = points - v_points_cost, updated_at = NOW()
  WHERE id = p_customer_id;

  -- Create redemption
  INSERT INTO public.reward_redemptions (id, customer_id, reward_id, points_cost)
  VALUES (gen_random_uuid(), p_customer_id, p_reward_id, v_points_cost)
  RETURNING id INTO v_redemption_id;

  -- Get new balance
  SELECT points INTO v_new_points FROM public.customers WHERE id = p_customer_id;

  RETURN json_build_object(
    'redemption_id', v_redemption_id,
    'new_points_balance', v_new_points,
    'reward_name', v_reward_name
  );
END;
$$;

-- CLAIM DAILY SIGN-IN: Award daily sign-in points
CREATE OR REPLACE FUNCTION public.claim_daily_sign_in(
  p_customer_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_awarded INT;
  v_new_points INT;
  v_sign_in_id UUID;
  v_streak INT;
  v_already_claimed BOOLEAN;
BEGIN
  -- Get points amount from settings (default 5)
  SELECT (value)::INT INTO v_points_awarded
  FROM public.app_settings WHERE key = 'daily_sign_in_points';
  IF v_points_awarded IS NULL THEN
    v_points_awarded := 5;
  END IF;

  -- Check if already claimed today
  SELECT EXISTS (
    SELECT 1 FROM public.daily_sign_ins
    WHERE customer_id = p_customer_id AND sign_in_date = CURRENT_DATE
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN json_build_object('error', 'Already claimed today');
  END IF;

  -- Calculate streak (consecutive days)
  SELECT COUNT(*) INTO v_streak
  FROM public.daily_sign_ins
  WHERE customer_id = p_customer_id
    AND sign_in_date >= CURRENT_DATE - INTERVAL '6 days'
    AND sign_in_date < CURRENT_DATE;

  -- Insert sign-in record
  INSERT INTO public.daily_sign_ins (id, customer_id, sign_in_date, points_awarded)
  VALUES (gen_random_uuid(), p_customer_id, CURRENT_DATE, v_points_awarded)
  RETURNING id INTO v_sign_in_id;

  -- Award points
  UPDATE public.customers
  SET points = points + v_points_awarded, updated_at = NOW()
  WHERE id = p_customer_id;

  -- Get new balance
  SELECT points INTO v_new_points FROM public.customers WHERE id = p_customer_id;

  RETURN json_build_object(
    'sign_in_id', v_sign_in_id,
    'points_awarded', v_points_awarded,
    'new_points_balance', v_new_points,
    'streak', v_streak + 1
  );
END;
$$;

-- =============================================
-- 6. SEED DATA
-- =============================================

-- App Settings
INSERT INTO public.app_settings (key, value) VALUES
  ('points_per_currency', '1'),
  ('game_cost_burger_catch', '50'),
  ('game_cost_coffee_shooter', '50'),
  ('game_cost_grand_wheel', '100'),
  ('game_cooldown_burger_catch', '7'),
  ('game_cooldown_coffee_shooter', '7'),
  ('game_cooldown_grand_wheel', '30'),
  ('mission_target_visit_5', '5'),
  ('mission_target_visit_10', '10'),
  ('mission_target_spend_200', '200'),
  ('daily_sign_in_points', '5'),
  -- Default win tiers for skill-based games (Burger Catch, Coffee Shooter).
  -- Evaluated top-down: the first tier whose minScore the player reaches wins.
  ('game_tiers_burger_catch', '[{"minScore":100,"reward":200},{"minScore":80,"reward":150},{"minScore":60,"reward":100},{"minScore":40,"reward":70},{"minScore":20,"reward":30},{"minScore":10,"reward":10}]'),
  ('game_tiers_coffee_shooter', '[{"minScore":100,"reward":200},{"minScore":80,"reward":150},{"minScore":60,"reward":100},{"minScore":40,"reward":70},{"minScore":20,"reward":30},{"minScore":10,"reward":10}]'),
  -- Default 12 segments for the Grand / Lounge Wheel: {label, value, color}
  ('grand_wheel_segments', '[{"label":"0","value":0,"color":"#374151"},{"label":"20","value":20,"color":"#7c3aed"},{"label":"50","value":50,"color":"#a855f7"},{"label":"0","value":0,"color":"#1f2937"},{"label":"100","value":100,"color":"#ec4899"},{"label":"10","value":10,"color":"#8b5cf6"},{"label":"0","value":0,"color":"#374151"},{"label":"30","value":30,"color":"#6366f1"},{"label":"200","value":200,"color":"#f59e0b"},{"label":"0","value":0,"color":"#1f2937"},{"label":"75","value":75,"color":"#c084fc"},{"label":"5","value":5,"color":"#7c3aed"}]')
ON CONFLICT (key) DO NOTHING;

-- Menu Items (Uno Cafe' Lounge)
INSERT INTO public.menu_items (name, description, price, category) VALUES
  -- Coffee
  ('Espresso',            'Rich and bold single shot of premium espresso',              3.50, 'Coffee'),
  ('Americano',           'Espresso diluted with hot water for a smooth cup',           4.00, 'Coffee'),
  ('Cappuccino',          'Espresso with steamed milk and velvety foam',                4.75, 'Coffee'),
  ('Latte',               'Espresso with creamy steamed milk and a light foam top',     5.25, 'Coffee'),
  ('Flat White',          'Double ristretto with silky microfoam',                      5.50, 'Coffee'),
  ('Mocha',               'Espresso with Belgian chocolate and steamed milk',           5.75, 'Coffee'),
  ('Turkish Coffee',      'Traditional finely ground coffee brewed in a cezve',         4.50, 'Coffee'),
  ('Cold Brew',           'Slow-steeped 18 hours for a smooth, low-acidity cold coffee',5.50, 'Coffee'),
  ('Iced Latte',          'Chilled espresso with cold milk over ice',                   5.75, 'Coffee'),
  ('Caramel Macchiato',   'Vanilla, steamed milk, espresso and a caramel drizzle',      6.25, 'Coffee'),
  -- Pastries
  ('Butter Croissant',    'Flaky, buttery French-style croissant',                      3.25, 'Pastries'),
  ('Pain au Chocolat',    'Croissant pastry with rich dark chocolate',                  3.75, 'Pastries'),
  ('Blueberry Muffin',    'Soft muffin loaded with fresh blueberries',                  3.50, 'Pastries'),
  ('Cinnamon Roll',       'Warm roll swirled with cinnamon and cream cheese glaze',     4.25, 'Pastries'),
  ('Banana Bread',        'Moist banana bread slice, lightly toasted',                  3.50, 'Pastries'),
  -- Light Bites
  ('Avocado Toast',       'Smashed avocado on sourdough with chili flakes and lime',    8.50, 'Light Bites'),
  ('Club Sandwich',       'Triple-decker turkey, bacon, lettuce and tomato',            9.75, 'Light Bites'),
  ('Caesar Salad',        'Romaine, croutons, parmesan and classic caesar dressing',    8.25, 'Light Bites'),
  ('Tomato Basil Soup',   'Creamy roasted tomato soup with fresh basil',                6.50, 'Light Bites'),
  ('Margherita Flatbread','Flatbread with tomato, mozzarella and fresh basil',          9.50, 'Light Bites'),
  -- Desserts
  ('Tiramisu',            'Coffee-soaked ladyfingers layered with mascarpone',          5.50, 'Desserts'),
  ('New York Cheesecake', 'Classic dense and creamy cheesecake with berry coulis',      5.25, 'Desserts'),
  ('Chocolate Lava Cake', 'Warm cake with a molten chocolate center',                   5.75, 'Desserts'),
  ('Baklava',             'Layered filo with nuts and honey syrup',                     4.75, 'Desserts')
ON CONFLICT DO NOTHING;

-- =============================================
-- 7. STORAGE BUCKETS & POLICIES
-- =============================================

-- Create menu-images storage bucket (run in SQL editor or via Supabase Dashboard → Storage)
-- NOTE: Storage buckets are best created via the Supabase Dashboard:
--   1. Go to Storage → New Bucket
--   2. Name: "menu-images"
--   3. Make it PUBLIC (so images are accessible without auth)
--   4. File size limit: 5MB
--   5. Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp, image/gif
--
-- Then run these RLS policies in the SQL Editor:

-- Allow public read access to menu images
CREATE POLICY "Public read menu images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Allow admins to upload menu images
CREATE POLICY "Admins can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());

-- Allow admins to update menu images
CREATE POLICY "Admins can update menu images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND public.is_admin());

-- Allow admins to delete menu images
CREATE POLICY "Admins can delete menu images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND public.is_admin());

-- Rewards (Uno Cafe' Lounge)
INSERT INTO public.rewards (name, description, points_cost) VALUES
  ('Free Espresso',           'Enjoy a free single espresso on us!',                      100),
  ('Free Cappuccino',         'A complimentary cappuccino, made just for you',            150),
  ('Free Butter Croissant',   'Fresh flaky croissant for free',                           120),
  ('Buy 1 Get 1 Coffee',      'Get two coffees for the price of one',                     180),
  ('Free Cold Brew',          'Smooth 18-hour cold brew on the house',                    220),
  ('Free Avocado Toast',      'Our signature avocado toast for free',                     300),
  ('Free Dessert',            'Choose any dessert from our menu',                         300),
  ('$5 Off Your Order',       'Get $5 discount on any order',                             250),
  ('Free Caramel Macchiato',  'Our premium caramel macchiato, complimentary',             350),
  ('$10 Off Your Order',      'Get $10 discount on any order',                            500),
  ('Lounge VIP Seating',      'Priority seating in our VIP lounge + free appetizer',      750),
  ('Free Brunch for Two',     'Complimentary brunch for two at Uno Cafe Lounge',         1500)
ON CONFLICT DO NOTHING;
