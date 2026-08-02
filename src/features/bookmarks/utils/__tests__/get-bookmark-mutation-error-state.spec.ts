/**
 * `get-bookmark-mutation-error-state.spec.ts` — locks the mapping
 * from `OptimisticToggleError | BookmarkMutationOutcome` to the
 * user-facing state the slot consumes.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.C3.
 *
 * Eight cases per the ticket AC #1–6:
 *
 *   (a) `no_collection` outcome maps to the setup-prompt state.
 *   (b) `http_404` maps to "Your collection is unavailable" and
 *       requests cache invalidation.
 *   (c) `http_429` maps to "Slow down — try again in a minute".
 *   (d) `http_5xx` exposes retry; `unknown` (network failure)
 *       also exposes retry.
 *   (e) Failed authentication refresh (401-after-refresh) maps to
 *       the existing session-expired surface rather than bookmark
 *       copy.
 *   (f) 409 does not map to an error state (already success).
 *   (g) Unknown causes fall back to the `generic` kind.
 *   (h) Type-level exhaustiveness — `BookmarkMutationErrorStateKind`
 *       exhaustively covers the documented branches.
 *
 * Test-environment notes: vitest's `node` project picks up files
 * under `src/features/bookmarks/utils/__tests__/`. The mapper is a
 * pure function with no React rendering, so jsdom is not required.
 */

import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api';

import { getBookmarkMutationErrorState } from '@/features/bookmarks/utils/get-bookmark-mutation-error-state';

function makeApiError(status: number, code: string): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: {
        type: 'about:blank',
        title: `Error ${status}`,
        status,
        code,
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

// ---------------------------------------------------------------------------
// (a) no_collection outcome
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — no_collection outcome', () => {
  it('(a) maps no_collection to the setup-prompt state with no inline copy', () => {
    const state = getBookmarkMutationErrorState(null, {
      kind: 'no_collection',
      cause: null,
    });
    expect(state.kind).toBe('setup-prompt');
    expect(state.title).toBeNull();
    expect(state.body).toBeNull();
    expect(state.retryable).toBe(false);
    expect(state.invalidateCache).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (b) http_404 → collection-unavailable + cache invalidation
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — http_404', () => {
  it('(b) maps 404 to collection-unavailable AND requests cache invalidation', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'http_404', cause: makeApiError(404, 'BOOKMARK_NOT_FOUND') },
      null,
    );
    expect(state.kind).toBe('collection-unavailable');
    expect(state.title).toBe('Collection unavailable');
    expect(state.body).toBe(
      'Your collection is unavailable. Please refresh to sync your bookmarks.',
    );
    expect(state.retryable).toBe(false);
    expect(state.invalidateCache).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (c) http_429 → rate-limited
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — http_429', () => {
  it('(c) maps 429 to the rate-limited state with "Slow down" copy', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'http_429', cause: makeApiError(429, 'GLOBAL_RATE_LIMITED') },
      null,
    );
    expect(state.kind).toBe('rate-limited');
    expect(state.title).toBe('Slow down');
    expect(state.body).toBe('Slow down — try again in a minute.');
    expect(state.retryable).toBe(false);
    expect(state.invalidateCache).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (d) http_5xx + unknown (network) → retryable
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — retryable', () => {
  it('(d1) maps http_5xx to retryable', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'http_5xx', cause: makeApiError(500, 'INTERNAL_ERROR') },
      null,
    );
    expect(state.kind).toBe('retryable');
    expect(state.retryable).toBe(true);
    expect(state.title).toBe("Couldn't update bookmark");
    expect(state.body).toBe(
      "We couldn't update your bookmark. Please try again.",
    );
  });

  it('(d2) maps unknown (TypeError) to retryable', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'unknown', cause: new TypeError('network down') },
      null,
    );
    expect(state.kind).toBe('retryable');
    expect(state.retryable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (e) 401 / refresh-failure → session-expired
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — session-expired', () => {
  it('(e1) maps ApiError(401) classified as unknown to the session-expired state', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'unknown', cause: makeApiError(401, 'AUTH_REFRESH_FAILED') },
      null,
    );
    expect(state.kind).toBe('session-expired');
    expect(state.title).toBe('Session expired');
    expect(state.body).toBe(
      'Your session has expired. Please sign in again to continue.',
    );
    expect(state.retryable).toBe(false);
  });

  it('(e2) maps ApiError(0) (transport-level failure on the refresh path) to session-expired', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'unknown', cause: makeApiError(0, 'AUTH_TRANSPORT') },
      null,
    );
    expect(state.kind).toBe('session-expired');
  });

  it('(e3) a non-ApiError "unknown" cause (e.g. plain TypeError) does NOT collapse to session-expired', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'unknown', cause: new TypeError('boom') },
      null,
    );
    expect(state.kind).toBe('retryable');
  });
});

// ---------------------------------------------------------------------------
// (f) 409 reconciliation — never surfaces an error
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — 409 / already_*', () => {
  it('(f1) 409 surfaced as a 4xx error with no lastOutcome maps to generic (the primitive never sees 409 due to C1 reconciliation)', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'http_4xx', cause: makeApiError(409, 'BOOKMARK_CONFLICT') },
      null,
    );
    expect(state.kind).toBe('generic');
  });

  it('(f2) already_bookmarked outcome with null error → ok (no surface)', () => {
    const state = getBookmarkMutationErrorState(null, {
      kind: 'already_bookmarked',
      cause: null,
    });
    expect(state.kind).toBe('ok');
    expect(state.title).toBeNull();
    expect(state.body).toBeNull();
  });

  it('(f3) already_unbookmarked outcome → ok', () => {
    const state = getBookmarkMutationErrorState(null, {
      kind: 'already_unbookmarked',
      cause: null,
    });
    expect(state.kind).toBe('ok');
  });

  it('(f4) success outcome → ok', () => {
    const state = getBookmarkMutationErrorState(null, {
      kind: 'success',
      cause: null,
    });
    expect(state.kind).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// (g) Unknown causes fall back to the generic kind
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — fallbacks', () => {
  it('(g1) http_4xx (non-401) maps to generic', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'http_4xx', cause: makeApiError(422, 'VALIDATION_ERROR') },
      null,
    );
    expect(state.kind).toBe('generic');
  });

  it('(g2) unauthenticated outcome → ok (the slot does not render an error)', () => {
    const state = getBookmarkMutationErrorState(null, {
      kind: 'unauthenticated',
      cause: null,
    });
    expect(state.kind).toBe('ok');
  });

  it('(g3) reverted outcome with http_5xx error → retryable', () => {
    const state = getBookmarkMutationErrorState(
      { kind: 'http_5xx', cause: makeApiError(503, 'UNAVAILABLE') },
      { kind: 'reverted', cause: null },
    );
    expect(state.kind).toBe('retryable');
    expect(state.retryable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (h) Type-level exhaustiveness — runtime check
// ---------------------------------------------------------------------------

describe('getBookmarkMutationErrorState — exhaustiveness', () => {
  it('(h) every documented OptimisticToggleErrorKind maps to a defined state', () => {
    const kinds = [
      'http_429',
      'http_404',
      'http_4xx',
      'http_5xx',
      'unknown',
    ] as const;
    for (const kind of kinds) {
      const state = getBookmarkMutationErrorState(
        { kind, cause: null },
        null,
      );
      expect(state.kind).not.toBe('ok');
      // The slot (D4) must have a renderable surface to show.
      expect(typeof state.kind).toBe('string');
    }
  });
});