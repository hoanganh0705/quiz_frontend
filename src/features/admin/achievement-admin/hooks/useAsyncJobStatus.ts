'use client';

import { useMemo } from 'react';

import {
REEVAL_LIFECYCLE_IDLE,
type ReevalLifecycle,
} from '../achievement-admin-types';

import type { ApiError } from '@/lib/api/core/ApiError';

export interface UseAsyncJobStatusResult {

readonly status: ReevalLifecycle;

readonly isPolling: boolean;

readonly error: ApiError | null;
}

export function useAsyncJobStatus(jobId: string | null): UseAsyncJobStatusResult {

return useMemo<UseAsyncJobStatusResult>(
() => ({
status: REEVAL_LIFECYCLE_IDLE,
isPolling: false,
error: null,
    }),

[],
  );
}
