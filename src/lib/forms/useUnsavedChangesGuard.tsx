'use client';

/**
 * `useUnsavedChangesGuard` — the navigation-guard hook for authoring forms.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.C3.
 *
 * ## What this hook owns
 *
 *   - **`beforeunload` listener** — installed when the form is dirty
 *     AND `now - dirtySince > thresholdMs` (default 5_000). The browser
 *     shows its native "Changes you made may not be saved" prompt.
 *   - **`popstate` listener** — installed with the same condition; on
 *     browser back/forward (which fires `popstate`), the hook flips
 *     `pendingPopstate` to `true` and `pendingPathname` to the target
 *     path. The consumer renders a `<ConfirmDialog kind="irreversible-flow">`
 *     bound to those state values.
 *   - **Dirty-since timestamp** — the hook tracks the most recent
 *     `isDirty === false → true` transition. The first 5 s after the
 *     flip are the "no-intercept" window (so a quick typo + nav does
 *     not prompt the user).
 *
 * ## What this hook does NOT own
 *
 *   - **Confirm dialog UI.** The hook exposes `pendingPopstate` +
 *     `pendingPathname`; the consumer renders the
 *     `<ConfirmDialog kind="irreversible-flow" />` with those props.
 *   - **Link interception.** The master plan mentions `next/link`
 *     clicks; the browser's native `beforeunload` covers cross-tab
 *     navigation. In-app `<Link>` clicks are routed through Next.js's
 *     client router which does NOT fire `popstate`; consumers who need
 *     to intercept them must add a `useRouter().events` listener (out
 *     of scope for this ticket).
 *   - **Submit success dismissal.** The form's `useQuizForm.reset()`
 *     flips `isDirty` to `false`, which uninstalls the listener.
 *
 * ## Test isolation seam
 *
 * The hook reads `window`/`document` directly. In jsdom test
 * environments, the global `beforeunload` event is the canonical
 * surface to assert against. For `popstate` interception, the hook
 * dispatches a synthetic `PopStateEvent` and the test asserts on
 * `result.current.pendingPopstate`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface UseUnsavedChangesGuardOptions {
  /** When `true`, the form has unsaved changes. */
  isDirty: boolean;
  /**
   * Window after the most recent `isDirty === false → true` flip during
   * which navigation is NOT intercepted. Default 5_000 (master plan).
   */
  thresholdMs?: number;
}

export interface UseUnsavedChangesGuardReturn {
  /** True when the `beforeunload` + `popstate` listeners are installed. */
  isGuarding: boolean;
  /** True after a `popstate` fires while the guard is active. */
  pendingPopstate: boolean;
  /** Pathname captured when the most recent `popstate` was intercepted. */
  pendingPathname: string | null;
  /** Mark the pending popstate as handled (cancel — user chose to stay). */
  cancelPendingPopstate: () => void;
  /** Mark the pending popstate as handled (confirm — user chose to leave). */
  confirmPendingPopstate: () => void;
}

export const DEFAULT_THRESHOLD_MS = 5000;

/**
 * `useUnsavedChangesGuard({ isDirty, thresholdMs? })` —
 * installs the browser's `beforeunload` prompt and intercepts
 * `popstate` events when the form has been dirty for longer than
 * `thresholdMs`.
 */
export function useUnsavedChangesGuard(
  options: UseUnsavedChangesGuardOptions
): UseUnsavedChangesGuardReturn {
  const { isDirty, thresholdMs = DEFAULT_THRESHOLD_MS } = options;

  const pathname = usePathname();
  const router = useRouter();

  // Track the timestamp of the most recent dirty flip. `null` when
  // the form is currently clean.
  const dirtySinceRef = useRef<number | null>(null);
  const lastPathnameRef = useRef<string | null>(pathname ?? null);
  const [isGuarding, setIsGuarding] = useState(false);

  // State for the confirm dialog triggered by `popstate`.
  const [pendingPopstate, setPendingPopstate] = useState(false);
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);

  // Track `isDirty` transitions. On `false → true` we record the
  // timestamp; on `true → false` we reset.
  useEffect(() => {
    if (isDirty && dirtySinceRef.current === null) {
      dirtySinceRef.current = Date.now();
    } else if (!isDirty && dirtySinceRef.current !== null) {
      dirtySinceRef.current = null;
    }
  }, [isDirty]);

  // The guard predicate: `isDirty && (now - dirtySince) > thresholdMs`.
  // The predicate is re-evaluated each render so the elapsed-time
  // check naturally fires once the threshold is crossed.
  const guardPredicate =
    isDirty &&
    dirtySinceRef.current !== null &&
    Date.now() - dirtySinceRef.current > thresholdMs;

  // Mirror the predicate into state so consumers see `isGuarding`
  // and so the listener-installing effect has a stable trigger.
  useEffect(() => {
    setIsGuarding(guardPredicate);
  }, [guardPredicate]);

  const onBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  }, []);

  const onPopState = useCallback(() => {
    if (!isGuarding) return;
    setPendingPopstate(true);
    setPendingPathname(lastPathnameRef.current);
  }, [isGuarding]);

  // Install / remove the listeners whenever the guard predicate
  // changes. The cleanup runs on every render where `isGuarding`
  // flips to false (e.g. after a successful submit).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isGuarding) return;
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isGuarding, onBeforeUnload, onPopState]);

  // Update the pathname ref on every navigation so the cancel button
  // reverts to the most recent path.
  useEffect(() => {
    lastPathnameRef.current = pathname ?? null;
  }, [pathname]);

  const cancelPendingPopstate = useCallback(() => {
    // Revert: push the user back to the path they were on.
    if (lastPathnameRef.current !== null) {
      router.push(lastPathnameRef.current);
    }
    setPendingPopstate(false);
    setPendingPathname(null);
  }, [router]);

  const confirmPendingPopstate = useCallback(() => {
    // The popstate already happened; the user chose to leave.
    setPendingPopstate(false);
    setPendingPathname(null);
  }, []);

  return {
    isGuarding,
    pendingPopstate,
    pendingPathname,
    cancelPendingPopstate,
    confirmPendingPopstate,
  };
}