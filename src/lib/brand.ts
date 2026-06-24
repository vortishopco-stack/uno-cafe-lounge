/**
 * ============================================================================
 *  BRAND CONFIG — EDIT THIS ONE FILE TO REBRAND THE ENTIRE APP
 * ============================================================================
 *
 *  To customize this app for a new restaurant, change the values below.
 *  Everything else (colors, logo, menu, rewards) is documented in
 *  CUSTOMIZE.md.
 *
 *  After editing, rebuild:  npm run build   (or:  bun run build)
 * ============================================================================
 */

export const BRAND = {
  /** Public-facing restaurant name (English) */
  name: "Uno Cafe' Lounge",

  /** Public-facing restaurant name (Arabic) — used in RTL mode */
  nameAr: "أونو كافيه لاونج",

  /** Short marketing tagline (English) */
  tagline: 'Earn. Play. Reward.',

  /** Short marketing tagline (Arabic) */
  taglineAr: 'اكسب. العب. استبدل.',

  /** SEO meta description (shown in search results / browser tab) */
  description:
    "Earn points, play games, and unlock amazing rewards at Uno Cafe' Lounge. Your favorite coffee lounge loyalty program.",

  /**
   * Internal fake email domain used for phone-based auth.
   * Supabase Auth requires an email, but this app logs in by phone number,
   * so we synthesize `{phone}@{emailDomain}` under the hood.
   *
   * Users never see this. DO NOT change it after going live — existing
   * customer accounts are keyed to this domain. For a brand-new deployment
   * you can set it to anything, e.g. `yourrestaurant.local`.
   */
  emailDomain: 'flavorpoints.local',

  /** Supabase Storage bucket name for menu item images (must match schema.sql) */
  storageBucket: 'menu-images',
} as const;

/** The synthesized auth email for a phone number (internal use) */
export function phoneToEmail(phone: string): string {
  return `${phone}@${BRAND.emailDomain}`;
}
