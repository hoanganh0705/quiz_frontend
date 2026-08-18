'use client'

import { useState, useCallback, useRef } from 'react'

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