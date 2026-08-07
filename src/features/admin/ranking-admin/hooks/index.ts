/**
 * `features/admin/ranking-admin/hooks/index.ts` — ranking admin hooks barrel.
 *
 * Re-exports the canonical list of ranking admin hooks added by Epic 7.9.
 * Consumers should import from this barrel:
 *
 *   import { useRecalculateRanking } from '@/features/admin/ranking-admin/hooks';
 */

export { useRecalculateRanking } from './useRecalculateRanking';
export type {
  UseRecalculateRankingResult,
  UseRecalculateRankingAudit,
} from './useRecalculateRanking';

export { useResetRankingPeriod } from './useResetRankingPeriod';
export type {
  UseResetRankingPeriodResult,
  UseResetRankingPeriodAudit,
} from './useResetRankingPeriod';

export { useCheckRankingConsistency } from './useCheckRankingConsistency';
export type {
  UseCheckRankingConsistencyResult,
  UseCheckRankingConsistencyAudit,
} from './useCheckRankingConsistency';
