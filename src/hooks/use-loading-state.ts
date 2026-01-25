'use client'

import { useState, useCallback } from 'react'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

interface UseLoadingStateOptions {
  initialState?: LoadingState
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UseLoadingStateReturn {
  state: LoadingState
  isIdle: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  setIdle: () => void
  setLoading: () => void
  setSuccess: () => void
  setError: (error: Error) => void
  reset: () => void
  execute: <T>(promise: Promise<T>) => Promise<T | undefined>
}

export function useLoadingState(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const { initialState = 'idle', onSuccess, onError } = options
  const [state, setState] = useState<LoadingState>(initialState)
  const [error, setErrorState] = useState<Error | null>(null)

  const setIdle = useCallback(() => {
    setState('idle')
    setErrorState(null)
  }, [])

  const setLoading = useCallback(() => {
    setState('loading')
    setErrorState(null)
  }, [])

  const setSuccess = useCallback(() => {
    setState('success')
    setErrorState(null)
    onSuccess?.()
  }, [onSuccess])

  const setError = useCallback(
    (err: Error) => {
      setState('error')
      setErrorState(err)
      onError?.(err)
    },
    [onError]
  )

  const reset = useCallback(() => {
    setState(initialState)
    setErrorState(null)
  }, [initialState])

  const execute = useCallback(
    async <T,>(promise: Promise<T>): Promise<T | undefined> => {
      try {
        setLoading()
        const result = await promise
        setSuccess()
        return result
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return undefined
      }
    },
    [setLoading, setSuccess, setError]
  )

  return {
    state,
    isIdle: state === 'idle',
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    error,
    setIdle,
    setLoading,
    setSuccess,
    setError,
    reset,
    execute
  }
}

// Hook for simulating loading delay (useful for demos/testing)
export function useSimulatedLoading(delay = 2000) {
  const loadingState = useLoadingState()

  const simulateLoading = useCallback(
    (shouldError = false) => {
      return loadingState.execute(
        new Promise((resolve, reject) => {
          setTimeout(() => {
            if (shouldError) {
              reject(new Error('Simulated error'))
            } else {
              resolve(true)
            }
          }, delay)
        })
      )
    },
    [loadingState, delay]
  )

  return {
    ...loadingState,
    simulateLoading
  }
}
