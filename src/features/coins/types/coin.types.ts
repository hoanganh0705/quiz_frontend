

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

export type CoinReason =

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

export interface CoinTransactionFilters {
cursor?: string;
limit?: number;
}

export const DEFAULT_COIN_TRANSACTION_FILTERS: CoinTransactionFilters = {
cursor: undefined,
limit: undefined,
};

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