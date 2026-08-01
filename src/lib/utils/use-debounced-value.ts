/**
 * `useDebouncedValue<T>(value, delay)` — debounce a value.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.E1.
 *
 * Returns the most recent `value` after `delay` ms of inactivity.
 * The first render returns the initial value (no delay). Every
 * subsequent `value` change resets the timer; the debounced value
 * updates only after `delay` ms of no further changes.
 *
 * The helper is intentionally minimal — a single `useEffect` + a
 * `useState` + a `setTimeout` ref. No leading-edge debounce, no
 * `useRef` for the latest value, no `useMemo` for the timeout id.
 * The ticket budget caps this at 30 lines; the constraint is the
 * 250 ms debounce window for the `/categories` search input, where
 * the canonical implementation is `useDebouncedValue(term, 250)`.
 *
 * The cleanup clears the in-flight timeout on unmount so a debounce
 * started before unmount doesn't fire after the component is gone.
 *
 * SSR: the hook is a no-op on the server (the first render returns
 * the initial value). The `setTimeout`-based update is client-only.
 */

import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebounced(value)
    }, delay)
    return () => clearTimeout(timeoutId)
  }, [value, delay])

  return debounced
}
