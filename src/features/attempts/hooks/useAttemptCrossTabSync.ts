'use client';

/**
 * `useAttemptCrossTabSync` — user-scoped attempt cross-tab cache
 * reconciliation adapter.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.8.
 * Extended for Story 4.15: T-4.15.7.
 *
 * ## Purpose
 *
 * Subscribes to the existing `attempts/changed` BroadcastChannel
 * (TKT-4.1.B2) and reconciles the Story 4.14 + 4.15 SWR caches for
 * any remote-tab event the source tab broadcasts. The adapter is the
 * bridge between the Story 4.1 cross-tab envelope and the Story
 * 4.14 / 4.15 cache keys.
 *
 * ## Cache reconciliation
 *
 *   - `kind: 'start'`     → revalidate the active-attempt cache so a
 *                            second tab's Start CTA renders Continue
 *                            within the approved ~1 s target. The
 *                            active key is rebuilt from the current
 *                            viewer's `quizId` because the broadcast
 *                            payload carries the canonical attempt id
 *                            but the active key is scoped to the
 *                            quiz id the receiving tab is rendering.
 *   - `kind: 'submit'`    → revalidate the matching detail and
 *                            answers caches so the runner's lock set
 *                            reflects the new submission.
 *   - `kind: 'withdraw'`  → revalidate the matching detail and
 *                            answers caches so the runner's lock set
 *                            drops the withdrawn question.
 *   - `kind: 'abandon'`   → revalidate the active + detail caches and
 *                            converge the runner's status to
 *                            `abandoned` (T-4.14.7 store mapping).
 *   - `kind: 'complete'`  → Story 4.15 (T-4.15.7): revalidate the
 *                            detail, result, and history caches so a
 *                            second tab's "my attempts" page renders
 *                            the completed row, and the result page
 *                            renders fresh server data on entry. The
 *                            receiving tab never calls `completeAttempt`
 *                            again (cross-tab is read-only) and never
 *                            auto-navigates to the result page
 *                            (navigation is user-driven per the
 *                            Story 4.15 §Cross-Tab rule).
 *
 * ## Scoping
 *
 *   - `userId` from the event payload must equal the current session
 *     id; otherwise the event is ignored.
 *   - Same-tab events (matching the current tab id) are filtered at
 *     the channel layer — they never reach this adapter.
 *
 * ## Lifecycle
 *
 *   - Subscription is registered once on mount and removed on
 *     unmount or when the session resolves to `null` (logout).
 *   - When `BroadcastChannel` is unavailable, the source-tab SWR
 *     invalidation continues to work; only the cross-tab forwarding
 *     is a no-op. The runner does not crash.
 *
 * ## Reserved completion events
 *
 * The `complete` kind was reserved in Story 4.14 and is now owned
 * by Story 4.15 (T-4.15.7). The Story 4.14 reserved semantics —
 * revalidate only, no completion mutation, no result-page transition
 * — are preserved; Story 4.15 extends the revalidation surface to
 * the result and history caches without modifying those semantics.
 */

import { useEffect } from 'react';
import { mutate } from 'swr';

