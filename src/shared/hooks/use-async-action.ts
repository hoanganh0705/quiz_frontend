'use client'

import { useState, useCallback } from 'react'
import { useEffect, useRef } from 'react'

/**
 * Custom hook for managing async actions with loading and error states
 * Supports both parameterized and parameterless async functions
 * @returns { execute, isLoading, error, reset }
 */
export function useAsyncAction<TArgs extends unknown[] = [], TResult = unknown, TError = Error>(
  asyncFunction: (...args: TArgs) => Promise<TResult>
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<TError | null>(null)
  const isMountedRef = useRef(true)
  const activeRequestIdRef = useRef(0)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      activeRequestIdRef.current += 1
    }
  }, [])

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      const requestId = activeRequestIdRef.current + 1
      activeRequestIdRef.current = requestId
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...args)
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
          return undefined
        }
        setIsLoading(false)
        return result
      } catch (err) {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) {
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
    if (isMountedRef.current) {
      setIsLoading(false)
    }
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
