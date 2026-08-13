/**
 * Public surface for the coin-economy feature.
 *
 * Source epic:   Epic 7.12 — Coin economy: earn + spend side.
 * Source ticket: TKT-7.12.A1.
 *
 * Components and hooks should import from `@/features/coins` only —
 * never from internal paths.
 */

export * from './services/coins.service';
export type {
  CoinErrorCode,
  CoinReason,
  CoinTransactionFilters,
} from './types/coin.types';
export {
  COIN_CACHE_KEYS,
  DEFAULT_COIN_TRANSACTION_FILTERS,
} from './types/coin.types';

export {
  useCoinWallet,
  type UseCoinWalletResult,
} from './hooks/useCoinWallet';

export {
  useCoinTransactions,
  type UseCoinTransactionsResult,
} from './hooks/useCoinTransactions';

export { useCoinSocket } from './hooks/useCoinSocket';

export {
  useTipAuthor,
  type UseTipAuthorResult,
} from './hooks/useTipAuthor';

export {
  usePurchaseFlair,
  type UsePurchaseFlairResult,
} from './hooks/usePurchaseFlair';

export {
  useSuppressRecommendedQuiz,
  type UseSuppressRecommendedQuizResult,
} from './hooks/useSuppressRecommendedQuiz';

export {
  useAdminAdjustCoins,
  type UseAdminAdjustCoinsResult,
} from './hooks/useAdminAdjustCoins';

export { CoinBalancePill } from './components/CoinBalancePill';
export { RewardToast } from './components/RewardToast';
export { PurchaseConfirmDialog } from './components/PurchaseConfirmDialog';
export { InsufficientCoinsNotice } from './components/InsufficientCoinsNotice';
export { TipAuthorButton } from './components/TipAuthorButton';
export { FlairPurchaseControl } from './components/FlairPurchaseControl';
export { SuppressRecommendedControl } from './components/SuppressRecommendedControl';
export { CoinBalanceSyncLayer } from './components/CoinBalanceSyncLayer';

export {
  COIN_SPEND_AMOUNTS,
  COIN_DAILY_TIP_LIMIT,
  type CoinSpendAmountKey,
} from './constants/coin.constants';