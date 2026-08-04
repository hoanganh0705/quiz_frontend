/**
 * `deprecated-routes.ts`
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F7.
 *
 * Explicit list of backend routes that Phase 5 features must never call.
 * Adding a route here causes the `phase5-lint-invariants` script (or the
 * broader `phase4:lint-invariants`) to exit non-zero if any Phase 5 feature
 * file references it.
 *
 * Routes are listed as path strings as they appear in SDK client calls
 * (e.g. `/social/friend-request` — the singular form is deprecated; the
 * plural `/social/friend-requests` is the correct one).
 *
 * ## Usage in feature code
 *
 * Feature service wrappers should **never** call any route listed here.
 * The `phase5-lint-invariants` script enforces this automatically.
 *
 * ## Adding a deprecated route
 *
 * Append to the tuple below. Keep entries in alphabetical order.
 */

/**
 * Backend routes that Phase 5 feature files must never call directly.
 *
 * - `/social/friend-request` — deprecated; use `/social/friend-requests` instead.
 */
export const DEPRECATED_ROUTES = [
  "/social/friend-request",
] as const;

export type DeprecatedRoute = (typeof DEPRECATED_ROUTES)[number];
