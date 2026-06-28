/**
 * Bilingual helpers for menu items and menu categories.
 *
 * The Supabase schema stores localized strings in pairs:
 *   - name_en / name_ar
 *   - description_en / description_ar
 *
 * For backward compatibility the legacy `name` / `description` /
 * `display_name` columns are kept in sync by the API layer and are
 * used as a final fallback when neither localized value is set.
 *
 * Fallback rules (per requirements):
 *   1. If the requested locale's value is missing → use the OTHER locale's value.
 *   2. If both localized values are missing → use the legacy English column.
 *   3. Never return an empty string to the customer (final fallback to ''.
 *      would still be safe because callers guard against blank text, but
 *      the API layer guarantees a non-empty legacy column).
 */

import type { Locale } from '@/lib/i18n'

/** A row that may carry any of the bilingual / legacy name fields. */
export interface BilingualNameRow {
  name?: string | null
  name_en?: string | null
  name_ar?: string | null
  display_name?: string | null
}

/** A row that may carry any of the bilingual / legacy description fields. */
export interface BilingualDescriptionRow {
  description?: string | null
  description_en?: string | null
  description_ar?: string | null
}

function pickNonEmpty(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    if (v !== null && v !== undefined) {
      const trimmed = String(v).trim()
      if (trimmed.length > 0) return trimmed
    }
  }
  return ''
}

/**
 * Pick the localized name for a row.
 * Order: requested locale → other locale → display_name → legacy name.
 */
export function localizedName(
  row: BilingualNameRow,
  locale: Locale,
  opts: { preferDisplayName?: boolean } = {}
): string {
  const en = row.name_en
  const ar = row.name_ar
  if (locale === 'ar') {
    return pickNonEmpty(ar, en, opts.preferDisplayName ? row.display_name : null, row.name)
  }
  return pickNonEmpty(en, ar, opts.preferDisplayName ? row.display_name : null, row.name)
}

/**
 * Pick the localized description for a row.
 * Order: requested locale → other locale → legacy description.
 */
export function localizedDescription(
  row: BilingualDescriptionRow,
  locale: Locale
): string {
  const en = row.description_en
  const ar = row.description_ar
  if (locale === 'ar') {
    return pickNonEmpty(ar, en, row.description)
  }
  return pickNonEmpty(en, ar, row.description)
}

/**
 * Returns true if the given localized value would render as the requested
 * locale's text (i.e. the requested locale value is non-empty). Useful for
 * tests / debugging.
 */
export function hasLocaleValue(
  row: BilingualNameRow & BilingualDescriptionRow,
  locale: Locale,
  field: 'name' | 'description'
): boolean {
  if (field === 'name') {
    return !!pickNonEmpty(locale === 'ar' ? row.name_ar : row.name_en)
  }
  return !!pickNonEmpty(locale === 'ar' ? row.description_ar : row.description_en)
}

/**
 * Bilingual search: returns true if the query (case-insensitive) matches
 * ANY of the localized name/description fields. Works for both English and
 * Arabic queries, so searching "burger" or "برغر" returns the same item.
 */
export function matchesBilingualQuery(
  row: BilingualNameRow & BilingualDescriptionRow,
  query: string
): boolean {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  const haystack = [
    row.name,
    row.name_en,
    row.name_ar,
    row.display_name,
    row.description,
    row.description_en,
    row.description_ar,
  ]
  return haystack.some(v => {
    if (v === null || v === undefined) return false
    return String(v).toLowerCase().includes(q)
  })
}
