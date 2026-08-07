"use client";

/**
 * `useDebouncedValue` — re-export from the canonical location.
 *
 * Source epic:   TKT-7.5 cleanup audit, Phase 8 / P1-16.
 *
 * The canonical implementation is now
 * `@/lib/utils/use-debounced-value` (P1-16 consolidation). This
 * module re-exports the hook so existing consumers in the social
 * discovery surface continue to import the same path.
 *
 * @see lib/utils/use-debounced-value.ts — the canonical implementation.
 */

export {
  useDebouncedValue,
  type UseDebouncedValueResult,
} from "@/lib/utils/use-debounced-value";
