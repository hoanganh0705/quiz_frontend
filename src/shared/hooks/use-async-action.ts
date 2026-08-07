'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * `useAsyncAction` — async action state management with last-call-wins
 * cancellation semantics.
 *
 * Source epic:   TKT-7.5 cleanup audit, Phase 7 / P2-83.
 *
 * ## What this hook owns
 *
 * - `isLoading: boolean` — `true` while the most recent `execute(...)`
 *   call is in flight.
 * - `error: TError | null` — the typed error from the most recent
 *   failure. `null` until a failure occurs (or after `reset()`).
 * - `execute(...args): Promise<TResult | undefined>` — invokes the
 *   supplied async function. Resolves to the result on success, or
 *   `undefined` if the call was cancelled (a newer call superseded
 *   it) or the component unmounted.
 * - `cancel(): void` — invalidates the current in-flight request
 *   without starting a new one.
 * - `reset(): void` — clears `isLoading` and `error`.
 *
 * ## P2-83 cleanup
 *
 * The previous implementation used an `isMountedRef` to guard
 * `setState` calls after unmount. React 18 silently ignores such
 * calls (and logs a warning), so the ref was unnecessary. The
 * hook now relies on the `requestId` cancel-stamp alone.
 *
 * ## Last-call-wins
 *
 * A new `execute(...)` call bumps `activeRequestIdRef`. The previous
 * in-flight call's `setState` calls are checked against the latest
 * `requestId` and discarded if they don't match. This is the
 * canonical "stale response after rapid clicks" mitigation.
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error } = useAsyncAction(api.saveProfile);
 * const onSubmit = (data) => execute(data);
 * ```
 */
export function useAsyncAction<TArgs extends unknown[] = [], TResult = unknown, TError = Error>(
  asyncFunction: (...args: TArgs) => Promise<TResult>
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<TError | null>(null)
  const activeRequestIdRef = useRef(0)

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      const requestId = activeRequestIdRef.current + 1
      activeRequestIdRef.current = requestId
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...args)
        if (activeRequestIdRef.current !== requestId) {
          return undefined
        }
        setIsLoading(false)
        return result
      } catch (err) {
        if (activeRequestIdRef.current !== requestId) {
          return undefined
        }
        setError(err as TError)
        setIsLoading(false)
        return undefined
      }
    },
    [asyncFunction]
  )

  const cancel = useCallback(() => {
    activeRequestIdRef.current += 1
    setIsLoading(false)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    execute,
    cancel,
    isLoading,
    error,
    reset
  }
}