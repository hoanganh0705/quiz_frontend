import { useState, useCallback } from 'react'

/**
 * Custom hook for managing async actions with loading and error states
 * @returns { execute, isLoading, error, reset }
 */
export function useAsyncAction<T = unknown, E = Error>() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<E | null>(null)

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFunction()
        setIsLoading(false)
        return result
      } catch (err) {
        setError(err as E)
        setIsLoading(false)
        return undefined
      }
    },
    []
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
