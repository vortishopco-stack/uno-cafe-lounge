-- =============================================
-- Uno Cafe' Lounge — Reset DB + Create New Admin & Employee
-- =============================================
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. EDIT the placeholders in PART 2 (NEW_ADMIN_*, NEW_EMPLOYEE_*)
--      to set your own phone numbers, names, and passwords.
--   3. Paste this whole script and click RUN.
--
-- WHAT THIS DOES (top to bottom):
--   PART 1 — Empties ALL rows from every app table + all auth users
--            (table structure, RLS policies, and functions are kept)
--   PART 2 — Creates ONE new admin and ONE new employee
--   PART 3 — (Optional, commented out) re-seeds default app settings
--
-- IMPORTANT:
--   - Phone numbers can be any digits (e.g. 100000). You log in to the
--     app using the phone + password you set here.
--   - Requires the Supabase SQL Editor (it uses the elevated postgres
--     role, because we write directly to auth.users).
--   - Make sure "Confirm email" is OFF in Supabase Auth settings,
--     otherwise the new users can't sign in.
-- =============================================


-- =========================================================
-- PART 1: EMPTY ALL ROWS FROM EVERY TABLE
-- =========================================================

-- 1a. Delete ALL auth users.
--     (customers + their visits/game_history/missions/redemptions/
--      daily_sign_ins are deleted automatically via ON DELETE CASCADE.)
DELETE FROM auth.users;

-- 1b. Empty the standalone app tables (not linked to users).
TRUNCATE TABLE public.menu_items      RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.rewards         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.app_settings    RESTART IDENTITY CASCADE;

-- 1c. Empty the user-linked tables (safety net in case cascade didn't fire).
TRUNCATE TABLE public.daily_sign_ins     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.reward_redemptions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.missions           RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.game_history       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.visits             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.customers          RESTART IDENTITY CASCADE;

-- 1d. (Optional) Clear uploaded menu images from Supabase Storage.
DELETE FROM storage.objects WHERE bucket_id = 'menu-images';


-- =========================================================
-- PART 2: CREATE NEW ADMIN + EMPLOYEE
-- =========================================================
-- EDIT the values below (phone, name, password) to your liking.
-- Default if you don't edit:  Admin 100000 / admin123
--                              Staff 200000 / staff123
-- =========================================================

-- ---- New Admin account ----
DO $$
DECLARE
  v_admin_phone    TEXT := '100000';       -- <-- admin phone (digits only)
  v_admin_name     TEXT := 'Admin';        -- <-- admin display name
  v_admin_password TEXT := 'admin123';     -- <-- admin password
  v_admin_email    TEXT;
  v_admin_id       UUID;
BEGIN
  v_admin_email := v_admin_phone || '@flavorpoints.local';

  -- Create the auth user (bcrypt-hashed password)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token, email_change, phone_change
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_admin_email,
    crypt(v_admin_password, gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', ''
  )
  RETURNING id INTO v_admin_id;

  -- Link auth user -> customers profile with role = 'admin'
  INSERT INTO public.customers (id, phone, email, name, points, total_visits, role)
  VALUES (v_admin_id, v_admin_phone, v_admin_email, v_admin_name, 99999, 0, 'admin');
END $$;

-- ---- New Employee / Staff account ----
DO $$
DECLARE
  v_emp_phone    TEXT := '200000';         -- <-- employee phone (digits only)
  v_emp_name     TEXT := 'Staff';          -- <-- employee display name
  v_emp_password TEXT := 'staff123';       -- <-- employee password
  v_emp_email    TEXT;
  v_emp_id       UUID;
BEGIN
  v_emp_email := v_emp_phone || '@flavorpoints.local';

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token, email_change, phone_change
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    v_emp_email,
    crypt(v_emp_password, gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', ''
  )
  RETURNING id INTO v_emp_id;

  INSERT INTO public.customers (id, phone, email, name, points, total_visits, role)
  VALUES (v_emp_id, v_emp_phone, v_emp_email, v_emp_name, 0, 0, 'employee');
END $$;


-- =========================================================
-- PART 3 (OPTIONAL): RE-SEED DEFAULT APP SETTINGS
-- =========================================================
-- PART 1 emptied app_settings, so the games currently fall back to
-- built-in defaults. If you want the database defaults restored
-- (points per $, game costs, cooldowns, win tiers, wheel segments),
-- uncomment the block below and re-run just that part.

/*
INSERT INTO public.app_settings (key, value) VALUES
  ('points_per_dollar', '1'),
  ('daily_sign_in_points', '5'),
  ('game_cost_grand_wheel', '0'),
  ('game_cost_burger_catch', '50'),
  ('game_cost_coffee_shooter', '50'),
  ('game_cooldown_grand_wheel', '1'),
  ('game_cooldown_burger_catch', '7'),
  ('game_cooldown_coffee_shooter', '7'),
  ('game_tiers_burger_catch', '[{"minScore":100,"reward":200},{"minScore":80,"reward":150},{"minScore":60,"reward":100},{"minScore":40,"reward":70},{"minScore":20,"reward":30},{"minScore":10,"reward":10}]'),
  ('game_tiers_coffee_shooter', '[{"minScore":100,"reward":200},{"minScore":80,"reward":150},{"minScore":60,"reward":100},{"minScore":40,"reward":70},{"minScore":20,"reward":30},{"minScore":10,"reward":10}]'),
  ('grand_wheel_segments', '[{"label":"0","value":0,"color":"#374151"},{"label":"20","value":20,"color":"#7c3aed"},{"label":"50","value":50,"color":"#a855f7"},{"label":"0","value":0,"color":"#1f2937"},{"label":"100","value":100,"color":"#ec4899"},{"label":"10","value":10,"color":"#8b5cf6"},{"label":"0","value":0,"color":"#374151"},{"label":"30","value":30,"color":"#6366f1"},{"label":"200","value":200,"color":"#f59e0b"},{"label":"0","value":0,"color":"#1f2937"},{"label":"75","value":75,"color":"#c084fc"},{"label":"5","value":5,"color":"#7c3aed"}]')
ON CONFLICT (key) DO NOTHING;
*/


-- =========================================================
-- DONE. Login with the credentials you set in PART 2.
-- Default (if you didn't edit):  Admin 100000 / admin123
--                                 Staff 200000 / staff123
-- =========================================================
