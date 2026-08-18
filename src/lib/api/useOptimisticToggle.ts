

'use client';

import { useCallback, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

export type OptimisticToggleSWRKey =
| string
  | readonly [unknown, ...unknown[]]
  | Record<PropertyKey, unknown>
  | null
  | undefined
  | false;

export type OptimisticToggleErrorKind =
| 'http_429'
  | 'http_404'
  | 'http_4xx'
  | 'http_5xx'
  | 'unknown';

export interface OptimisticToggleError {

kind: OptimisticToggleErrorKind;

cause: ApiError | unknown;
}

export type OptimisticToggleStatus = 'idle' | 'pending' | 'success' | 'reverted';

export interface UseOptimisticToggleParams<ToggleArgs extends unknown[]> {

currentValue: boolean;

toggle: (...args: ToggleArgs) => Promise<unknown>;

cooldownMs?: number;

keysToInvalidate: readonly OptimisticToggleSWRKey[];
}

export interface UseOptimisticToggleResult<ToggleArgs extends unknown[]> {
status: OptimisticToggleStatus;

lastError: OptimisticToggleError | null;

toggle: (...args: ToggleArgs) => Promise<void>;
}

export function classifyOptimisticToggleError(
cause: unknown,
): OptimisticToggleError {
if (isApiError(cause)) {
const status = cause.status;
if (status === 429) {
return { kind: 'http_429', cause };
    }
if (status === 404) {
return { kind: 'http_404', cause };
    }
if (status >= 500) {
return { kind: 'http_5xx', cause };
    }
return { kind: 'http_4xx', cause };
  }
return { kind: 'unknown', cause };
}

export function useOptimisticToggle<ToggleArgs extends unknown[]>(
params: UseOptimisticToggleParams<ToggleArgs>,
): UseOptimisticToggleResult<ToggleArgs> {
const { toggle, cooldownMs = 500, keysToInvalidate } = params;

const [status, setStatus] = useState<OptimisticToggleStatus>('idle');
const [lastError, setLastError] = useState<OptimisticToggleError | null>(null);

const lastInvocationRef = useRef<number>(0);

const run = useCallback(
async (...args: ToggleArgs): Promise<void> => {
const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
if (now - lastInvocationRef.current < cooldownMs) {

return;
      }
lastInvocationRef.current = now;

setStatus('pending');
setLastError(null);

try {
await toggle(...args);

await Promise.all(
keysToInvalidate.map((key) =>
globalMutate(key, undefined, { revalidate: true }),
          ),
        );
setStatus('success');
setLastError(null);
      } catch (cause: unknown) {
const classification = classifyOptimisticToggleError(cause);

if (classification.kind === 'http_404') {
await Promise.all(
keysToInvalidate.map((key) =>
globalMutate(key, undefined, { revalidate: true }),
            ),
          );
        }

setStatus('reverted');
setLastError(classification);
        // The cooldown is NOT lifted on rejection (B1 AC #5) —
        // lastInvocationRef.current stays at `now`, so the user must
        // wait the full window before retrying.
      }
    },
[toggle, cooldownMs, keysToInvalidate],
  );

return {
status,
lastError,
toggle: run,
  };
}