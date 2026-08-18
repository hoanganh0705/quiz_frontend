

import { isApiError, type OptimisticToggleError } from '@/lib/api';
import type { BookmarkMutationOutcome, BookmarkMutationOutcomeKind } from '@/features/bookmarks/hooks/use-bookmark-quiz';
import type { UnbookmarkMutationOutcome } from '@/features/bookmarks/hooks/use-unbookmark-quiz';

export type BookmarkMutationErrorStateKind =

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

kind: BookmarkMutationErrorStateKind;

title: string | null;

body: string | null;

retryable: boolean;

invalidateCache: boolean;
}

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

function looksLikeSessionExpired(
cause: unknown,
errorKind: 'unknown',
): boolean {
if (errorKind !== 'unknown') return false;
if (!isApiError(cause)) return false;
return cause.status === 401 || cause.status === 0;
}

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

export type { BookmarkMutationOutcomeKind };
