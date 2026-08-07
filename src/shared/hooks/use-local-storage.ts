'use client'

import { useState, useCallback, useRef } from 'react'
import { useEffect } from 'react'
import { logger } from '@/shared/log'

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
      logger.error('local-storage', `Error loading key "${key}"`, error)
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
        logger.error('local-storage', `Error setting key "${key}"`, error)
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
      logger.error('local-storage', `Error removing key "${key}"`, error)
    }
  }, [key])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== key) return

      try {
        if (event.newValue === null) {
          setStoredValue(initialValueRef.current)
          return
        }

        setStoredValue(JSON.parse(event.newValue) as T)
      } catch (error) {
        logger.error('local-storage', `Error syncing key "${key}"`, error)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key])

  return [storedValue, setValue, removeValue]
}
