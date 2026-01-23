import { useState, useCallback } from 'react'

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

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...args)
        setIsLoading(false)
        return result
      } catch (err) {
        setError(err as TError)
        setIsLoading(false)
        return undefined
      }
    },
    [asyncFunction]
  )

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    execute,
    isLoading,
    error,
    reset
  }
}
