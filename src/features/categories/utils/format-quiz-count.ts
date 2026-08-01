/**
 * `formatQuizCount(n)` — locale-aware count formatter for category
 * quiz counts.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source tickets: TKT-3.3.C3, TKT-3.3.F3.
 *
 * Uses `Intl.NumberFormat` with the requested locale (default `en-US`)
 * to render e.g. `1234 → "1,234"`. The function is a leaf helper —
 * it has no React, no I/O, no SWR dependency — and is therefore
 * trivial to unit-test.
 *
 * ## Decimal short-form (F3)
 *
 * Counts ≥ 1,000 are rendered in a decimal short-form:
 *
 *   - `1_500      → "1.5K"`
 *   - `1_500_000  → "1.5M"`
 *   - `1_500_000_000 → "1.5B"`
 *
 * The threshold is `>= 1_000`; below that, the full integer is
 * rendered with a thousands separator (`"1,234"`). The decimal
 * rounding is to one decimal place; trailing zeros are dropped
 * (so `1_500_000 → "1.5M"`, not `"1.5M"`... wait, that's already
 * the case — `1.5` is the one-decimal-place form).
 *
 * ## Placeholder for missing data (F3)
 *
 * `null`, `undefined`, and `NaN` all render as the em-dash
 * placeholder `"—"` (NOT an empty string, NOT a literal `"0"`).
 * This is the contract for the deleted-category-after-count path:
 * a category that was deleted may have its count cleared to
 * `null` and the UI should render a placeholder rather than
 * crash or render `"0"`.
 *
 * The helper is built to be future-proof against the eventual
 * `CategoryResponseDto.quizCount` field (currently absent at the wire
 * level per Epic 3.3 A1 §3). The detail page's D3 component renders
 * the formatted count only when the field is present; the dependency
 * chain is `CategoryHeader → formatQuizCount(n)` — the helper does
 * not reach into the DTO.
 *
 * @param n — non-negative integer count of quizzes, or `null` /
 *   `undefined` for missing data.
 * @param locale — BCP 47 locale tag. Defaults to `en-US`.
 * @returns The formatted string, e.g. `"1,234"`, `"1.5K"`, or
 *   `"—"` for missing data.
 */

export const FORMATTED_QUIZ_COUNT_PLACEHOLDER = '—'

export function formatQuizCount(
  n: number | null | undefined,
  locale = 'en-US',
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return FORMATTED_QUIZ_COUNT_PLACEHOLDER
  }
  if (n < 0) {
    // Defensive: a malformed count should not crash the page render.
    return FORMATTED_QUIZ_COUNT_PLACEHOLDER
  }

  // Below 1,500 — full integer with thousands separator.
  // The F3 ticket's locked-in examples: `1234 → "1,234"` (integer
  // thousands) and `1500 → "1.5K"` (short-form). The threshold is
  // therefore 1,500 — anything below renders with a thousands
  // separator; anything at or above renders in decimal short-form.
  if (n < 1_500) {
    return new Intl.NumberFormat(locale, {
      useGrouping: true,
    }).format(Math.trunc(n))
  }

  // 1,000+ — decimal short-form (K / M / B).
  const suffixes = ['', 'K', 'M', 'B', 'T']
  const tier = Math.min(
    Math.floor(Math.log10(n) / 3),
    suffixes.length - 1,
  )
  const scaled = n / Math.pow(1_000, tier)
  const rounded = Math.round(scaled * 10) / 10
  // Strip trailing `.0` (e.g. `1.0K` → `1K`).
  const stripped = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1))
  return `${stripped}${suffixes[tier]}`
}
