/**
 * `comment-moderation-stable-codes-mock.ts` — shared mock factory for
 * `comment-moderation-stable-codes.spec.tsx`.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.H2.
 *
 * ## Why this lives in its own module
 *
 * Vitest hoists `vi.mock` factory calls above imports. To reference
 * the factory from a `vi.mock` we have to either:
 *
 *   (a) define it inside the factory call (which loses shared state), or
 *   (b) wrap it in `vi.hoisted` so it is available at hoist time.
 *
 * The factories live in a sibling module so the state (current
 * setter) is shared across multiple hook instances within the same
 * render. The spec uses `setResolveOutcome` / `setHideOutcome` /
 * `setRestoreOutcome` to drive React `useState` from outside the
 * React tree — that's how the dialog re-renders with the typed-code
 * notice after a click.
 */

import { useState } from 'react';

import type { ApiError } from '@/lib/api';

// ─── Outcome shapes (mirror the production hook) ────────────────────────────

export type ResolveOutcome =
  | { kind: 'success' | 'forbidden' | 'not-found' | 'already-resolved' | 'reverted'; cause?: ApiError | null }
  | null;

export type HideOutcome =
  | { kind: 'success' | 'forbidden' | 'not-found' | 'already-hidden' | 'reverted'; cause?: ApiError | null }
  | null;

export type RestoreOutcome =
  | { kind: 'success' | 'forbidden' | 'not-found' | 'not-hidden' | 'reverted'; cause?: ApiError | null }
  | null;

// ─── Setters (driven by the spec, called by the mock on re-render) ──────────

let resolveSetOutcome: ((next: ResolveOutcome) => void) | null = null;
let hideSetOutcome: ((next: HideOutcome) => void) | null = null;
let restoreSetOutcome: ((next: RestoreOutcome) => void) | null = null;

export function setResolveOutcome(next: ResolveOutcome): void {
  resolveSetOutcome?.(next);
}

export function setHideOutcome(next: HideOutcome): void {
  hideSetOutcome?.(next);
}

export function setRestoreOutcome(next: RestoreOutcome): void {
  restoreSetOutcome?.(next);
}

export function resetMockHarness(): void {
  resolveSetOutcome = null;
  hideSetOutcome = null;
  restoreSetOutcome = null;
}

// ─── Hook factories ─────────────────────────────────────────────────────────
//
// Each factory returns a hook-shaped function. The hook uses
// `useState` to drive `lastOutcome`, which is what makes
// `lastOutcome`-driven re-renders happen in the dialog. The setters
// are latched the first time the hook is called so the spec can
// drive the outcome through `setResolveOutcome` etc.
//
// The `resolve` / `hide` / `restore` functions resolve successfully
// (returning `undefined`) — the spec drives the outcome directly
// via the matching setter to simulate the post-settle state. The
// real hook throws on error; we mirror that by always resolving
// because the dialog renders the friendly notice from
// `lastOutcome` (not from a thrown error).

export function useResolveCommentReportMock(): {
  resolve: (reportId: string, action: string) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  lastOutcome: ResolveOutcome;
  reset: () => void;
  audit: {
    beforeReportId: string | null;
    beforeAction: string | null;
    afterReportId: string | null;
    afterPayload: unknown;
  };
} {
  const [lastOutcome, setLastOutcome] = useState<ResolveOutcome>(null);
  resolveSetOutcome = setLastOutcome;
  return {
    resolve: async (_reportId: string, _action: string): Promise<void> => {
      // The spec drives the outcome via `setResolveOutcome`. The
      // click handler invokes `mutate()` synchronously; a
      // never-resolving promise would deadlock, so this returns
      // immediately.
    },
    isPending: false,
    error: null,
    lastOutcome,
    reset: () => setLastOutcome(null),
    audit: {
      beforeReportId: null,
      beforeAction: null,
      afterReportId: null,
      afterPayload: null,
    },
  };
}

export function useHideCommentMock(): {
  hide: (commentId: string) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  lastOutcome: HideOutcome;
  reset: () => void;
  audit: { beforeCommentId: string | null; afterCommentId: string | null };
} {
  const [lastOutcome, setLastOutcome] = useState<HideOutcome>(null);
  hideSetOutcome = setLastOutcome;
  return {
    hide: async (_commentId: string): Promise<void> => {
      // See the note on `useResolveCommentReportMock.resolve`.
    },
    isPending: false,
    error: null,
    lastOutcome,
    reset: () => setLastOutcome(null),
    audit: { beforeCommentId: null, afterCommentId: null },
  };
}

export function useRestoreCommentMock(): {
  restore: (commentId: string) => Promise<void>;
  isPending: boolean;
  error: ApiError | null;
  lastOutcome: RestoreOutcome;
  reset: () => void;
  audit: { beforeCommentId: string | null; afterCommentId: string | null };
} {
  const [lastOutcome, setLastOutcome] = useState<RestoreOutcome>(null);
  restoreSetOutcome = setLastOutcome;
  return {
    restore: async (_commentId: string): Promise<void> => {
      // See the note on `useResolveCommentReportMock.resolve`.
    },
    isPending: false,
    error: null,
    lastOutcome,
    reset: () => setLastOutcome(null),
    audit: { beforeCommentId: null, afterCommentId: null },
  };
}
