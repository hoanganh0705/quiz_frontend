import { useState, useCallback, useRef } from 'react'

/**
 * Custom hook for managing localStorage with automatic serialization/deserialization
 * @param key - The localStorage key
 * @param initialValue - The initial value if no stored value exists
 * @returns [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Use ref to track current value without causing re-renders in callbacks
  const initialValueRef = useRef(initialValue)

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prevValue) => {
          // Allow value to be a function so we have same API as useState
          const valueToStore =
            value instanceof Function ? value(prevValue) : value

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          }

          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  // Remove the item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValueRef.current)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key])

  return [storedValue, setValue, removeValue]
}

/**
 * Hook for managing quiz progress in localStorage with automatic persistence
 * @param quizId - The quiz identifier
 * @param initialProgress - Initial progress state
 * @returns Progress management utilities
 */
export function useQuizProgress<T>(quizId: string, initialProgress: T) {
  const storageKey = `quiz_progress_${quizId}`
  const [progress, setProgress, clearProgress] = useLocalStorage<T>(
    storageKey,
    initialProgress
  )

  return {
    progress,
    setProgress,
    clearProgress
  }
}

/**
 * Hook for managing quiz results in localStorage
 * @param quizId - The quiz identifier
 * @returns Results management utilities
 */
export function useQuizResults<T>(quizId: string, initialResults: T | null) {
  const storageKey = `quiz_results_${quizId}`
  const [results, setResults, clearResults] = useLocalStorage<T | null>(
    storageKey,
    initialResults
  )

  return {
    results,
    setResults,
    clearResults
  }
}
