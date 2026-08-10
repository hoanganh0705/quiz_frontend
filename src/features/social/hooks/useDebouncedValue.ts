'use client'

/**
 * `features/social/hooks/useDebouncedValue.ts`
 *
 * Re-exports the canonical `useDebouncedValue` from
 * `@/lib/utils/use-debounced-value` so social-feature consumers can
 * import the hook from a single, stable path.
 *
 * Source epic:   Epic 6.5 — Social Discovery.
 * Source ticket: TKT-6.5.B1.
 *
 * ## Why a re-export
 *
 * Phase 3 (TKT-3.3.E1) shipped a generic debounce hook at
 * `@/lib/utils/use-debounced-value`. Phase 6 (Story 6.5) introduced
 * a richer discovery-specific surface with `cancel()` and clamped
 * windows. The Phase 8 audit (P1-16) consolidated both
 * implementations into the canonical lib hook — this file is the
 * social-side re-export so existing imports keep working.
 *
 * Production builds enforce module resolution strictly, so this
 * file MUST exist as a resolvable module. Previously the build
 * failed with `Module not found` errors against
 * `@/features/social/hooks/useDebouncedValue`.
 */

export { useDebouncedValue } from '@/lib/utils/use-debounced-value'
export type { UseDebouncedValueResult } from '@/lib/utils/use-debounced-value'