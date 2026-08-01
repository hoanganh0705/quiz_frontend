/**
 * `formatTagDate(d)` — locale-aware date formatter for the
 * tag detail page header.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source tickets: TKT-3.4.C5 (vendor helper).
 *
 * Uses `Intl.DateTimeFormat` with the requested locale (default
 * `en-US`) to render e.g.:
 *   - `"2025-12-01T00:00:00Z"` → `"Dec 1, 2025"`
 *
 * The function is a leaf helper — no React, no I/O, no SWR —
 * trivial to unit-test. A null / undefined / unparseable input
 * returns the placeholder string `"—"` so the header never renders
 * a bare "Invalid Date" surface.
 *
 * The helper mirrors the F3 contract used by `formatQuizCount` in
 * the categories feature (`src/features/categories/utils/format-quiz-count.ts`).
 */

export const FORMATTED_TAG_DATE_PLACEHOLDER = '—'

export function formatTagDate(
  d: string | null | undefined,
  locale = 'en-US',
): string {
  if (!d || typeof d !== 'string') {
    return FORMATTED_TAG_DATE_PLACEHOLDER
  }
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) {
    return FORMATTED_TAG_DATE_PLACEHOLDER
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}
