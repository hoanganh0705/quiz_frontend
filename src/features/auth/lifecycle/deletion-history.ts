/**
 * Account-deletion history-replacement helper.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T20.
 *
 * ## Purpose
 *
 * After a successful deletion, the protected settings route should
 * not remain as the immediately-navigable history entry. If the
 * user hits the browser back button, they would otherwise land on
 * `/settings` again with a stale rendered view (and a now-invalid
 * auth-token cookie).
 *
 * The helper produces a `replaceHistory()` thunk the
 * deletion-coordinator (T14) invokes AFTER auth markers and caches
 * are cleared but BEFORE navigation completes. The thunk uses
 * `history.replaceState` to overwrite the current history entry in
 * place with the public landing route, then the parent page
 * performs the actual `router.replace('/')` so React also moves.
 *
 * ## Why `replaceState` (not `pushState`)
 *
 * `pushState` would leave `/settings` on the stack and add the
 * public landing as a fresh entry — meaning back would still
 * navigate to `/settings`. `replaceState` overwrites the entry in
 * place, so back navigates to whatever was before `/settings`
 * (typically `/` or `/quizzes`), never the deleted-account
 * protected page.
 *
 * ## No-op on SSR
 *
 * `history` is browser-only. The helper short-circuits when called
 * from a server context.
 *
 * ## Failure mode
 *
 * `history.replaceState` is synchronous and historically
 * exception-free in modern browsers; if it throws (e.g. a buggy
 * browser shim), the coordinator's error recorder catches it and
 * the navigation still proceeds because the coordinator swallows
 * step errors.
 */

const PUBLIC_LANDING_PATH = '/';

/**
 * Build a `replaceHistory()` thunk suitable for
 * `runDeletionFinalization({ replaceHistory })`.
 *
 * The thunk overwrites the current history entry with the public
 * landing route so back/forward cannot restore the protected
 * settings page.
 *
 * The thunk is a no-op when `window` or `window.history` is
 * unavailable (SSR, non-browser test environments).
 *
 * @returns A `() => void` thunk that performs the replacement.
 */
export function buildDeletionReplaceHistory(): () => void {
  return () => {
    if (typeof window === 'undefined') return;
    if (typeof window.history === 'undefined') return;
    if (typeof window.history.replaceState !== 'function') return;

    try {
      window.history.replaceState(
        null,
        '',
        PUBLIC_LANDING_PATH,
      );
    } catch {
      // Defensive: a buggy browser shim might throw. The
      // coordinator swallows step errors so navigation can still
      // proceed.
    }
  };
}

/**
 * The public landing path the helper writes into the history
 * entry. Exported so tests and the protected-route guard (T21)
 * can reference the same string instead of duplicating the
 * literal.
 */
export const DELETION_PUBLIC_LANDING_PATH = PUBLIC_LANDING_PATH;
