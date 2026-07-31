/**
 * Bootstrap deduplicator — ensures only one bootstrap request runs at a time.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.6.
 *
 * ## Purpose
 *
 * When multiple components mount simultaneously on first authenticated render,
 * they all want to bootstrap auth state. Without deduplication, we would make
 * N simultaneous requests to `/auth/me` and `/users/me`. This utility ensures
 * only one request fires and all consumers share the same promise.
 *
 * ## How it works
 *
 * Uses a module-level in-flight map keyed by request ID. When a request starts,
 * it checks if there's already an in-flight promise for that ID:
 * - If yes, returns the existing promise (all consumers share the same result)
 * - If no, creates a new promise and stores it; consumers wait on the same promise
 *
 * When the request completes (success or error), the in-flight entry is removed.
 *
 * ## Usage
 *
 * ```typescript
 * const result = await singleflight('bootstrap', () => fetchBootstrapData());
 * ```
 *
 * ## Type Safety
 *
 * The `T` generic is the resolved value type. Errors are always thrown, never
 * returned. Callers must wrap in try/catch.
 */

type InFlightEntry<T> = {
  promise: Promise<T>;
  refCount: number;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

// Module-level in-flight requests map
const inFlightRequests = new Map<string, InFlightEntry<unknown>>();

/**
 * Ensures only one request per `key` runs at a time.
 *
 * @param key - Unique identifier for this request (e.g., 'bootstrap', 'profile')
 * @param fn - Async function to execute
 * @returns Promise<T> that resolves when the request completes
 */
export async function singleflight<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Check if there's an in-flight request for this key
  const existing = inFlightRequests.get(key) as InFlightEntry<T> | undefined;

  if (existing) {
    // Increment ref count and return existing promise
    existing.refCount++;
    return existing.promise;
  }

  // Create new deferred promise
  let resolve: (value: T) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // Store the entry
  const entry: InFlightEntry<T> = {
    promise,
    refCount: 1,
    resolve: resolve as (value: T) => void,
    reject: reject as (error: unknown) => void,
  };
  inFlightRequests.set(key, entry);

  // Execute the request
  try {
    const result = await fn();
    entry.resolve(result);
    return result;
  } catch (error) {
    entry.reject(error);
    throw error;
  } finally {
    // Decrement ref count and clean up when all consumers are done
    entry.refCount--;
    if (entry.refCount <= 0) {
      inFlightRequests.delete(key);
    }
  }
}

/**
 * Cancel all in-flight requests.
 * Used on logout to prevent stale responses from corrupting state.
 */
export function cancelAllInFlightRequests(): void {
  for (const [key, entry] of inFlightRequests) {
    inFlightRequests.delete(key);
    // Reject pending promises with a cancellation error
    entry.reject(new Error("Request cancelled: bootstrap aborted"));
  }
}

/**
 * Check if there are any in-flight requests.
 * Useful for debugging and testing.
 */
export function hasInFlightRequests(): boolean {
  return inFlightRequests.size > 0;
}

/**
 * Get the number of in-flight requests for a specific key.
 * Useful for debugging and testing.
 */
export function getInFlightCount(key: string): number {
  const entry = inFlightRequests.get(key);
  return entry?.refCount ?? 0;
}
