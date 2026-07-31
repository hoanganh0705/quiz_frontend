/**
 * Deletion-aware persisted-state cleanup.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T11.
 *
 * ## Purpose
 *
 * The deletion finalization coordinator (2.10.T14) must wipe
 * account-scoped persisted state before the public landing route
 * renders, so:
 *
 *   - the persisted Zustand `user_store_v1` entry cannot repopulate
 *     a `useUser()` selector on the next render,
 *   - the persisted `user_settings` entry from `settings/page.tsx`
 *     (a per-account, in-browser prefs blob) is removed,
 *   - any cross-feature persisted entry that the deletion policy
 *     classifies as account-scoped (NOT global) is removed.
 *
 * Global preferences (theme, locale, etc. that are NOT tied to the
 * deleted account) are preserved — the deletion policy applies to
 * account data only, not to device-level UX choices.
 *
 * ## Form-state discipline
 *
 * The companion `clearSensitiveDeletionFormValues()` helper gives
 * the modal component a single seam to clear the password and
 * typed-confirmation React-state slots. The helper accepts a plain
 * object with `setPassword` and `setTypedConfirmation` setters and
 * calls them with empty strings. The helper is the SOLE place this
 * discipline lives so the modal does not duplicate it (and so a
 * future field added to the modal cannot accidentally leak).
 *
 * ## No secret persistence
 *
 * The helper never writes the password or typed confirmation to
 * `localStorage`, `sessionStorage`, `URL`, logs, or analytics. The
 * form-state discipline is in-memory only — React state and React
 * state alone.
 */

/**
 * Persistent state keys the deletion policy requires cleared.
 *
 * Exported as a frozen list so the cache cleanup (2.10.T10) and
 * the persisted-state cleanup (this file) reference the same
 * source of truth.
 *
 * Add new account-scoped keys here. DO NOT add device-level
 * preferences (theme, locale, etc.) — the deletion policy does
 * NOT apply to those.
 */
export const AUTH_PERSISTENT_KEYS: ReadonlyArray<string> = Object.freeze([
  // Persisted Zustand user store (Epic 2.5).
  'user_store_v1',
  // Settings page persisted entry (settings/page.tsx).
  'user_settings',
]);

/**
 * Remove the persisted Zustand `user_store_v1` entry from
 * localStorage. The `persist` middleware writes the entry under the
 * `name` configured in `users/store/user-store.ts`; we hard-code the
 * literal here to avoid importing the store module just to read a
 * string. (`name` is the persistent key — `user_store_v1`.)
 *
 * The in-memory store reset is the responsibility of the caller
 * (see `clearAllDeletionCaches` step 5). This function focuses
 * solely on the localStorage wipe so the report can attribute the
 * two concerns separately.
 *
 * @returns `true` when the localStorage removal ran without
 *          throwing; `false` otherwise (e.g. SSR, storage disabled).
 *          Used by the report in `clearAllDeletionCaches`.
 */
export function clearPersistedUserStore(): boolean {
  if (typeof localStorage === 'undefined') return false;

  try {
    if (localStorage.getItem('user_store_v1') !== null) {
      localStorage.removeItem('user_store_v1');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear every account-scoped persistent key. Returns the keys
 * actually removed (useful for tests and the cleanup report).
 *
 * Device-level preferences (theme, locale, etc.) are NOT touched.
 */
export function clearDeletionPersistedAccountState(): ReadonlyArray<string> {
  if (typeof localStorage === 'undefined') return [];

  const removed: string[] = [];
  try {
    for (const key of AUTH_PERSISTENT_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed.push(key);
      }
    }
  } catch {
    // Storage unavailable — return what we have so far
  }
  return removed;
}

/**
 * Shape of the setters the modal must wire to clear sensitive
 * form values. The modal instantiates these via `useState`
 * (`password`, `typedConfirmation`) and passes the setters to the
 * hook so the cleanup helper can empty them deterministically.
 *
 * Both fields accept `string` and `((prev: string) => string)`.
 * The helper invokes them with the empty string.
 */
export interface DeletionFormSetters {
  setPassword: (value: string) => void;
  setTypedConfirmation: (value: string) => void;
}

/**
 * Empty every sensitive form value the deletion modal owns.
 *
 * Called from:
 *
 *   - the modal's `useEffect` cleanup (`on unmount`),
 *   - the modal's `Cancel` button handler,
 *   - the modal's `Escape` key handler,
 *   - the hook's `reset()`,
 *   - the hook's error transition (after `invalid_current` or
 *     `validation`),
 *   - the hook's terminal transitions (after `uncertain`,
 *     `cleanup`, `completed`).
 *
 * The helper does NOT call any persistence API. The values live in
 * React state and clearing them is a React-state update.
 *
 * The function is intentionally permissive: if the modal does not
 * yet own `setTypedConfirmation` (a future UX simplification might
 * drop the typed confirmation), the helper no-ops that setter. The
 * modal is responsible for wiring whichever setters exist.
 */
export function clearSensitiveDeletionFormValues(
  setters: Partial<DeletionFormSetters>,
): void {
  if (setters.setPassword) {
    try {
      setters.setPassword('');
    } catch {
      // Defensive — the setter may not be ready yet
    }
  }
  if (setters.setTypedConfirmation) {
    try {
      setters.setTypedConfirmation('');
    } catch {
      // Defensive — the setter may not be ready yet
    }
  }
}

/**
 * For tests: snapshot of `AUTH_PERSISTENT_KEYS`. Production code
 * imports the constant directly.
 */
export function _internalAuthPersistentKeysForTest(): ReadonlyArray<string> {
  return AUTH_PERSISTENT_KEYS;
}
