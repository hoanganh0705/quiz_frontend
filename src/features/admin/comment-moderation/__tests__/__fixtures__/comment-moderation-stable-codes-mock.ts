

import { useState } from 'react';

import type { ApiError } from '@/lib/api';

export type ResolveOutcome =
| { kind: 'success' | 'forbidden' | 'not-found' | 'already-resolved' | 'reverted'; cause?: ApiError | null }
  | null;

export type HideOutcome =
| { kind: 'success' | 'forbidden' | 'not-found' | 'already-hidden' | 'reverted'; cause?: ApiError | null }
  | null;

export type RestoreOutcome =
| { kind: 'success' | 'forbidden' | 'not-found' | 'not-hidden' | 'reverted'; cause?: ApiError | null }
  | null;

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
