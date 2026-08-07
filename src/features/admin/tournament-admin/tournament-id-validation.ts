/**
 * `features/admin/tournament-admin/tournament-id-validation.ts`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.B4.
 *
 * ## Purpose
 *
 * Pure validation helpers for the tournament admin surface. The module
 * owns:
 *
 *   1. The `TOURNAMENT_ID_UUID_REGEX` constant — RFC 4122 v4 UUID, the
 *      documented shape of every backend tournament id.
 *   2. The `validateTournamentId(id)` helper — returns a tagged result
 *      so callers can branch on `ok` without throwing.
 *   3. The `isTournamentStartedForEdit(tournament)` helper — returns
 *      `true` when the server `status` is one of the documented
 *      "edit-blocking" values (`ongoing`, `finished`, `cancelled`),
 *      so the action menu can hide the **Edit** affordance before the
 *      mutation reaches the backend.
 *   4. The `validateTournamentCascade(cascade)` helper — asserts the
 *      cascade shape and returns a tagged result, so the destructive
 *      dialog can branch on `ok` without throwing.
 *
 * The module is pure: it does not import React, does not call any
 * service, and does not touch the SDK. The status guard relies on the
 * `tournament.status` field already in memory (the row's
 * `status` field); the cascade validator relies on the cascade payload
 * already in memory.
 *
 * ## Why pure helpers (and not a hook)?
 *
 * `usePermission` (TKT-7.1.B2) returns the boolean `hasPermission`
 * only; the helper module never exposes identity through a hook to keep
 * the cross-store invariant ("no identity in hooks") intact. Callers
 * compute the started-status flag inline by reading the row's status
 * field directly.
 *
 * ## Cross-batch invariants
 *
 * - `TOURNAMENT_ID_UUID_REGEX` matches the backend `IsUUID('4')`
 *   decorator used on every tournament id. The regex is
 *   case-insensitive (matches the lowercase and uppercase forms the
 *   backend serializes interchangeably).
 * - `validateTournamentId` is total: every input — `null`,
 *   `undefined`, empty string, malformed string — returns a typed
 *   reason. The function never throws.
 * - `isTournamentStartedForEdit` reads only `status` from the
 *   `TournamentDto` and never inspects other fields. The exhaustive
 *   `switch` over the documented `TournamentStatus` values
 *   (`upcoming | registration | ongoing | finished | cancelled`)
 *   ensures future enum additions are flagged at compile time.
 * - `validateTournamentCascade` is total: every input — `null`,
 *   `undefined`, partial shapes — returns a typed reason. The
 *   function never throws.
 *
 * ## A1 verdict: edit-blocking statuses
 *
 * Per TKT-7.7.A1 §2.2 the documented backend `TournamentStatus` enum
 * is `upcoming | registration | ongoing | finished | cancelled`. The
 * **edit-blocking** values (hide the **Edit** affordance because the
 * backend rejects the mutation with `TOURNAMENT_ALREADY_STARTED`) are:
 *
 *   - `ongoing`
 *   - `finished`
 *   - `cancelled`
 *
 * `upcoming` and `registration` remain editable; the form re-validates
 * timestamps server-side and rejects with `TOURNAMENT_VALIDATION` if
 * the edit violates the documented window.
 */

import type { TournamentDto } from './admin-tournament-types';
import type { TournamentCascadeDto } from './admin-tournament-types';

// ─── UUID regex ────────────────────────────────────────────────────────────

const UUID_V4_REGEX_SOURCE =
  '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

/**
 * RFC 4122 v4 UUID regex, case-insensitive. The backend uses
 * `IsUUID('4')` on every tournament identifier; this regex mirrors the
 * same shape so the client and the backend agree on what constitutes a
 * valid id.
 *
 * The regex uses the standard `[1-5]` version nibble so it also
 * matches UUID v5 ids (which are byte-compatible with v4 in the
 * non-version parts). The `[89ab]` variant nibble is the
 * RFC 4122 §4.1.1 / §4.1.3 invariant.
 */
export const TOURNAMENT_ID_UUID_REGEX: RegExp = new RegExp(
  UUID_V4_REGEX_SOURCE,
  'i',
);

// ─── validateTournamentId ───────────────────────────────────────────────────

export type TournamentIdValidationReason =
  /** The input was not a string (`null`, `undefined`, or another non-string value). */
  | 'not-a-string'
  /** The input was a string but did not match the UUID v4 regex. */
  | 'invalid-uuid';

export type TournamentIdValidationResult =
  | { ok: true }
  | { ok: false; reason: TournamentIdValidationReason };

