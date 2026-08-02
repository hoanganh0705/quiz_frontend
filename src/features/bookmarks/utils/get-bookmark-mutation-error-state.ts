/**
 * `getBookmarkMutationErrorState` — the canonical error-to-copy
 * mapper for Story 3.10 bookmark mutations.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.C3.
 *
 * Centralized mapping from the optimistic-toggle error taxonomy
 * (Story 3.9 B1) and the C1/C2 outcome discriminants to the
 * user-facing surfaces consumed by `<BookmarkButtonSlot />` (D4) and
 * its inline notice. Single source of truth for Phase 3 bookmark
 * inline messaging.
 *
 * ## What this mapper owns
 *
 *   - `no_collection` → `{ kind: 'setup-prompt' }`. The slot (D4)
 *     opens `<BookmarksSetupPrompt />` without rendering an inline
 *     error message.
 *   - `http_404` → `{ kind: 'collection-unavailable' }`. The slot
 *     requests a cache invalidation so the next read returns the
 *     post-revalidation state.
 *   - `http_429` → `{ kind: 'rate-limited' }`.
 *   - `http_5xx` / `unknown` (network failure) → `{ kind:
 *     'retryable' }`. The slot exposes a Retry affordance.
 *   - `unknown` triggered by 401-after-refresh-failure →
 *     `{ kind: 'session-expired' }`. The slot renders the existing
 *     session-expired surface rather than duplicate bookmark copy.
 *   - `http_4xx` (e.g. 422, 400, generic conflicts) →
 *     `{ kind: 'generic' }`. The slot renders the generic "couldn't
 *     update" copy.
 *
 * ## Why a separate mapper
 *
 * The optimistic-toggle primitive (Story 3.9 B1) classifies errors
 * into `http_*` kinds; the C1 hook adds the `no_collection` outcome
 * as a separate signal. Without a mapper the slot (D4) would have to
 * fork on both contracts separately for every error kind, and copy
 * edits would touch multiple files. The mapper collapses both
 * contracts into a single discriminated union the slot consumes.
 *
 * ## Why no UI rendering
 *
 * The mapper returns data only — the slot (D4) decides what to render
 * based on `kind`. Keeping the mapper pure means tests can lock the
 * kind-to-state mapping without rendering React, and the slot owns
 * the layout / positioning / focus-management concerns.
 *
 * @see useOptimisticToggle (Story 3.9 B1 — error taxonomy)
 * @see useBookmarkQuiz / useUnbookmarkQuiz (C1 / C2 — outcome emitters)
 * @see BookmarkButtonSlot (D4 — the consumer)
 */

import { isApiError, type OptimisticToggleError } from '@/lib/api';
import type { BookmarkMutationOutcome, BookmarkMutationOutcomeKind } from '@/features/bookmarks/hooks/use-bookmark-quiz';
import type { UnbookmarkMutationOutcome } from '@/features/bookmarks/hooks/use-unbookmark-quiz';

/**
 * The discriminated union the slot (D4) consumes. Each kind maps
 * to the user-facing surface, the inline copy, and the recovery
 * affordance.
 */
export type BookmarkMutationErrorStateKind =
  /**
   * No error. The mapper's null-equivalent. The slot renders no
   * inline notice and no setup prompt.
   */
  | 'ok'
  /**
   * The user owns zero bookmark collections. The slot opens the
   * setup prompt (D2) — no inline notice copy.
   */
  | 'setup-prompt'
  /**
   * The targeted collection was deleted server-side. The slot
   * requests a cache invalidation so the next read returns the
   * post-revalidation state, and renders "Your collection is
   * unavailable".
   */
  | 'collection-unavailable'
  /**
   * Server-side throttle. "Slow down — try again in a minute".
   */
  | 'rate-limited'
  /**
   * 5xx server error OR network failure. The slot exposes a
   * Retry affordance.
   */
  | 'retryable'
  /**
   * Failed authentication refresh. The slot defers to the
   * existing session-expired surface rather than rendering
   * bookmark-specific copy.
   */
  | 'session-expired'
  /**
   * Catch-all for 4xx errors that don't fit a more specific
   * kind. The slot renders a generic "Couldn't update" copy.
   */
  | 'generic';

export interface BookmarkMutationErrorState {
  /**
   * The discriminated kind. See `BookmarkMutationErrorStateKind`.
   */
  kind: BookmarkMutationErrorStateKind;
  /**
   * The localized title for the inline notice. `null` when the
   * slot should render no notice (e.g. `ok`, `setup-prompt`).
   */
  title: string | null;
  /**
   * The localized body copy for the inline notice. `null` when
   * the slot should render no notice.
   */
  body: string | null;
  /**
   * Whether the slot should expose a "Retry" affordance. The
   * `retryable` kind sets this; everything else is `false`.
   */
  retryable: boolean;
  /**
   * Whether the slot should request a cache invalidation of the
   * membership / status / collections keys. `http_404` sets this
   * true so the next read reflects the server-side deletion.
   */
  invalidateCache: boolean;
}

/**
 * The copy table — single source of truth for the bookmark error
 * mapper. Story 3.10 line 1107 lists the required user-facing
 * branches; this table is the canonical mapping.
 */
