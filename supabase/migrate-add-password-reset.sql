-- =============================================================
-- Migration: Add password reset support
-- =============================================================
-- Adds a SECURITY DEFINER function that safely looks up a customer's
-- auth email by phone number. This is needed because:
--   1. RLS blocks unauthenticated users from reading the customers
--      table, so the client can't look up the email before login.
--   2. New signups now use the REAL email as the Supabase Auth email
--      (instead of the synthesized {phone}@{domain}), so login needs
--      to discover which email to use for a given phone.
--   3. The "Forgot Password" flow needs to resolve an email from
--      either a phone or email input.
--
-- The function only returns the email — no other profile data — so
-- exposing it publicly is safe (knowing an email doesn't help an
-- attacker without the password).
--
-- Safe to re-run (uses CREATE OR REPLACE).
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_auth_email_by_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.customers WHERE phone = p_phone LIMIT 1;
$$;

-- Grant execute to everyone (anon + authenticated). The function only
-- returns an email address, which is safe to expose.
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_phone(TEXT) TO anon, authenticated;

-- Done. The app now:
--   1. Looks up the auth email by phone before login (works for both
--      old synthesized-email accounts and new real-email accounts).
--   2. Uses Supabase's native resetPasswordForEmail() to send a
--      password reset link to the user's real email.
--   3. Detects the PASSWORD_RECOVERY event when the user clicks the
--      link and shows a "Set New Password" form.
