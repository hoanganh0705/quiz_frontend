'use client'

import { useState, useCallback, useRef } from 'react'
import { useEffect } from 'react'
import { logger } from '@/shared/log'

export function useLocalStorage<T>(
key: string,
initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {

const initialValueRef = useRef(initialValue)

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

const setValue = useCallback(
(value: T | ((prev: T) => T)) => {
try {
setStoredValue((prevValue) => {

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
