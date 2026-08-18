'use client'

import { useCallback, useInsertionEffect, useRef } from 'react'

export type EventCallback<Args extends readonly unknown[]> = (...args: Args) => void

export function useEvent<Args extends readonly unknown[]>(
callback: (...args: Args) => void,
): EventCallback<Args> {
const ref = useRef<EventCallback<Args>>(() => undefined)

useInsertionEffect(() => {
ref.current = callback
  }, [callback])

return useCallback((...args: Args) => {
return ref.current(...args)
  }, [])
}
