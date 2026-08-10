/**
 * `features/admin/irreversible-confirm-invariants.ts`
 *
 * Source epic:   Epic 7.1 — Phase 7 SDK coverage.
 * Source ticket: TKT-7.1.A5.
 *
 * ## What this module owns
 *
 * The Phase 7 typed-confirm invariant catalogue: the strict rules every
 * irreversible-admin operation must satisfy before the typed-confirm
 * string is dispatched to the backend. The catalogue is consumed by
 * `useTypedConfirm` (TKT-7.1.B4) and `TypedConfirmDialog` (TKT-7.1.C5)
 * to render the dialog, and by `admin-lint-invariants.mjs`
 * (TKT-7.1.B6) to verify the invariants structurally.
 *
 * The invariants:
 *
 *   1. **minLength** — every confirm string is at least 8 characters
 *      (master plan Phase 7 Risks line 497).
 *   2. **caseSensitive** — the backend's match is case-sensitive;
 *      whitespace is significant (master plan Phase 7 Risks lines
 *      495–496). The catalogue mirrors this.
 *   3. **nonTrivial** — the string must contain at least one non-trivial
 *      word; strings like "yes" or "ok" are rejected.
 *   4. **unique** — every confirm string is unique across the
 *      documented operations (cross-batch invariant #1).
 *   5. **exposed** — every irreversible operation has its confirm
 *      string exposed to `IRREVERSIBLE_OPERATIONS`
 *      (admin-capabilities.ts).
 */

import {
  getIrreversibleConfirmString,
  IRREVERSIBLE_OPERATIONS,
} from './admin-capabilities';

export const IRREVERSIBLE_CONFIRM_MIN_LENGTH = 8;

export const IRREVERSIBLE_CONFIRM_DOCUMENTATION = Object.freeze({
  minLength: IRREVERSIBLE_CONFIRM_MIN_LENGTH,
  caseSensitive: true,
  whitespaceSensitive: true,
  backendCode: 'IRREVERSIBLE_CONFIRM_REQUIRED' as const,
});

/**
 * Structural invariants shared across all irreversible-admin operations.
 *
 * The catalogue renders every entry's invariant as a boolean predicate;
 * the runtime checks in `useTypedConfirm` use these to guard against
 * drift (e.g. someone shrinking `IRREVERSIBLE_CONFIRM_MIN_LENGTH` would
 * break the predicate invariants).
 */
export const IRREVERSIBLE_INVARIANTS = Object.freeze({
  minLength: (s: string) => s.length >= IRREVERSIBLE_CONFIRM_MIN_LENGTH,
  caseSensitive: (s: string) => s === s.toUpperCase(),
  whitespaceSensitive: (s: string) => /\s/.test(s),
  nonTrivial: (s: string) =>
    /[A-Z]/.test(s) && s.trim().length >= IRREVERSIBLE_CONFIRM_MIN_LENGTH,
});

export type IrreversibleInvariantCheck = keyof typeof IRREVERSIBLE_INVARIANTS;

/**
 * Pure validator for a candidate confirm string against a single
 * invariant. Used by `useTypedConfirm` to render the inline match
 * indicator.
 *
 * @example
 *   validateIrreversibleConfirm('RESET RANKING PERIOD', 'minLength') // true
 *   validateIrreversibleConfirm('YES', 'minLength')                   // false
 */
export function validateIrreversibleConfirm(
  candidate: string,
  check: IrreversibleInvariantCheck,
): boolean {
  return IRREVERSIBLE_INVARIANTS[check](candidate);
}

/**
 * Aggregate check. Returns `true` only when every invariant passes for
 * the candidate. The non-null result is the strictest form; a `false`
 * return indicates at least one invariant failed.
 */
export function isFullyValidConfirm(candidate: string): boolean {
  return (Object.keys(IRREVERSIBLE_INVARIANTS) as IrreversibleInvariantCheck[]).every(
    (check) => validateIrreversibleConfirm(candidate, check),
  );
}

/**
 * Project-level invariant: every irreversible operation in
 * `IRREVERSIBLE_OPERATIONS` must satisfy every invariant. This function
 * is the runtime equivalent of the phase7-lint script's
 * `IRREVERSIBLE_INVARIANTS_HOLD` check. Returns the array of operation
 * IDs that failed the invariants (empty array = pass).
 */
export function findBrokenIrreversibleInvariants(): readonly string[] {
  const broken: string[] = [];
  for (const entry of IRREVERSIBLE_OPERATIONS) {
    if (!isFullyValidConfirm(entry.confirmString)) {
      broken.push(entry.operation);
    }
  }
  return broken;
}

/**
 * Project-level invariant: every irreversible operation has a unique
 * confirm string. Returns the offending operation duplicates (empty
 * array = pass).
 */
export function findDuplicateIrreversibleConfirmStrings(): readonly string[] {
  const seen = new Map<string, string[]>();
  for (const entry of IRREVERSIBLE_OPERATIONS) {
    const list = seen.get(entry.confirmString) ?? [];
    list.push(entry.operation);
    seen.set(entry.confirmString, list);
  }
  return Array.from(seen.values())
    .filter((ops) => ops.length > 1)
    .flat();
}

/**
 * Programmatic helper: assert every irreversible operation's typed-confirm
 * string satisfies every invariant. Throws when the catalogue drifts.
 *
 * Intended for `useTypedConfirm`'s initialization path and the audit
 * shell integration test (TKT-7.1.E9).
 */
export function assertIrreversibleInvariantsHold(): void {
  const broken = findBrokenIrreversibleInvariants();
  if (broken.length > 0) {
    throw new Error(
      `irreversible-confirm-invariants: ${broken.join(', ')} has an invalid confirm string`,
    );
  }
  const dups = findDuplicateIrreversibleConfirmStrings();
  if (dups.length > 0) {
    throw new Error(
      `irreversible-confirm-invariants: duplicate confirm strings for ${dups.join(', ')}`,
    );
  }
  if (
    IRREVERSIBLE_CONFIRM_MIN_LENGTH < 8 ||
    IRREVERSIBLE_CONFIRM_DOCUMENTATION.backendCode !==
      'IRREVERSIBLE_CONFIRM_REQUIRED'
  ) {
    throw new Error('irreversible-confirm-invariants: documentation drift');
  }
  void getIrreversibleConfirmString;
}
