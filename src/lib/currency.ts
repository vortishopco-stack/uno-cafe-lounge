/**
 * Currency formatting helper.
 *
 * The app uses a single currency throughout (configured here as JOD —
 * Jordanian Dinar). All price displays go through `formatCurrency` so
 * the symbol and label stay consistent across the customer menu,
 * employee visit form, admin dashboard, and history view.
 *
 * Arabic locale uses the Arabic currency code "د.أ" (postfix, RTL-
 * friendly). English locale uses the ISO code "JOD" (prefix).
 *
 * To switch the app to a different currency, only this file needs to
 * change — the symbol, code, and decimal places are all centralized here.
 */

import type { Locale } from '@/lib/i18n'

/** ISO 4217 currency code. */
export const CURRENCY_CODE = 'JOD'

/** Symbol shown before/after the amount. English uses the ISO code,
 *  Arabic uses the Arabic abbreviation. */
export const CURRENCY_SYMBOL_EN = 'JOD'
export const CURRENCY_SYMBOL_AR = 'د.أ'

/** Number of decimal places to display. JOD uses 3 decimals (fils),
 *  but for menu prices we keep 2 for consistency with how prices are
 *  typically displayed in restaurants. Override here if needed. */
export const CURRENCY_DECIMALS = 2

/**
 * Format a numeric amount as a localized currency string.
 *
 * - English locale: `"JOD 12.99"` (prefix with space)
 * - Arabic locale:  `"12.99 د.أ"` (postfix with space, RTL-friendly)
 *
 * Falls back to `0.00` for null/undefined/NaN inputs so the UI never
 * shows "NaN" or "undefined" to the customer.
 *
 * @example
 *   formatCurrency(12.99, 'en') // → "JOD 12.99"
 *   formatCurrency(12.99, 'ar') // → "12.99 د.أ"
 *   formatCurrency(0, 'en')     // → "JOD 0.00"
 *   formatCurrency(null, 'ar')  // → "0.00 د.أ"
 */
export function formatCurrency(amount: number | null | undefined, locale: Locale): string {
  const safeAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0
  const formatted = safeAmount.toFixed(CURRENCY_DECIMALS)
  if (locale === 'ar') {
    return `${formatted} ${CURRENCY_SYMBOL_AR}`
  }
  return `${CURRENCY_SYMBOL_EN} ${formatted}`
}

/**
 * Format a numeric amount using only the symbol (no locale awareness).
 * Useful for places where the surrounding text already establishes the
 * language, e.g. inside an English-only admin table.
 *
 * @example
 *   formatCurrencyDefault(12.99) // → "JOD 12.99"
 */
export function formatCurrencyDefault(amount: number | null | undefined): string {
  const safeAmount = typeof amount === 'number' && isFinite(amount) ? amount : 0
  return `${CURRENCY_SYMBOL_EN} ${safeAmount.toFixed(CURRENCY_DECIMALS)}`
}
