

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, isApiError } from '@/lib/api';

const BACKOFF_DELAYS_MS = [250, 500, 1000] as const;

const DEFAULT_REVALIDATE_ON_FOCUS = false;

const inFlightByKey = new Map<string, Promise<unknown>>();

export interface SingleFetcher<T> {
(args: { signal: AbortSignal }): Promise<T>;
}

export interface UseSingleWithRetryParams<T> {

key: readonly unknown[] | null;

fetcher: SingleFetcher<T>;

backoffDelaysMs?: readonly number[];

revalidateOnFocus?: boolean;

sleep?: (ms: number) => Promise<void>;
}

export interface UseSingleWithRetryResult<T> {
data: T | undefined;
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;
isRetrying: boolean;
}

function coerceToApiError(err: unknown): ApiError {
if (isApiError(err)) return err;
if (
typeof err === 'object' &&
err !== null &&
('isAxiosError' in err || (err as { response?: unknown }).response)
  ) {
return ApiError.fromAxios(
err as Parameters<typeof ApiError.fromAxios>[0],
    );
  }
throw err;
}

function defaultSleep(ms: number): Promise<void> {
return new Promise<void>((resolve) => {
setTimeout(resolve, ms);
  });
}

export function useSingleWithRetry<T>(
params: UseSingleWithRetryParams<T>,
): UseSingleWithRetryResult<T> {
const {
key,
fetcher,
backoffDelaysMs = BACKOFF_DELAYS_MS,

revalidateOnFocus: _revalidateOnFocus = DEFAULT_REVALIDATE_ON_FOCUS,
sleep = defaultSleep,
  } = params;

const [data, setData] = useState<T | undefined>(undefined);
const [error, setError] = useState<ApiError | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(key !== null);
const [isRetrying, setIsRetrying] = useState<boolean>(false);

const epochRef = useRef<number>(0);
const abortRef = useRef<AbortController | null>(null);
const mountedRef = useRef<boolean>(true);
const keyRef = useRef<readonly unknown[] | null>(key);

const runOnce = useCallback(
async (signal: AbortSignal): Promise<T> => {
return await fetcher({ signal });
    },
[fetcher],
  );

const runWithRetry = useCallback(
async (signal: AbortSignal): Promise<T> => {
let attempt = 0;
let lastError: unknown = null;
while (attempt <= backoffDelaysMs.length) {
if (signal.aborted) {
throw new DOMException('aborted', 'AbortError');
        }
try {
return await runOnce(signal);
        } catch (err) {
if (err instanceof DOMException && err.name === 'AbortError') {
throw err;
          }
lastError = err;
const apiErr = coerceToApiError(err);
if (apiErr.status === 429) {
if (attempt < backoffDelaysMs.length) {
const delayMs = backoffDelaysMs[attempt] ?? 0;
await sleep(delayMs);
attempt += 1;
continue;
            }
throw apiErr;
          }

throw apiErr;
        }
      }
throw lastError instanceof Error
? lastError
: new Error('[useSingleWithRetry] retry loop fell through');
    },
[backoffDelaysMs, runOnce, sleep],
  );

const execute = useCallback(
async (bumpEpoch: boolean): Promise<void> => {
if (key === null) {
setData(undefined);
setError(null);
setIsLoading(false);
return;
      }

const epoch = bumpEpoch ? epochRef.current + 1 : epochRef.current;
epochRef.current = epoch;

abortRef.current?.abort();
const controller = new AbortController();
abortRef.current = controller;

setIsLoading(true);
setIsRetrying(true);

const keyJson = JSON.stringify(key);
const sharedPromise = inFlightByKey.get(keyJson);
if (sharedPromise !== undefined) {
try {
const result = (await sharedPromise) as T;
if (!mountedRef.current) return;
if (epochRef.current !== epoch) return;
setData(result);
setError(null);
        } catch (err) {
if (!mountedRef.current) return;
if (epochRef.current !== epoch) return;
if (err instanceof DOMException && err.name === 'AbortError') return;
setError(coerceToApiError(err));
        } finally {
if (mountedRef.current && epochRef.current === epoch) {
setIsLoading(false);
setIsRetrying(false);
          }
        }
return;
      }

const localPromise = (async (): Promise<T> => {
try {
return await runWithRetry(controller.signal);
        } finally {
inFlightByKey.delete(keyJson);
        }
      })();
inFlightByKey.set(keyJson, localPromise);

try {
const result = await localPromise;
if (!mountedRef.current) return;
if (epochRef.current !== epoch) return;
setData(result);
setError(null);
      } catch (err) {
if (!mountedRef.current) return;
if (epochRef.current !== epoch) return;
if (err instanceof DOMException && err.name === 'AbortError') {
return;
        }
setError(coerceToApiError(err));
      } finally {
if (mountedRef.current && epochRef.current === epoch) {
setIsLoading(false);
setIsRetrying(false);
        }
      }
    },
[key, runWithRetry],
  );

const keyJson = JSON.stringify(key);
useEffect(() => {
keyRef.current = key;
setData(undefined);
setError(null);
void execute(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyJson]);

const retry = useCallback(async (): Promise<void> => {
setError(null);
await execute(true);
  }, [execute]);

useEffect(() => {
mountedRef.current = true;
return () => {
mountedRef.current = false;
abortRef.current?.abort();
abortRef.current = null;
    };
  }, []);

return {
data,
isLoading,
error,
retry,
isRetrying,
  };
}
