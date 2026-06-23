-- =============================================
-- FIX: "Database error querying schema" on login
-- =============================================
-- CAUSE:
--   Users created via raw INSERT INTO auth.users are missing a
--   matching row in auth.identities. Modern Supabase (GoTrue)
--   requires this row — without it, the login query fails with
--   HTTP 500 "Database error querying schema".
--
-- WHAT THIS DOES:
--   For every auth.users row that has NO matching auth.identities
--   row, this script creates one (provider = 'email'). After
--   running this, the affected users can log in normally.
--
-- HOW TO USE:
--   Supabase Dashboard → SQL Editor → New query → paste → RUN.
--   Safe to re-run (skips users that already have an identity).
-- =============================================

INSERT INTO auth.identities (
  id,
  provider,
  user_id,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.id::text,                                           -- id  (identity id = user uuid as text)
  'email',                                              -- provider
  u.id,                                                 -- user_id
  jsonb_build_object(
    'sub',   u.id::text,
    'email', u.email,
    'phone', ''
  ),                                                    -- identity_data
  u.created_at,                                         -- last_sign_in_at
  u.created_at,                                         -- created_at
  u.updated_at                                          -- updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- =============================================
-- VERIFY: how many identities now exist?
-- (should match your number of auth.users)
-- =============================================
SELECT
  (SELECT count(*) FROM auth.users)     AS users_count,
  (SELECT count(*) FROM auth.identities) AS identities_count;
