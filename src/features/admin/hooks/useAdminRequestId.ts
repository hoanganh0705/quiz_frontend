'use client';

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
