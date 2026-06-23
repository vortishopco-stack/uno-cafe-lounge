-- =============================================
-- Uno Cafe' Lounge - Seed Demo Users
-- Run this AFTER schema.sql AND after disabling
-- "Confirm email" in Supabase Auth settings
--
-- IMPORTANT: These INSERT into auth.users AND auth.identities.
-- auth.identities is REQUIRED by modern Supabase (GoTrue) for login.
-- Without it, login fails with HTTP 500 "Database error querying schema".
--
-- Requires the service_role key / Supabase SQL Editor (elevated privileges).
-- =============================================

-- Helper: Create auth user + identity + customer profile
-- We use auth.users directly since Supabase SQL Editor has the needed privileges

-- 1. Admin User (phone: 000000)
DO $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token, email_change, phone_change,
    raw_app_meta_data, raw_user_meta_data, confirmed_at
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    '000000@flavorpoints.local',
    crypt('admin123', gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', '',
    '{}'::jsonb, '{}'::jsonb, NOW()
  )
  RETURNING id INTO v_id;

  INSERT INTO auth.identities (
    id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id::text, 'email', v_id,
    jsonb_build_object('sub', v_id::text, 'email', '000000@flavorpoints.local', 'phone', ''),
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.customers (id, phone, email, name, points, total_visits, role)
  VALUES (v_id, '000000', '000000@flavorpoints.local', 'Admin', 99999, 0, 'admin');
END $$;

-- 2. Employee User (phone: 111111)
DO $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token, email_change, phone_change,
    raw_app_meta_data, raw_user_meta_data, confirmed_at
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    '111111@flavorpoints.local',
    crypt('emp123', gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', '',
    '{}'::jsonb, '{}'::jsonb, NOW()
  )
  RETURNING id INTO v_id;

  INSERT INTO auth.identities (
    id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id::text, 'email', v_id,
    jsonb_build_object('sub', v_id::text, 'email', '111111@flavorpoints.local', 'phone', ''),
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.customers (id, phone, email, name, points, total_visits, role)
  VALUES (v_id, '111111', '111111@flavorpoints.local', 'Staff Member', 0, 0, 'employee');
END $$;

-- 3. Customer 1 (phone: 123456)
DO $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token, email_change, phone_change,
    raw_app_meta_data, raw_user_meta_data, confirmed_at
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    '123456@flavorpoints.local',
    crypt('cust123', gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', '',
    '{}'::jsonb, '{}'::jsonb, NOW()
  )
  RETURNING id INTO v_id;

  INSERT INTO auth.identities (
    id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id::text, 'email', v_id,
    jsonb_build_object('sub', v_id::text, 'email', '123456@flavorpoints.local', 'phone', ''),
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.customers (id, phone, email, name, points, total_visits, role)
  VALUES (v_id, '123456', '123456@flavorpoints.local', 'John Doe', 500, 3, 'customer');
END $$;

-- 4. Customer 2 (phone: 654321)
DO $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, confirmation_token, email_change, phone_change,
    raw_app_meta_data, raw_user_meta_data, confirmed_at
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    '654321@flavorpoints.local',
    crypt('cust123', gen_salt('bf')),
    NOW(), NOW(), NOW(), '', '', '',
    '{}'::jsonb, '{}'::jsonb, NOW()
  )
  RETURNING id INTO v_id;

  INSERT INTO auth.identities (
    id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id::text, 'email', v_id,
    jsonb_build_object('sub', v_id::text, 'email', '654321@flavorpoints.local', 'phone', ''),
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.customers (id, phone, email, name, points, total_visits, role)
  VALUES (v_id, '654321', '654321@flavorpoints.local', 'Jane Smith', 320, 5, 'customer');
END $$;

-- Create missions for customers
INSERT INTO public.missions (customer_id, type, title, target, progress, points)
SELECT id, 'visit_5', 'Visit 5 Times', 5, 3, 200
FROM auth.users WHERE email = '123456@flavorpoints.local';

INSERT INTO public.missions (customer_id, type, title, target, progress, points)
SELECT id, 'visit_10', 'Visit 10 Times', 10, 3, 500
FROM auth.users WHERE email = '123456@flavorpoints.local';

INSERT INTO public.missions (customer_id, type, title, target, progress, points)
SELECT id, 'spend_200', 'Spend $200 Total', 200, 75, 300
FROM auth.users WHERE email = '123456@flavorpoints.local';

INSERT INTO public.missions (customer_id, type, title, target, progress, points)
SELECT id, 'visit_5', 'Visit 5 Times', 5, 5, 0
FROM auth.users WHERE email = '654321@flavorpoints.local';

INSERT INTO public.missions (customer_id, type, title, target, progress, points)
SELECT id, 'visit_10', 'Visit 10 Times', 10, 5, 500
FROM auth.users WHERE email = '654321@flavorpoints.local';

INSERT INTO public.missions (customer_id, type, title, target, progress, points)
SELECT id, 'spend_200', 'Spend $200 Total', 200, 120, 300
FROM auth.users WHERE email = '654321@flavorpoints.local';

-- Mark visit_5 as completed for Jane
UPDATE public.missions SET completed = true
WHERE type = 'visit_5' AND customer_id = (
  SELECT id FROM auth.users WHERE email = '654321@flavorpoints.local'
);

-- Create sample visits
INSERT INTO public.visits (customer_id, invoice_amount, points_earned, created_by)
SELECT id, 25.99, 25, (SELECT id FROM auth.users WHERE email = '111111@flavorpoints.local')
FROM auth.users WHERE email = '123456@flavorpoints.local';

INSERT INTO public.visits (customer_id, invoice_amount, points_earned, created_by)
SELECT id, 18.50, 18, (SELECT id FROM auth.users WHERE email = '111111@flavorpoints.local')
FROM auth.users WHERE email = '123456@flavorpoints.local';

INSERT INTO public.visits (customer_id, invoice_amount, points_earned, created_by)
SELECT id, 32.00, 32, (SELECT id FROM auth.users WHERE email = '111111@flavorpoints.local')
FROM auth.users WHERE email = '123456@flavorpoints.local';

INSERT INTO public.visits (customer_id, invoice_amount, points_earned, created_by)
SELECT id, 45.00, 45, (SELECT id FROM auth.users WHERE email = '111111@flavorpoints.local')
FROM auth.users WHERE email = '654321@flavorpoints.local';

INSERT INTO public.visits (customer_id, invoice_amount, points_earned, created_by)
SELECT id, 15.00, 15, (SELECT id FROM auth.users WHERE email = '111111@flavorpoints.local')
FROM auth.users WHERE email = '654321@flavorpoints.local';
