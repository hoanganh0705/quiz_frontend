'use client';

/**
 * `SessionList` — renders the active-sessions list with row-level
 * error handling and an empty state for the "no other sessions"
 * case.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T14.
 *
 * ## Composition contract
 *
 * The list is the parent of `<SessionRow />` (T13). It owns:
 *
 *   - The list rendering keyed by `sessionId` (defensive — even
 *     though the backend orders by `lastActiveAt desc`, the
 *     `key={session.sessionId}` invariant is what gives the row
 *     its React identity, not its position).
 *   - The "no other active sessions" empty state — surfaced when
 *     the only row is the current session.
 *   - The list-level "Revoke all others" CTA — hidden when the
 *     empty state is showing (nothing to revoke).
 *   - The list-level loading skeleton (T15) and the list-level
 *     error banner.
 *
 * ## Per-row error isolation (US-2.8.2 contract)
 *
 * The Epic 2.8 spec says "the list-level error renders an inline
 * retry banner that does NOT tear down successful rows". This is
 * the dashboard/list partial-failure contract (US-2.8.1) applied
 * to the list: a successful revalidation followed by a failed
 * revalidation keeps the previously rendered rows visible until
 * the next successful load — the row keys are stable, the list
 * does not flash empty.
 *
 * Per-row mutation errors are handled inside `SessionRow` via the
 * `pending` flag passed by `useRevokeSession` (T17); the list
 * itself does not own that state.
 *
 * ## Confirmation flow
 *
 * The "Revoke all others" CTA is presented inline in this ticket
 * (T14) but does NOT wire the confirmation modal yet — that
 * lands in T19 (wiring the `useRevokeOtherSessions` hook which
 * owns the confirmation discipline via `requiresConfirmation`).
 *
 * @see SessionRow (2.8.T13)
 * @see SessionListSkeleton (2.8.T15)
 */

import { memo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/loading-states/ErrorState';
import { SessionRowWithAction } from '@/features/auth/components/session-row-with-action';
import { SessionListSkeleton } from '@/features/auth/components/session-list-skeleton';
import { COPY_KEYS, resolveCopy } from '@/features/auth/copy/security-copy';
import type { ActiveSessionsStatus } from '@/features/auth/hooks/use-active-sessions';
import type { SessionListItemDto } from '@/lib/api';

export interface SessionListProps {
  sessions: SessionListItemDto[];
  status: ActiveSessionsStatus;
  error: { code?: string; message?: string } | null;
  /**
   * List-level retry. Wired to `useActiveSessions.revalidate` by
   * the parent (T16).
   */
  onRevalidate: () => Promise<void> | void;
  /**
   * List-level mutation primitives. Each row needs these to
   * wire its own `useRevokeSession` instance (T19).
   */
  listOps: {
    mutate: (updater: (current: SessionListItemDto[]) => SessionListItemDto[]) => void;
    revalidate: () => Promise<void>;
  };
  /**
   * "Revoke all others" CTA callback. Confirmation discipline is
   * owned by `useRevokeOtherSessions` (T18); this prop receives
   * the confirmed call from the modal wiring in T19.
   */
  onRevokeOthers?: () => void;
  /**
   * Pending state for the "Revoke all others" CTA. Disabled while
   * the others-revoke is in flight so the user cannot double-fire.
   */
  revokeOthersPending?: boolean;
}

/**
 * Empty-state predicate: only the current session is present.
 *
 * The list-level empty state is *not* "no rows" (which would be
 * impossible — the current session is always present). It is
 * "the only row is the current session", which is the meaningful
 * state the user needs to see ("You're only signed in here").
 */
function isOnlyCurrentSession(sessions: SessionListItemDto[]): boolean {
  return (
    sessions.length === 1 && sessions[0]?.isCurrentSession === true
  );
}

function SessionListInner({
  sessions,
  status,
  error,
  onRevalidate,
  listOps,
  onRevokeOthers,
  revokeOthersPending = false,
}: SessionListProps) {
  // Loading branch — row-level skeletons (US-2.8.2 contract:
  // "Loading renders row-level skeletons, not a single spinner").
  if (status === 'loading') {
    return (
      <Card data-testid='session-list' data-status='loading'>
        <CardHeader>
          <CardTitle>{resolveCopy(COPY_KEYS.sessionList.title)}</CardTitle>
          <CardDescription>
            {resolveCopy(COPY_KEYS.sessionList.subtitle)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionListSkeleton rowCount={3} />
        </CardContent>
      </Card>
    );
  }

  // Error branch — inline banner with Retry button. Crucially,
  // we still render the previously-known rows under the banner
  // when we have any (US-2.8.1 partial-failure contract).
  if (status === 'error') {
    const inlineMessage = error?.message
      ? `${resolveCopy(COPY_KEYS.sessionList.error.listFailed.body)} (${error.message})`
      : resolveCopy(COPY_KEYS.sessionList.error.listFailed.body);

    return (
      <Card data-testid='session-list' data-status='error'>
        <CardHeader>
          <CardTitle>{resolveCopy(COPY_KEYS.sessionList.title)}</CardTitle>
          <CardDescription>
            {resolveCopy(COPY_KEYS.sessionList.subtitle)}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <InlineError
            message={`${resolveCopy(COPY_KEYS.sessionList.error.listFailed.title)} — ${inlineMessage}`}
          />
          <div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void onRevalidate();
              }}
              data-testid='session-list-retry-button'
            >
              Retry
            </Button>
          </div>
          {/* If we previously rendered rows, keep them visible
              while the banner is up — that's the partial-failure
              contract (US-2.8.1). */}
          {sessions.length > 0 && (
            <ul data-testid='session-list-rows-partial'>
              {sessions.map((s) => (
                <li key={s.sessionId}>
                  <SessionRowWithAction session={s} listOps={listOps} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  // Success branch.
  const onlyCurrent = isOnlyCurrentSession(sessions);
  const otherCount = sessions.length - (onlyCurrent ? 1 : 0);

  return (
    <Card data-testid='session-list' data-status='success'>
      <CardHeader className='flex-row items-start justify-between gap-4 space-y-0'>
        <div>
          <CardTitle>{resolveCopy(COPY_KEYS.sessionList.title)}</CardTitle>
          <CardDescription>
            {resolveCopy(COPY_KEYS.sessionList.subtitle)}
          </CardDescription>
        </div>
        {otherCount > 0 && onRevokeOthers && (
          <Button
            variant='outline'
            size='sm'
            onClick={onRevokeOthers}
            disabled={revokeOthersPending}
            aria-busy={revokeOthersPending}
            data-testid='session-list-revoke-others-button'
          >
            {revokeOthersPending
              ? 'Revoking…'
              : 'Revoke other sessions'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {onlyCurrent ? (
          <p
            className='text-sm text-foreground-secondary py-6'
            data-testid='session-list-empty-state'
          >
            {resolveCopy(COPY_KEYS.sessionList.emptyState)}
          </p>
        ) : (
          <ul data-testid='session-list-rows'>
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <SessionRowWithAction session={s} listOps={listOps} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export const SessionList = memo(SessionListInner);
