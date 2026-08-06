/**
 * `discovery-discriminator.ts` — Cross-batch invariants for the
 * `SocialSearchSuggestionDto` type discriminator.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.A4.
 *
 * ## Purpose
 *
 * Single source of truth for the search-suggestion type discriminator
 * the `SocialSearchGroup` type-discriminated group renderer
 * (TKT-6.5.F4) and the `discovery.service.ts` (TKT-6.5.C1) share.
 * Importing this module is the canonical way to assert compliance
 * without sprinkling magic strings across the surface.
 *
 * ## What this file owns
 *
 *   1. **Closed union (`SocialSearchSuggestionKind`).** The set of
 *      documented search-suggestion kind values. The discriminator is
 *      the single source of truth for the group renderer — adding a
 *      new kind is a TypeScript error until this union is updated.
 *      `string` is explicitly excluded from the union so an unknown
 *      backend kind is observable at runtime via `isSocialSearchSuggestionKind`
 *      rather than silently coerced.
 *
 *   2. **Type guard (`isSocialSearchSuggestionKind`).** The narrowing
 *      helper. Returns `true` for every documented kind and `false`
 *      for `null`, `undefined`, numeric values, objects, and arbitrary
 *      strings (including the documented typos the backend has shipped
 *      in the past).
 *
 *   3. **Defensive fallback test id (`DEFENSIVE_FALLBACK_TESTID`).**
 *      The `data-testid` the group renderer emits for unknown kinds.
 *      The constant is exported so the cross-batch validation checklist
 *      (the `epic-done` grep) can pin the identifier without
 *      copy-pasting the literal across the component and the spec.
 *
 *   4. **Frozen catalogue.** `DISCOVERY_DISCRIMINATOR_INVARIANTS`
 *      exposes every constant as a single object.
 *
 * ## What this file does NOT own
 *
 *   - The `SocialSearchGroup` component — that lives in
 *     `features/social/discovery/SocialSearchGroup.tsx` (TKT-6.5.F4)
 *     and consumes the constants from here.
 *   - The `discovery.service.ts` wrapper — that lives in
 *     `features/social/services/discovery.service.ts` (TKT-6.5.C1)
 *     and uses `isSocialSearchSuggestionKind` to route unknown
 *     discriminator values.
 *
 * ## SSR-safety
 *
 * The module declares types and frozen constants only. It is safe to
 * import from Server Components and from the App Router's route modules.
 */

// ─── Discriminator type ─────────────────────────────────────────────────────

/**
 * The closed union of search-suggestion kind discriminators the
 * frontend recognises.
 *
 * The exact list is the documented `SocialSearchSuggestionDto.kind`
 * union declared by the regenerated social SDK (Epic 6.1 / TKT-6.1.A1).
 * The list is locked here so the `SocialSearchGroup` switch
 * (TKT-6.5.F4) and the `discovery-discriminator` group router are
 * guaranteed to remain in sync.
 *
 * `string` is intentionally excluded: an unknown backend discriminator
 * is observable at runtime via `isSocialSearchSuggestionKind` and renders
 * the documented defensive fallback (never an unhandled `case` crash).
 */
export type SocialSearchSuggestionKind =
  | "user"
  | "quiz"
  | "tag"
  | "group"
  | "unsupported";

// ─── Type guard ─────────────────────────────────────────────────────────────

/**
 * Type-guard: returns `true` when the input is a documented
 * `SocialSearchSuggestionKind`, `false` otherwise.
 *
 * Used by the `discovery.service.ts` (TKT-6.5.C1) to route unknown
 * discriminator values to the `unsupported` kind group, and by the
 * `SocialSearchGroup` component (TKT-6.5.F4) to gate the switch on
 * a typed value. The guard is the only public coercion surface — no
 * other helper is permitted to narrow a raw backend discriminator
 * to `SocialSearchSuggestionKind`.
 *
 * The guard is defensive-by-default: it returns `false` for `null`,
 * `undefined`, numeric values, objects, and arbitrary strings. The
 * defensive fallback renders the documented `data-testid` for
 * unknown values so QA can surface them.
 *
 * @example
 *   isSocialSearchSuggestionKind("user")     // true
 *   isSocialSearchSuggestionKind("quiz")     // true
 *   isSocialSearchSuggestionKind("garbage")  // false
 *   isSocialSearchSuggestionKind(null)       // false
 *   isSocialSearchSuggestionKind(123)         // false
 */
export function isSocialSearchSuggestionKind(
  value: unknown,
): value is SocialSearchSuggestionKind {
  return (
    typeof value === "string" &&
    (DOCUMENTED_KINDS as readonly string[]).includes(value)
  );
}

/** The documented kind values as a readonly array. */
const DOCUMENTED_KINDS = [
  "user",
  "quiz",
  "tag",
  "group",
  "unsupported",
] as const satisfies readonly SocialSearchSuggestionKind[];

// ─── Defensive fallback test id ──────────────────────────────────────────────

/**
 * The `data-testid` the group renderer emits for unknown
 * discriminator kinds.
 *
 * The constant is exported so the cross-batch validation checklist
 * can grep for the identifier without copy-pasting the literal
 * across the component and the spec. The string is documented as
 * the only canonical id for the "unknown discriminator" surface.
 */
export const DEFENSIVE_FALLBACK_TESTID =
  "social-search-unsupported-kind" as const;

// ─── Frozen catalogue ─────────────────────────────────────────────────────────

/**
 * Read-only record exposing every constant in this module.
 */
export const DISCOVERY_DISCRIMINATOR_INVARIANTS = Object.freeze({
  documentedKinds: DOCUMENTED_KINDS,
  defensiveFallbackTestId: DEFENSIVE_FALLBACK_TESTID,
});
