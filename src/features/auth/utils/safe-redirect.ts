/**
 * Safe redirect target validator.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.B6.
 *
 * ## What this file does
 *
 * The login page accepts a `?redirect=<path>` query param to send the
 * user back to their intended destination after a successful login.
 * Attackers can craft hostile values (open redirect, domain hijacking,
 * etc.). This helper validates that the value is safe before passing
 * it to `router.replace()`.
 *
 * ## Safe targets
 *
 *   - Any path starting with `/` that does NOT start with `/login`
 *     (e.g. `/quizzes`, `/my-profile`, `/settings?tab=security`).
 *   - A path with a fragment identifier (e.g. `/quizzes#section`).
 *
 * ## Hostile targets
 *
 *   - Protocol-relative (`//evil.com`).
 *   - Absolute URLs (`https://evil.com/foo`).
 *   - The login page itself (`/login`, `/login?redirect=...`).
 *   - Null bytes or other injection chars (`/foo%00bar`).
 *   - Empty string, `null`, `undefined`.
 *   - Paths longer than 2048 chars (DoS vector).
 *
 * ## Pure function
 *
 * No network, no `Date.now`, no `Math.random`. Deterministic output
 * for any input.
 */

const MAX_PATH_LENGTH = 2048;

const LOGIN_PATH_PREFIXES: ReadonlyArray<string> = ["/login"];

/**
 * Returns `true` when `target` is a safe post-login redirect.
 *
 * Call this before passing any `redirect` param to `router.replace()`.
 * When the target is hostile, return `false` and let the caller fall
 * back to the default (`/quizzes`).
 */
export function isSafeRedirectTarget(target: unknown): boolean {
  // Reject falsy
  if (!target) return false;

  // Must be a string
  if (typeof target !== "string") return false;

  // Reject empty
  if (target.length === 0) return false;

  // Reject over-length (DoS vector)
  if (target.length > MAX_PATH_LENGTH) return false;

  // Reject protocol-relative (e.g. "//evil.com")
  if (target.startsWith("//")) return false;

  // Reject absolute URLs (e.g. "https://evil.com/foo")
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) return false;

  // Reject null bytes and other control chars
  if (/[\x00-\x1f\x7f]/.test(target)) return false;

  // Reject login-page redirects
  if (LOGIN_PATH_PREFIXES.some((prefix) => target.startsWith(prefix))) {
    return false;
  }

  // Must start with /
  if (!target.startsWith("/")) return false;

  return true;
}

/**
 * Returns the validated redirect target, or `/quizzes` as the fallback.
 *
 * Usage:
 *   const dest = safeRedirectTarget(searchParams.get('redirect'));
 *   router.replace(dest);
 */
export function safeRedirectTarget(raw: string | null | undefined): string {
  if (isSafeRedirectTarget(raw)) {
    return raw;
  }
  return "/quizzes";
}