import {
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptsChangedEvent,
} from '@/lib/api/core/attempts-broadcast-channel';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import { ATTEMPT_RESULT_CACHE_KEYS } from '@/features/attempts/types/attempt-result.types';
import {
  recordAbandonSuccess,
  recordCompletionSuccess,
  useAttemptsStore,
} from '@/features/attempts/stores/useAttemptsStore';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseAttemptCrossTabSyncParams {
  /**
   * Quiz version id the receiving tab is currently rendering. Used
   * to scope the `start` revalidation to the active-attempt key.
   * Pass `null` to disable the subscription while the viewer has
   * not yet picked a quiz.
   */
  quizVersionId: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Subscribe the receiving tab to remote-tab attempt events.
 *
 * Mount this hook from `AttemptRunner` (or its layout shell) so the
 * runner stays in sync with any sibling tab's mutations. The hook
 * has no return value — its side effects are the SWR `mutate` calls
 * and the store convergence for `abandon` events.
 *
 * @example
 *   useAttemptCrossTabSync({ quizVersionId: quizVersion.id });
 */
export function useAttemptCrossTabSync(
  params: UseAttemptCrossTabSyncParams,
): void {
  const { quizVersionId } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId =
    bootstrapState === 'authenticated' && currentUser
      ? ((currentUser as { id?: string; userId?: string }).id
          ?? (currentUser as { userId?: string }).userId
          ?? null)
      : null;

  useEffect(() => {
    if (sessionId === null) return;

    const unsubscribe = subscribeToAttemptEvents((event) => {
      if (!isEventForSession(event, sessionId)) return;
      handleRemoteAttemptEvent(event, quizVersionId);
    });

    return unsubscribe;
  }, [sessionId, quizVersionId]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check whether an attempt event is scoped to the receiving tab's
 * session.
 *
 * `userId` must equal the caller's session id. Same-tab filtering
 * happens upstream in the channel layer; the adapter does not need
 * to compare `tabId`.
 */
function isEventForSession(
  event: AttemptsChangedEvent,
  sessionId: string,
): boolean {
  return event.userId === sessionId;
}

/**
 * Map a remote attempt event to one or more SWR `mutate` calls and
 * (for `abandon`) a store-side status convergence.
 *
 * Pure of side effects beyond `mutate` + the runner store; safe to
 * call from any subscriber.
 */
function handleRemoteAttemptEvent(
  event: AttemptsChangedEvent,
  quizVersionId: string | null,
): void {
  const kind: AttemptChangeKind = event.kind;

  switch (kind) {
    case 'start': {
      // A remote start invalidates the active-attempt cache so a
      // second tab's Start CTA renders Continue. The active key is
      // scoped to the quiz version, not the attempt id, so we
      // revalidate every active key matching the attempt id by
      // using a `mutate` predicate over the SWR cache.
      if (quizVersionId !== null) {
        const activeKey = ATTEMPT_CACHE_KEYS.active(quizVersionId, event.userId);
        void mutate(activeKey);
      }
      // Also revalidate the detail + answers caches for the new
      // attempt id so any subsequent hydration uses fresh data.
      void mutate(ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId));
      void mutate(ATTEMPT_CACHE_KEYS.answers(event.attemptId, event.userId));
      return;
    }

    case 'submit': {
      void mutate(ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId));
      void mutate(ATTEMPT_CACHE_KEYS.answers(event.attemptId, event.userId));
      return;
    }

    case 'withdraw': {
      void mutate(ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId));
      void mutate(ATTEMPT_CACHE_KEYS.answers(event.attemptId, event.userId));
      return;
    }

    case 'abandon': {
      void mutate(ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId));
      if (quizVersionId !== null) {
        void mutate(
          ATTEMPT_CACHE_KEYS.active(quizVersionId, event.userId),
        );
      }
      // Converge the receiving tab's runner to the terminal
      // `abandoned` status so the picker stops accepting input.
      // We can't know the quiz version for the abandoned attempt
      // from the event alone, so we look it up via the reverse
      // index the runner store maintains.
      const reverseIndex = useAttemptsStore.getState().attemptsByQuizVersionId;
      for (const [qvId, attemptId] of Object.entries(reverseIndex)) {
        if (attemptId === event.attemptId) {
          recordAbandonSuccess(event.attemptId, qvId, event.userId);
          return;
        }
      }
      // The receiving tab does not know this attempt id yet (no
      // hydration). Drop the event gracefully — the source tab
      // already updated its own state.
      return;
    }

    case 'complete': {
      // T-4.15.7 + T-4.15.16 — Story 4.15 completion reconciliation.
      // The receiving tab revalidates the detail + answers + result
      // caches for the affected attempt, and every paginated history
      // list page for the session. The receiving tab does NOT call
      // `completeAttempt` again (the cross-tab channel is read-only)
      // and does NOT auto-navigate to the result page (navigation is
      // user-driven per the Story 4.15 §Cross-Tab rule).
      //
      // T-4.15.16 extension: we ALSO converge the runner's local
      // status to `completed` via the new `recordCompletionSuccess`
      // store action so the second tab's picker stops accepting
      // input. The reverse index lookup mirrors the `abandon` branch;
      // if the receiving tab does not know this attempt id yet the
      // reverse index has no entry and we drop the convergence
      // (the next user-driven navigation will hydrate the entry).
      void mutate(ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId));
      void mutate(ATTEMPT_CACHE_KEYS.answers(event.attemptId, event.userId));
      void mutate(
        ATTEMPT_RESULT_CACHE_KEYS.result(event.attemptId, event.userId),
      );
      // Invalidate every paginated history list page for the
      // session. The pattern matches `useCompleteAttempt`'s
      // success branch.
      void mutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === 'attempts' &&
          key[1] === 'history' &&
          key[2] === event.userId,
        undefined,
        { revalidate: true },
      );
      // History-stats cache (placeholder for the future stats
      // hook — invalidating an absent key is a no-op).
      void mutate(['attempts', 'history', 'stats', event.userId]);
      // Converge the runner's status to `completed`. The snapshot
      // is intentionally minimal — the source tab wrote the score
      // already; the receiving tab fetches the detailed result via
      // the result cache invalidation above when the user navigates
      // there.
      const reverseIndex = useAttemptsStore.getState().attemptsByQuizVersionId;
      for (const [qvId, attemptId] of Object.entries(reverseIndex)) {
        if (attemptId === event.attemptId) {
          recordCompletionSuccess(event.attemptId, qvId, event.userId, {
            scorePercent: null,
            correctCount: null,
            xpEarned: 0,
            finishedAt: '',
          });
          return;
        }
      }
      // The receiving tab does not know this attempt id yet (no
      // hydration). Drop the convergence gracefully — the cache
      // invalidations above already refreshed the data layer.
      return;
    }
  }
}