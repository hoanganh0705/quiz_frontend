'use client';

/**
 * `features/admin/hooks/useAdminRequestId.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.D2.
 *
 * Captures the latest `extensions.requestId` and `X-Correlation-Id`
 * from any admin mutation so the corresponding surface can render a
 * `RequestIdBanner` for the admin to correlate the failure with
 * backend tooling.
 *
 * The store is keyed by `mutationId` so concurrent mutations do not
 * clobber each other. A typical consumer hands each destructive
 * mutation a unique id (e.g. `useId()` or a deterministic slug like
 * `'ranking-recalculate'`) and the same id to the banner's
 * `useAdminRequestId` so the banner reads the entry it wrote.
 *
 * Implementation:
 *
 *   - Backed by a small zustand store (one entry per mutationId) so
 *     any surface can read and write the latest error without manual
 *     prop drilling.
 *   - The store is intentionally narrow: it only tracks the latest
 *     requestId per mutationId. It does not aggregate an audit log
 *     (that lives in the backend, not the client).
 *
 * Mutation ids are simple opaque strings. The store does not enforce
 * any naming convention; consumers pick a stable id per mutation site.
 */

import { useCallback } from 'react';
import { create } from 'zustand';

import { ApiError } from '@/lib/api/core/ApiError';

export interface AdminRequestIdEntry {
  requestId: string;
  correlationId: string;
  error: ApiError | null;
  capturedAt: number;
}

export interface AdminRequestIdStore {
  entries: Record<string, AdminRequestIdEntry>;

  setFromError: (mutationId: string, error: ApiError | null) => void;

  clear: (mutationId: string) => void;
}

export const useAdminRequestIdStore = create<AdminRequestIdStore>((set) => ({
  entries: {},
  setFromError: (mutationId, error) => {
    set((state) => {
      const next = { ...state.entries };
      if (error === null) {
        delete next[mutationId];
      } else {
        next[mutationId] = {
          requestId: error.requestId,
          correlationId: error.correlationId,
          error,
          capturedAt: Date.now(),
        };
      }
      return { entries: next };
    });
  },
  clear: (mutationId) => {
    set((state) => {
      if (!(mutationId in state.entries)) return state;
      const next = { ...state.entries };
      delete next[mutationId];
      return { entries: next };
    });
  },
}));

export interface UseAdminRequestIdResult {
  requestId: string | null;
  correlationId: string | null;
  error: ApiError | null;
  setFromError: (error: ApiError | null) => void;
}

export function useAdminRequestId(mutationId: string): UseAdminRequestIdResult {
  const entry = useAdminRequestIdStore((state) => state.entries[mutationId]);
  const setFromErrorGlobal = useAdminRequestIdStore(
    (state) => state.setFromError,
  );

  const setFromError = useCallback(
    (error: ApiError | null) => {
      setFromErrorGlobal(mutationId, error);
    },
    [mutationId, setFromErrorGlobal],
  );

  return {
    requestId: entry?.requestId ?? null,
    correlationId: entry?.correlationId ?? null,
    error: entry?.error ?? null,
    setFromError,
  };
}
