/**
 * Recovery flow cooldown constants — the documented client-side
 * cooldown windows for the forgot-password flow.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.B4.
 *
 * ## Why these constants live in their own file
 *
 * Epic 2.3's forgot-password flow mirrors the backend's
 * `@Throttle({ default: AUTH_THROTTLE.forgotPassword })` window with
 * a 60-second client-side cooldown. The reset-password flow has no
 * client-side cooldown because the backend inherits the global
 * default and a successful reset navigates the user away.
 *
 * These constants are the single source of truth for the cooldown
 * windows. They are consumed by:
 *   - `useForgotPassword.start()` (TKT-2.3.C3) — sets the
 *     `cooldownMs` field on the helper's result;
 *   - the C4 page (forgot) — renders the countdown copy via
 *     `resolveCooldown(remainingSeconds)` from `recovery-copy.ts`;
 *   - the D3 unit suite — verifies the constants match the
 *     backend's throttle config.
 *
 * ## Why no `RESET_PASSWORD_COOLDOWN_MS` runtime usage
 *
 * The constant `RESET_PASSWORD_COOLDOWN_MS = 0` is exported for
 * documentation / symmetry. The C5 hook does NOT consume it
 * (the reset-success path navigates the user away; there is no
 * countdown to render). The constant is the single place to read
 * the documented decision: "no client cooldown for reset".
 *
 * ## Pure-function contract
 *
 * No `Date.now`, `Math.random`, or network. The vitest suite in
 * TKT-2.3.D3 exercises the constants.
 */

/**
 * Forgot-password cooldown. Mirrors the backend's
 * `AUTH_THROTTLE.forgotPassword = { limit: 3, ttl: 60_000 }`. The
 * 60-second window is the union of:
 *   - the documented throttle window (3 requests / 60 s);
 *   - the user-facing UX heuristic (the countdown is the only
 *     piece of feedback the user sees after a successful submit).
 *
 * Source: `quiz_backend/src/core/config/auth-throttle.config.ts`.
 */
export const FORGOT_PASSWORD_COOLDOWN_MS = 60_000 as const;

/**
 * Reset-password cooldown. The backend has no `@Throttle()` decorator
 * on `/auth/reset-password` (`auth.controller.ts` line ~150 confirms
 * the absence); the endpoint inherits the global default. A successful
 * reset navigates the user to `/login`; there is no UX reason to
 * enforce a client-side cooldown.
 *
 * The constant is exported as `0` to make the documented decision
 * explicit at the type level. Any future ticket that adds a
 * client-side cooldown for reset (e.g. to mirror a backend change
 * that adds `@Throttle({ default: AUTH_THROTTLE.resetPassword })`)
 * updates this single value.
 */
export const RESET_PASSWORD_COOLDOWN_MS = 0 as const;
