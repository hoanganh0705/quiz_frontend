/**
 * `daily-challenge.service.ts` — Daily-challenge service (Phase 3 Story 3.12).
 *
 * Source epic:   Story 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-4.1.G-prep.
 *
 * Replaces `features/daily-challenge/wrappers/daily-challenge.wrapper.ts`
 * (TKT-3.12.A3). The service preserves the legacy wrapper's
 * `DailyChallengeResult<T>` discriminated union because the hooks in
 * Batch B (TKT-3.12.B1) branch on it.
 *
 * ## Drift notes
 *
 * At this commit the regenerated SDK does NOT expose a
 * daily-challenge operation (verified in `EPIC_3_12_A1.md` §1.1).
 * The service therefore returns `{ kind: 'missing-endpoint' }` for
 * every call — the page composition (TKT-3.12.C1) renders the
 * `<DailyChallengePlaceholder />` surface for this kind, and the user
 * never sees a 404 or an exception.
 *
 * The detection is static: the service has a module-level
 * `HAS_DAILY_CHALLENGE_SDK` constant set to `false` at this commit.
 * When the backend later exposes a stable endpoint, the constant
 * flips to `true` (single line) and the service calls the
 * regenerated operation.
 *
 * ## Error contract (unchanged from the legacy wrapper)
 *
 *   - The service never throws. Every failure is converted to
 *     `{ kind: 'error', error: ApiError }`.
 *   - The service never returns the post-`unwrap` envelope directly.
 *     The `ok` branch carries the narrowed view type only.
 *   - The service does NOT forward a `cursor` parameter when the
 *     endpoint is offset-paginated (drift §4).
 */

import { ApiError, isApiError } from '@/lib/api';

import type {
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
} from '../types/dto';

// ─── Module-level SDK-availability flag ────────────────────────────────

const HAS_DAILY_CHALLENGE_SDK = false;

// ─── Helpers ───────────────────────────────────────────────────────────

function toErrorResult(error: unknown): { kind: 'error'; error: ApiError } {
  if (isApiError(error)) {
    return { kind: 'error', error };
  }
  throw error;
}

// ─── Reads ─────────────────────────────────────────────────────────────

export async function getDailyChallengeToday(): Promise<
  DailyChallengeResult<DailyChallengeView>
> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' };
  }
  // Implementation deferred — see file header.
  try {
    return { kind: 'missing-endpoint' };
  } catch (error) {
    return toErrorResult(error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getDailyChallengeHistoryPage(
  _params: GetDailyChallengeHistoryParams,
): Promise<DailyChallengeResult<DailyChallengeHistoryPage>> {
  if (!HAS_DAILY_CHALLENGE_SDK) {
    return { kind: 'missing-endpoint' };
  }
  try {
    return { kind: 'missing-endpoint' };
  } catch (error) {
    return toErrorResult(error);
  }
}

// ─── Re-exports ────────────────────────────────────────────────────────

export type {
  DailyChallengeHistoryItemView,
  DailyChallengeHistoryPage,
  DailyChallengeResult,
  DailyChallengeView,
  GetDailyChallengeHistoryParams,
} from '../types/dto';