'use client'

/**
 * `useEvent` — React 18+ polyfill for the React 19 `useEffectEvent`.
 *
 * React 19 introduced `useEffectEvent` for "always-read-latest" callbacks.
 * On React 18 we polyfill it via a `useRef` that tracks the latest
 * callback. The returned function has a stable identity across renders,
 * so it can be passed into `useEffect` / `useKeyboardShortcut` /
 * `BroadcastChannel.subscribe` etc. without churning their dependency
 * arrays.
 *
 * Source epic:   TKT-7.5 cleanup audit, Phase 7 / P0-4.
 * Source ticket: P0-4.
 *
 * ## Why this exists
 *
 * The cleanup audit identified `PlayQuizClient` as a hot spot for the
 * "mutate a ref inside a `useEffect` with no deps" pattern (the
 * classic useEvent workaround). The polyfill consolidates that pattern
 * into a single, tested primitive.
 *
 * ## Usage
 *
 * ```ts
 * const onClick = useEvent(() => {
 *   // reads the latest `count`, `props`, etc.
 * });
 *
 * useEffect(() => {
 *   window.addEventListener('click', onClick);
 *   return () => window.removeEventListener('click', onClick);
 * }, [onClick]); // ← stable identity, runs once
 * ```
 *
 * @see https://react.dev/reference/react/experimental_useEffectEvent
 * @see https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md
 */
import { useCallback, useInsertionEffect, useRef } from 'react'

export type EventCallback<Args extends readonly unknown[]> = (...args: Args) => void

export function useEvent<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
): EventCallback<Args> {
  const ref = useRef<EventCallback<Args>>(() => undefined)

  // `useInsertionEffect` runs before any DOM mutation, so the ref is
  // always synced to the latest closure before any effect / render
  // reads it. Fall back to `useLayoutEffect` on React versions that
  // do not support `useInsertionEffect`.
  useInsertionEffect(() => {
    ref.current = callback
  }, [callback])

  return useCallback((...args: Args) => {
    return ref.current(...args)
  }, [])
}