const COPY: Record<
  Exclude<BookmarkMutationErrorStateKind, 'ok' | 'setup-prompt' | 'session-expired'>,
  { title: string; body: string }
> = {
  'collection-unavailable': {
    title: 'Collection unavailable',
    body: 'Your collection is unavailable. Please refresh to sync your bookmarks.',
  },
  'rate-limited': {
    title: 'Slow down',
    body: 'Slow down — try again in a minute.',
  },
  retryable: {
    title: "Couldn't update bookmark",
    body: "We couldn't update your bookmark. Please try again.",
  },
  generic: {
    title: "Couldn't update bookmark",
    body: "Couldn't update — try again.",
  },
};

const OK: BookmarkMutationErrorState = {
  kind: 'ok',
  title: null,
  body: null,
  retryable: false,
  invalidateCache: false,
};

const SESSION_EXPIRED: BookmarkMutationErrorState = {
  kind: 'session-expired',
  title: 'Session expired',
  body: 'Your session has expired. Please sign in again to continue.',
  retryable: false,
  invalidateCache: false,
};

const SETUP_PROMPT: BookmarkMutationErrorState = {
  kind: 'setup-prompt',
  title: null,
  body: null,
  retryable: false,
  invalidateCache: false,
};

/**
 * Heuristic: did the error come from a 401-after-refresh-failure
 * path? When a refresh-token rotation fails (Epic 2.7), the
 * underlying mutation rejects with an `ApiError` whose payload
 * carries `status === 401` OR a plain `Error` whose message
 * indicates the auth-refresh subsystem. We surface the existing
 * session-expired UI rather than rendering bookmark-specific copy.
 *
 * The primitive classifies both 401 and plain refresh-failure
 * `Error`s as `unknown` kind, so we discriminate further here.
 */
function looksLikeSessionExpired(
  cause: unknown,
  errorKind: 'unknown',
): boolean {
  if (errorKind !== 'unknown') return false;
  if (!isApiError(cause)) return false;
  return cause.status === 401 || cause.status === 0;
}

/**
 * Map an `OptimisticToggleError | null` PLUS the most recent C1/C2
 * mutation outcome into the canonical user-facing state.
 *
 * Pure, deterministic, and free of I/O. The slot (D4) calls this
 * in render:
 *
 * ```ts
 * const errorState = getBookmarkMutationErrorState(
 *   lastError,
 *   lastOutcome,
 * );
 * ```
 *
 * The mapper's precedence:
 *
 *   1. If `lastOutcome.kind === 'no_collection'` → `setup-prompt`
 *   2. Else if `lastOutcome.kind === 'unauthenticated'` → `ok`
 *      (the slot does not render an error for the unauthenticated
 *      branch; the click itself is a no-op).
 *   3. Else if `lastError !== null` and matches the
 *      session-expired heuristic → `session-expired`
 *   4. Else if `lastError !== null` → map by `lastError.kind`
 *   5. Else → `ok`
 *
 * The `409` reconciliation (C1 AC #4) and the unbookmark-no-op
 * outcomes (`already_bookmarked`, `already_unbookmarked`) DO NOT
 * surface an error state — they record `ok` so the slot renders
 * no inline notice.
 */
export function getBookmarkMutationErrorState(
  lastError: OptimisticToggleError | null,
  lastOutcome: BookmarkMutationOutcome | UnbookmarkMutationOutcome | null,
): BookmarkMutationErrorState {
  if (lastOutcome === null) {
    return lastError === null ? OK : mapByErrorKind(lastError);
  }

  if (
    (lastOutcome as BookmarkMutationOutcome).kind === 'no_collection'
  ) {
    return SETUP_PROMPT;
  }

  if (
    (lastOutcome as BookmarkMutationOutcome).kind === 'unauthenticated'
  ) {
    return OK;
  }

  if (lastError !== null) {
    return mapByErrorKind(lastError);
  }

  return OK;
}

function mapByErrorKind(
  lastError: OptimisticToggleError,
): BookmarkMutationErrorState {
  if (lastError.kind === 'unknown') {
    if (looksLikeSessionExpired(lastError.cause, 'unknown')) {
      return SESSION_EXPIRED;
    }
    return makeState('retryable');
  }
  if (lastError.kind === 'http_429') {
    return makeState('rate-limited');
  }
  if (lastError.kind === 'http_404') {
    return {
      ...makeState('collection-unavailable'),
      invalidateCache: true,
    };
  }
  if (lastError.kind === 'http_5xx') {
    return makeState('retryable');
  }
  // http_4xx — generic conflicts (e.g. 422, 400). The 409 path is
  // intercepted by C1/C2 before reaching the primitive, so the
  // mapper can ignore the 409 specific status.
  return makeState('generic');
}

function makeState(
  kind: Exclude<
    BookmarkMutationErrorStateKind,
    'ok' | 'setup-prompt' | 'session-expired'
  >,
): BookmarkMutationErrorState {
  const copy = COPY[kind];
  return {
    kind,
    title: copy.title,
    body: copy.body,
    retryable: kind === 'retryable',
    invalidateCache: false,
  };
}

/**
 * Re-export of the C1 outcome-kind type so the slot (D4) can
 * mirror the `lastOutcome` parameter without reaching into the
 * hook modules.
 */
export type { BookmarkMutationOutcomeKind };