/**
 * Validate a candidate tournament id. The function is total and never
 * throws; the return is a discriminated union so callers can branch on
 * `ok` without try/catch.
 *
 * @example
 *   validateTournamentId('00000000-0000-4000-8000-000000000000') // { ok: true }
 *   validateTournamentId('not-a-uuid')                           // { ok: false, reason: 'invalid-uuid' }
 *   validateTournamentId(null)                                   // { ok: false, reason: 'not-a-string' }
 */
export function validateTournamentId(
  value: unknown,
): TournamentIdValidationResult {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'not-a-string' };
  }
  if (value.length === 0) {
    return { ok: false, reason: 'not-a-string' };
  }
  if (!TOURNAMENT_ID_UUID_REGEX.test(value)) {
    return { ok: false, reason: 'invalid-uuid' };
  }
  return { ok: true };
}

// ─── isTournamentStartedForEdit ─────────────────────────────────────────────

/**
 * The documented edit-blocking statuses (TKT-7.7.A1 §2.2 verdict).
 *
 * Editing a tournament in one of these statuses is rejected by the
 * backend with `TOURNAMENT_ALREADY_STARTED` (TKT-7.7.B2). The action
 * menu hides the **Edit** affordance before the mutation reaches the
 * backend so the user never sees a server-side rejection for the
 * predictable case.
 */
const EDIT_BLOCKING_STATUSES = new Set<string>([
  'ongoing',
  'finished',
  'cancelled',
]);

/**
 * Decide whether a tournament should hide the **Edit** affordance.
 *
 * Returns `true` when the server `status` is one of the edit-blocking
 * values (`ongoing | finished | cancelled`); the caller renders the
 * "view-only" tooltip and omits the **Edit** menu item.
 *
 * The function reads **only** the `status` field and never inspects
 * the rest of the row. Unknown statuses (defensive case for backend
 * additions) are conservatively treated as `false` so the affordance
 * remains reachable — the backend remains the authoritative gate.
 *
 * @example
 *   isTournamentStartedForEdit({ status: 'ongoing', ... })   // true
 *   isTournamentStartedForEdit({ status: 'upcoming', ... })  // false
 *   isTournamentStartedForEdit({ status: 'registration', ... }) // false
 */
export function isTournamentStartedForEdit(
  tournament: Pick<TournamentDto, 'status'>,
): boolean {
  return EDIT_BLOCKING_STATUSES.has(tournament.status);
}

// ─── validateTournamentCascade ──────────────────────────────────────────────

export type TournamentCascadeValidationReason =
  /** The input was not an object (`null`, `undefined`, or another non-object value). */
  | 'not-an-object'
  /** The object was missing one or more required numeric fields. */
  | 'invalid-shape';

export type TournamentCascadeValidationResult =
  | { ok: true; cascade: TournamentCascadeDto }
  | { ok: false; reason: TournamentCascadeValidationReason };

/**
 * Validate a candidate cascade payload. The function is total and
 * never throws; the return is a discriminated union so callers can
 * branch on `ok` without try/catch.
 *
 * The validator accepts the documented shape from
 * `TournamentCascadeDto` (TKT-7.7.B1). All three counts may be
 * `number | null` because the backend has not yet confirmed whether
 * the delete response embeds the cascade scope (TKT-7.7.A1 §2.4). The
 * validator only requires the three keys to be present; the count
 * values may be `null`.
 *
 * @example
 *   validateTournamentCascade({ participants: 10, rounds: 3, leaderboards: 1 })
 *   // { ok: true, cascade: { participants: 10, rounds: 3, leaderboards: 1 } }
 *
 *   validateTournamentCascade(null)
 *   // { ok: false, reason: 'not-an-object' }
 *
 *   validateTournamentCascade({ participants: 10 })
 *   // { ok: false, reason: 'invalid-shape' }
 */
export function validateTournamentCascade(
  value: unknown,
): TournamentCascadeValidationResult {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'not-an-object' };
  }
  const candidate = value as Record<string, unknown>;
  if (
    !('participants' in candidate) ||
    !('rounds' in candidate) ||
    !('leaderboards' in candidate)
  ) {
    return { ok: false, reason: 'invalid-shape' };
  }
  // The numeric fields may be `null`; only their presence is required.
  // Defensive: assert the values are either `number` or `null`.
  const participants = candidate.participants;
  const rounds = candidate.rounds;
  const leaderboards = candidate.leaderboards;
  const isCount = (v: unknown) => v === null || typeof v === 'number';
  if (!isCount(participants) || !isCount(rounds) || !isCount(leaderboards)) {
    return { ok: false, reason: 'invalid-shape' };
  }
  return {
    ok: true,
    cascade: {
      participants: participants as number | null,
      rounds: rounds as number | null,
      leaderboards: leaderboards as number | null,
      hasMoreParticipants:
        typeof candidate.hasMoreParticipants === 'boolean'
          ? candidate.hasMoreParticipants
          : undefined,
    },
  };
}