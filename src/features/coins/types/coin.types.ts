/**
 * `coins.types.ts` — coin-economy types, error codes, and SWR cache-key factories.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.A1.
 *
 * Mirrors the pattern of `notification.types.ts` (Story 5.4):
 *
 *   - Domain types as feature-level projections of the service
 *     wrappers.
 *   - `CoinErrorCode` is the typed union of `code` values returned by
 *     the coin controllers' RFC 7807 problem details (see backend
 *     `src/common/errors/problem-code-mapping.ts`).
 *   - `COIN_CACHE_KEYS` is the SWR key registry for the wallet and
 *     the ledger.
 *
 * The backend's coarse `CoinReason` enum is mirrored as a string
 * literal union; the wire shape passes the raw string and consumers
 * narrow to the union via `String#includes` predicates where needed.
 */

import type {
  CoinWallet,
  CoinTransaction,
  CoinTransactionPage,
  TipAuthorRequest,
  PurchaseFlairRequest,
  SuppressQuizRequest,
  AdminAdjustRequest,
  CoinSpendResponse,
} from "../services/coins.service";

export type {
  CoinWallet,
  CoinTransaction,
  CoinTransactionPage,
  TipAuthorRequest,
  PurchaseFlairRequest,
  SuppressQuizRequest,
  AdminAdjustRequest,
  CoinSpendResponse,
};

// ─── Domain enums (mirror backend `CoinReason`) ──────────────────────────────

/**
 * Coarse reason code on every ledger row. The wire shape is a string;
 * the typed union lets components narrow without typos.
 */
export type CoinReason =
  // Earn side
  | 'QUIZ_COMPLETION_REWARD'
  | 'DAILY_CHALLENGE_REWARD'
  | 'TOURNAMENT_REWARD'
  | 'ACHIEVEMENT_REWARD'
  | 'STREAK_BONUS'
  | 'ADMIN_CREDIT'
  // Spend side
  | 'TIP_SENT'
  | 'FLAIR_PURCHASED'
  | 'SUPPRESS_RECOMMENDED_PURCHASED'
  | 'ADMIN_DEBIT';

/**
 * Coin-spend error codes. Mirrors the `code` field emitted by the
 * backend's RFC 7807 problem mapper for the spend endpoints.
 */
export type CoinErrorCode =
  | 'INSUFFICIENT_COINS'
  | 'COIN_TIP_DAILY_CAP_EXCEEDED'
  | 'COIN_TIP_SELF_NOT_ALLOWED'
  | 'COIN_TIP_RECIPIENT_NOT_FOUND'
  | 'COIN_TIP_QUIZ_NOT_FOUND'
  | 'COIN_TIP_AMOUNT_INVALID'
  | 'COIN_FLAIR_BADGE_NOT_OWNED'
  | 'COIN_FLAIR_BADGE_REVOKED'
  | 'COIN_SUPPRESS_QUIZ_NOT_FOUND'
  | 'COIN_SUPPRESS_ALREADY_ACTIVE'
  | 'COIN_IDEMPOTENCY_KEY_CONFLICT'
  | 'COIN_ADMIN_INSUFFICIENT_PERMISSIONS'
  | 'COIN_ADMIN_REASON_REQUIRED'
  | 'COIN_ADMIN_AMOUNT_INVALID'
  | 'COIN_ADMIN_TARGET_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'GLOBAL_VALIDATION_FAILED'
  | 'GLOBAL_INTERNAL_ERROR';

// ─── Filter shapes ──────────────────────────────────────────────────────────

/**
 * Filters for `useCoinTransactions`. `cursor` is opaque.
 */
export interface CoinTransactionFilters {
  cursor?: string;
  limit?: number;
}

export const DEFAULT_COIN_TRANSACTION_FILTERS: CoinTransactionFilters = {
  cursor: undefined,
  limit: undefined,
};

// ─── SWR cache keys ─────────────────────────────────────────────────────────

/**
 * SWR cache keys for the coin-economy surfaces.
 *
 * `wallet` — singleton per-user; invalidated on every
 * `coin:balance_changed` (see `useCoinSocket`).
 *
 * `transactions` — scoped by serialised filter shape so different
 * cursor pages do not collide. Invalidated on every
 * `coin:transaction_recorded` so a fresh page-1 includes the new row.
 *
 * `dailyEarnings` — daily cap; refreshed by the application layer
 * before issuing spend-side tips so we can guard against hitting the
 * `DAILY_QUIZ_EARNINGS_CAP` (server is the source of truth).
 */
export const COIN_CACHE_KEYS = {
  wallet() {
    return ["coins", "wallet"] as const;
  },
  transactions(filters: CoinTransactionFilters) {
    const parts: string[] = [];
    if (filters.cursor !== undefined && filters.cursor.length > 0) {
      parts.push(`cursor=${filters.cursor}`);
    }
    if (typeof filters.limit === 'number') {
      parts.push(`limit=${filters.limit}`);
    }
    return ["coins", "transactions", parts.join("|")] as const;
  },
  dailyEarnings() {
    return ["coins", "daily-earnings"] as const;
  },
} as const;