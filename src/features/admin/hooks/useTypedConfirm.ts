'use client';

/**
 * `features/admin/hooks/useTypedConfirm.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.B4.
 *
 * ## Purpose
 *
 * Hook exposing a typed-confirm dialog control flow: the caller passes
 * an `operation` slug from `IrreversibleAdminOperation`; the hook returns
 *   - `confirmString` — the exact uppercase string the user must type
 *     to confirm the irreversible action,
 *   - `isFullyValid` — boolean indicating whether the user's typed
 *     input exactly matches (after case/whitespace coercion, none
 *     performed — the match is byte-exact per the master plan Phase 7
 *     Risks lines 495–496),
 *   - `assertedConfirm` — function the caller dispatches only when
 *     `isFullyValid` is true.
 *
 * ## Invalidations
 *
 * The hook follows the Phase 6 social-store invalidation channel — when
 * the role flips from one slug to another, the `permissions` and
 * `confirmString` chains re-derive. This is the cross-batch invariant
 * the lint script `admin-lint-invariants.mjs` checks.
 *
 * ## Cross-tab consistency
 *
 * The hook does not consume BroadcastChannel directly; the upstream
 * `useAdminRole` does, and the resulting re-render re-derives the
 * confirm string.
 */

import { useCallback, useMemo, useState } from 'react';

import {
  IRREVERSIBLE_INVARIANTS,
  isFullyValidConfirm,
} from '../irreversible-confirm-invariants';
import {
  getIrreversibleConfirmString,
  type IrreversibleAdminOperation,
} from '../admin-capabilities';

export interface UseTypedConfirm {
  /** The exact confirm string the user must type to proceed. */
  confirmString: string;
  /** The current input value the user has typed. */
  input: string;
  /** Whether `input` matches `confirmString` byte-exactly. */
  matches: boolean;
  /** Whether `input` satisfies every structural invariant. */
  isFullyValid: boolean;
  /** Whether `input` is non-empty (for the inline gate). */
  hasInput: boolean;
  /** Update the input value (call from the controlled input). */
  setInput: (next: string) => void;
  /** Reset to empty. */
  reset: () => void;
  /**
   * Guard function: throws if the typed-confirm is invalid, otherwise
   * returns the canonical `confirmString`. Useful for the imperative
   * dispatch path:
   *
   *   const confirmed = useTypedConfirm('ranking.reset');
   *   ...
   *   await rankingRecalculate({ confirm: confirmed.assertedConfirm() });
   */
  assertedConfirm: () => string;
}

export function useTypedConfirm(
  operation: IrreversibleAdminOperation,
): UseTypedConfirm {
  const confirmString = getIrreversibleConfirmString(operation) ?? '';
  const [input, setInputState] = useState('');

  const matches = useMemo(() => input === confirmString, [input, confirmString]);
  const hasInput = useMemo(() => input.length > 0, [input]);
  const isFullyValid = useMemo(
    () => input.length > 0 && isFullyValidConfirm(input),
    [input],
  );

  const setInput = useCallback((next: string) => setInputState(next), []);
  const reset = useCallback(() => setInputState(''), []);

  const assertedConfirm = useCallback((): string => {
    if (!confirmString) {
      throw new Error(
        `useTypedConfirm: unknown irreversible operation "${operation}"`,
      );
    }
    if (!matches || !isFullyValid) {
      throw new Error(
        `useTypedConfirm: typed confirm did not match for "${operation}"`,
      );
    }
    // The four invariants are documented; this assertion logs the
    // invariant name(s) that failed for diagnostics.
    const failed = (Object.keys(IRREVERSIBLE_INVARIANTS) as Array<
      keyof typeof IRREVERSIBLE_INVARIANTS
    >).filter((check) => !IRREVERSIBLE_INVARIANTS[check](input));
    if (failed.length > 0) {
      throw new Error(
        `useTypedConfirm: invariants failed for "${operation}" (${failed.join(', ')})`,
      );
    }
    return confirmString;
  }, [confirmString, input, matches, isFullyValid, operation]);

  return {
    confirmString,
    input,
    matches,
    isFullyValid,
    hasInput,
    setInput,
    reset,
    assertedConfirm,
  };
}
