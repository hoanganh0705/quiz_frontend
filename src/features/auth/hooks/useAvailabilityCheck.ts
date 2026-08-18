

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
mapAvailabilityError,
type AvailabilityStatus,
} from '@/features/auth/errors/register-error-mapper';

export interface UseAvailabilityCheckInput<TResult> {

value: string;

enabled?: boolean;

isWellFormed: (value: string) => boolean;

debounceMs?: number;

check: (value: string) => Promise<TResult>;

isAvailable: (result: TResult) => boolean;
}

export interface UseAvailabilityCheckResult {
status: AvailabilityStatus;

debouncedValue: string;
}

const DEFAULT_DEBOUNCE_MS = 350;

export function useAvailabilityCheck<TResult>({
value,
enabled = true,
isWellFormed,
debounceMs = DEFAULT_DEBOUNCE_MS,
check,
isAvailable,
}: UseAvailabilityCheckInput<TResult>): UseAvailabilityCheckResult {
const [status, setStatus] = useState<AvailabilityStatus>('idle');
const [debouncedValue, setDebouncedValue] = useState<string>('');

const tokenRef = useRef(0);

const controllerRef = useRef<AbortController | null>(null);

const shouldFire = useMemo<boolean>(
() => enabled && isWellFormed(value),
[enabled, value, isWellFormed],
  );

useEffect(() => {
if (!shouldFire) {
if (controllerRef.current) controllerRef.current.abort();
controllerRef.current = null;

setDebouncedValue('');
setStatus('idle');

return;
    }

const token = ++tokenRef.current;

const timer = window.setTimeout(() => {
const controller = new AbortController();
controllerRef.current = controller;

setDebouncedValue(value);
setStatus('checking');

check(value)
        .then((result) => {
if (tokenRef.current !== token) return;
if (controller.signal.aborted) return;
setStatus(isAvailable(result) ? 'available' : 'unavailable');
        })
        .catch((err: unknown) => {
if (tokenRef.current !== token) return;
if (controller.signal.aborted) return;
setStatus(mapAvailabilityError(err));
        })
        .finally(() => {
if (controllerRef.current === controller) {
controllerRef.current = null;
          }
        });
    }, debounceMs);

return () => {
window.clearTimeout(timer);
if (controllerRef.current) controllerRef.current.abort();
controllerRef.current = null;
    };
  }, [value, shouldFire, debounceMs, check, isAvailable]);

return { status, debouncedValue };
}