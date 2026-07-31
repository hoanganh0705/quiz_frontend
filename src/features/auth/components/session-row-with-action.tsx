'use client';

/**
 * `SessionRowWithAction` — wires `<SessionRow />` to the
 * per-row `useRevokeSession` hook.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T19 (wiring).
 *
 * ## Why a separate component
 *
 * T13 (SessionRow) is the *pure presentation* unit — it renders
 * `SessionListItemDto` and accepts a callback. T17 (useRevokeSession)
 * is the *behavior* unit. This wrapper is the bridge that lives
 * in the list, owns the per-row hook instance, and passes the
 * resolved `pending` flag into the row.
 *
 * Splitting presentation from behavior keeps both unit-testable:
 *
 *   - `<SessionRow />` snapshot tests don't need to mock the SDK.
 *   - `useRevokeSession` unit tests don't need to render JSX.
 *
 * ## Row-isolated pending state
 *
 * Each row owns its own hook instance. The hook's `pending` flag
 * is fed to `<SessionRow pending />` so only THIS row's button is
 * disabled and shows the spinner text. Sibling rows keep their
 * independent state.
 *
 * ## Error banner
 *
 * The hook's `error.classification` is surfaced below the row
 * (NOT inside it — the row's vertical slot is reserved for the
 * revoke button). The banner copy is sourced from
 * `security-copy.ts` and routes through `mapSessionError`'s
 * classification:
 *
 *   - `retryable`  → `sessionList.error.revokeFailed`
 *   - `conflict`   → `sessionList.error.conflict`
 *   - `auth_terminal` → not surfaced here (the shared refresh
 *     policy owns this; the row stays visible while the user
 *     is routed to `/login`)
 *   - `current_revoked` → unreachable here because the row's
 *     button is hidden on the current session; if it does fire
 *     (stale row), the hook routes to `/login` and the row
 *     disappears
 */

import { memo } from 'react';
import { SessionRow } from '@/features/auth/components/session-row';
import { useRevokeSession } from '@/features/auth/hooks/use-revoke-session';
import {
  COPY_KEYS,
  resolveCopy,
} from '@/features/auth/copy/security-copy';
import {
  isSessionConflict,
  isSessionErrorRetryable,
} from '@/features/auth/errors/session-error-mapper';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/loading-states/ErrorState';
import type { SessionListItemDto } from '@/lib/api';

export interface SessionRowWithActionProps {
  session: SessionListItemDto;
  listOps: {
    mutate: (updater: (current: SessionListItemDto[]) => SessionListItemDto[]) => void;
    revalidate: () => Promise<void>;
  };
}

function SessionRowWithActionInner({
  session,
  listOps,
}: SessionRowWithActionProps) {
  const { revoke, status, error } = useRevokeSession({
    sessionId: session.sessionId,
    isCurrentSession: session.isCurrentSession,
    session,
    listOps,
  });

  const pending = status === 'pending';
  const showBanner =
    status === 'error' &&
    error !== null &&
    (isSessionErrorRetryable(error.classification) ||
      isSessionConflict(error.classification));

  const bannerCopy = (() => {
    if (!error) return null;
    if (isSessionErrorRetryable(error.classification)) {
      return {
        title: COPY_KEYS.sessionList.error.revokeFailed.title,
        body: COPY_KEYS.sessionList.error.revokeFailed.body,
      };
    }
    if (isSessionConflict(error.classification)) {
      return {
        title: COPY_KEYS.sessionList.error.conflict.title,
        body: COPY_KEYS.sessionList.error.conflict.body,
      };
    }
    return null;
  })();

  return (
    <div
      data-testid='session-row-with-action'
      data-current={session.isCurrentSession}
    >
      <SessionRow
        session={session}
        pending={pending}
        onRevoke={session.isCurrentSession ? undefined : revoke}
      />
      {showBanner && bannerCopy && (
        <div className='pl-0 pb-3'>
          <InlineError
            message={`${resolveCopy(bannerCopy.title)} — ${resolveCopy(bannerCopy.body)}`}
          />
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              void revoke();
            }}
            disabled={pending}
            data-testid='session-row-retry-button'
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export const SessionRowWithAction = memo(SessionRowWithActionInner);
