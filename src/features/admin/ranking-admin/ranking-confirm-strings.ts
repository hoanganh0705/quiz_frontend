/**
 * `features/admin/ranking-admin/ranking-confirm-strings.ts`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.B2.
 *
 * ## What this module owns
 *
 * The single source of truth for the two ranking admin irreversible-confirm
 * keys and their metadata. The confirm strings are drawn from
 * `IRREVERSIBLE_OPERATIONS` in `admin-capabilities.ts` (TKT-7.1.A5):
 *
 *   - `ranking.recalculate` → `'RECALCULATE RANKINGS'`
 *   - `ranking.reset`       → `'RESET RANKING PERIOD'`
 *
 * The module exports the typed keys, display labels, irreversibility notices,
 * and a `getRankingConfirmMetadata` helper consumed by `TypedConfirmDialog`
 * usages in TKT-7.9.C1 and TKT-7.9.C2.
 *
 * ## Shape pinned from A1 evidence
 *
 * Both confirm strings are confirmed present in `IRREVERSIBLE_OPERATIONS`
 * (lines 150–154 of `admin-capabilities.ts`). The strings are used verbatim
 * from the catalogue — they are not re-declared here, only re-exported with
 * display metadata.
 */

import {
  IRREVERSIBLE_OPERATIONS,
} from '../admin-capabilities';

// ─── Confirm string keys ────────────────────────────────────────────────────────

/**
 * The canonical key for the ranking recalculate irreversible-confirm entry
 * in `IRREVERSIBLE_OPERATIONS`.
 *
 * Mirrors `IrreversibleAdminOperation` = `'ranking.recalculate'`.
 */
export const RANKING_RECALCULATE_CONFIRM_KEY = 'ranking.recalculate' as const;

/**
 * The canonical key for the ranking period-reset irreversible-confirm entry
 * in `IRREVERSIBLE_OPERATIONS`.
 *
 * Mirrors `IrreversibleAdminOperation` = `'ranking.reset'`.
 */
export const RANKING_RESET_CONFIRM_KEY = 'ranking.reset' as const;

/** Union of the two ranking confirm keys. */
export type RankingConfirmKey =
  | typeof RANKING_RECALCULATE_CONFIRM_KEY
  | typeof RANKING_RESET_CONFIRM_KEY;

// ─── Confirm strings (from IRREVERSIBLE_OPERATIONS) ────────────────────────────

/**
 * The exact typed-confirm string for the ranking recalculate operation.
 *
 * Consumed by `TypedConfirmDialog` in `RecalculateRankingPanel` (TKT-7.9.E1).
 *
 * Source: `IRREVERSIBLE_OPERATIONS` entry with `operation: 'ranking.recalculate'`.
 */
export const RANKING_RECALCULATE_CONFIRM_STRING: string = (() => {
  const entry = IRREVERSIBLE_OPERATIONS.find(
    (op) => op.operation === 'ranking.recalculate',
  );
  if (!entry) {
    throw new Error(
      '[ranking-confirm-strings] `ranking.recalculate` not found in IRREVERSIBLE_OPERATIONS. ' +
        'Ensure TKT-7.1.A5 has been completed.',
    );
  }
  return entry.confirmString;
})();

/**
 * The exact typed-confirm string for the ranking period-reset operation.
 *
 * Consumed by `TypedConfirmDialog` in `PeriodResetPanel` (TKT-7.9.E2).
 *
 * Source: `IRREVERSIBLE_OPERATIONS` entry with `operation: 'ranking.reset'`.
 */
export const RANKING_RESET_CONFIRM_STRING: string = (() => {
  const entry = IRREVERSIBLE_OPERATIONS.find(
    (op) => op.operation === 'ranking.reset',
  );
  if (!entry) {
    throw new Error(
      '[ranking-confirm-strings] `ranking.reset` not found in IRREVERSIBLE_OPERATIONS. ' +
        'Ensure TKT-7.1.A5 has been completed.',
    );
  }
  return entry.confirmString;
})();

// ─── Display labels ─────────────────────────────────────────────────────────────

/**
 * Display label for the ranking recalculate typed-confirm dialog header.
 */
export const RANKING_RECALCULATE_LABEL = 'Recalculate rankings';

/**
 * Display label for the ranking period-reset typed-confirm dialog header.
 */
export const RANKING_RESET_LABEL = 'Reset ranking period';

// ─── Irreversibility notices ────────────────────────────────────────────────────

/**
 * Non-dismissable irreversibility notice rendered in the recalculate
 * typed-confirm dialog.
 *
 * The notice is informational — it does not gate the dialog, but it
 * is prominently displayed so the admin understands the scope of the action.
 */
export const RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE =
  'Recalculating rankings will re-compute all scores based on the latest ' +
  'quiz attempts. This operation may take several minutes and affects every ' +
  'user on the leaderboard.';

/**
 * Non-dismissable cross-user impact notice rendered in the period-reset
 * typed-confirm dialog.
 *
 * This notice is longer and more prominent than the recalculate notice
 * because period reset affects every user's ranking history for the
 * selected period — it is the highest-impact ranking admin operation.
 */
export const RANKING_RESET_IRREVERSIBILITY_NOTICE =
  'Resetting the ranking period will clear all rankings and XP for the ' +
  'selected period. This affects every user and cannot be undone. All ' +
  'leaderboard positions for this period will be cleared.';

// ─── Metadata helper ────────────────────────────────────────────────────────────

/** Metadata for a ranking confirm action. */
export interface RankingConfirmMetadata {
  /** The key in `IRREVERSIBLE_OPERATIONS`. */
  key: RankingConfirmKey;
  /** The display label for the dialog header. */
  label: string;
  /** The exact typed-confirm string required from the admin. */
  confirmString: string;
  /** The irreversibility notice displayed in the dialog. */
  irreversibilityNotice: string;
}

/**
 * Look up the confirm metadata for a ranking admin action.
 *
 * @param action - Either `'recalculate'` or `'reset'`.
 * @returns The full metadata object for the action.
 *
 * @example
 *   const meta = getRankingConfirmMetadata('reset')
 *   // meta.confirmString === 'RESET RANKING PERIOD'
 *   // meta.label === 'Reset ranking period'
 *   // meta.irreversibilityNotice includes 'cross-user'
 */
export function getRankingConfirmMetadata(
  action: 'recalculate' | 'reset',
): RankingConfirmMetadata {
  if (action === 'recalculate') {
    return {
      key: RANKING_RECALCULATE_CONFIRM_KEY,
      label: RANKING_RECALCULATE_LABEL,
      confirmString: RANKING_RECALCULATE_CONFIRM_STRING,
      irreversibilityNotice: RANKING_RECALCULATE_IRREVERSIBILITY_NOTICE,
    };
  }
  return {
    key: RANKING_RESET_CONFIRM_KEY,
    label: RANKING_RESET_LABEL,
    confirmString: RANKING_RESET_CONFIRM_STRING,
    irreversibilityNotice: RANKING_RESET_IRREVERSIBILITY_NOTICE,
  };
}
