'use client';

/**
 * `useAttemptCrossTabSync` — user-scoped attempt cross-tab cache
 * reconciliation adapter.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.8.
 *
 * ## Purpose
 *
 * Subscribes to the existing `attempts/changed` BroadcastChannel
 * (TKT-4.1.B2) and reconciles the Story 4.14 SWR caches for any
 * remote-tab event the source tab broadcasts. The adapter is the
 * bridge between the Story 4.1 cross-tab envelope and the Story
 * 4.14 runner cache keys (`ATTEMPT_CACHE_KEYS`).
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
 *   - `kind: 'complete'`  → reserved for Story 4.15; the adapter
 *                            revalidates only — no completion
 *                            mutation or result-page transition is
 *                            implemented here.
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
 * The `complete` kind is reserved for the Story 4.15 handoff. The
 * adapter revalidates the detail cache only; no result page, no
 * completion mutation.
 */

import { useEffect } from 'react';
import { mutate } from 'swr';

import {
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptsChangedEvent,
} from '@/lib/api/core/attempts-broadcast-channel';

import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
  recordAbandonSuccess,
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

  const { bootstrapState, currentUser } = useAuthBootstrap();

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
      // Reserved for Story 4.15. Revalidate the detail cache so
      // the future completion screen renders fresh server data.
      void mutate(ATTEMPT_CACHE_KEYS.detail(event.attemptId, event.userId));
      return;
    }
  }
}