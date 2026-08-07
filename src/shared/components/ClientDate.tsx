'use client'

/**
 * `<ClientDate>` — client-only date formatter.
 *
 * Source epic:   TKT-7.5 cleanup audit, Phase 7 / P0-5.
 * Source ticket: P0-5.
 *
 * Native `Date.prototype.toLocaleDateString()` and
 * `toLocaleTimeString()` produce values that differ between server
 * and client: the server's locale (typically `en-US` in
 * Docker / Node containers) and the user's browser locale do not
 * match. Rendering the call in the SSR pass produces HTML with the
 * server's locale, then React 18's hydration pass triggers a
 * diff / mismatch when the client renders with the user's locale.
 *
 * The audit (P0-5) requires that every `*.toLocaleDateString()` /
 * `*.toLocaleTimeString()` call be wrapped in a `'use client'`
 * boundary so the formatting runs only on the client. This
 * component is the canonical wrapper.
 *
 * ## Usage
 *
 * ```tsx
 * // Before (P0-5 violation):
 * <span>{new Date(someIsoString).toLocaleDateString()}</span>
 *
 * // After:
 * <ClientDate value={someIsoString} />
 * <ClientDate value={someIsoString} mode="datetime" />
 * <ClientDate value={someIsoString} options={{ dateStyle: 'long' }} />
 * ```
 *
 * ## SSR fallback
 *
 * The component renders the ISO date string during SSR so the
 * initial paint is stable. After hydration, the component
 * `useState`-ly flips to the locale-formatted string on the
 * client. The hydration mismatch is avoided because the server
 * and the first client render both emit the ISO string.
 */
import { useEffect, useState } from 'react'

export type ClientDateMode = 'date' | 'time' | 'datetime'

export interface ClientDateProps {
  /** ISO-8601 string, `Date`, or epoch milliseconds. */
  value: string | number | Date
  /** What to render. Defaults to `'date'`. */
  mode?: ClientDateMode
  /** Locale. Defaults to the runtime's `navigator.language`. */
  locale?: string
  /** `Intl.DateTimeFormat` options. */
  options?: Intl.DateTimeFormatOptions
  /** Optional fallback for invalid inputs. Defaults to `''`. */
  fallback?: string
  /** Optional `className` to forward. */
  className?: string
}

export function ClientDate({
  value,
  mode = 'date',
  locale,
  options,
  fallback = '',
  className,
}: ClientDateProps): React.ReactElement {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) {
    return <span className={className}>{fallback}</span>
  }

  // SSR / first-paint: emit the ISO string so the markup is stable
  // between server and client. After hydration, swap to the
  // locale-formatted string.
  if (!hydrated) {
    return <span className={className}>{date.toISOString()}</span>
  }

  // Client-side formatting.
  const resolvedLocale = locale ?? (typeof navigator !== 'undefined' ? navigator.language : undefined)
  const mergedOptions: Intl.DateTimeFormatOptions = options ?? defaultOptions(mode)
  const formatted = new Intl.DateTimeFormat(resolvedLocale, mergedOptions).format(date)

  return <span className={className}>{formatted}</span>
}

function defaultOptions(mode: ClientDateMode): Intl.DateTimeFormatOptions {
  switch (mode) {
    case 'time':
      return { hour: '2-digit', minute: '2-digit' }
    case 'datetime':
      return {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    case 'date':
    default:
      return { year: 'numeric', month: 'short', day: 'numeric' }
  }
}