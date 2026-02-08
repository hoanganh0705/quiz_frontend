'use client'

import { useEffect, useCallback } from 'react'
import useSWRSubscription from 'swr/subscription'

/**
 * Module-level Map to track callbacks per shortcut key.
 * Uses useSWRSubscription for deduplication: N hook instances = 1 listener.
 * @see .agents/skills/vercel-react-best-practices/rules/client-event-listeners.md
 */

export interface ShortcutOptions {
  /** Whether Cmd (Mac) / Ctrl (Windows/Linux) must be held */
  meta?: boolean
  /** Whether Shift must be held */
  shift?: boolean
  /** Whether to preventDefault on the event */
  preventDefault?: boolean
  /** Whether the shortcut is currently enabled */
  enabled?: boolean
}

interface CallbackEntry {
  callback: () => void
  options: ShortcutOptions
}

const keyCallbacks = new Map<string, Set<CallbackEntry>>()

function matchesModifiers(
  e: KeyboardEvent,
  options: ShortcutOptions
): boolean {
  const needsMeta = options.meta ?? false
  const needsShift = options.shift ?? false

  const metaPressed = e.metaKey || e.ctrlKey
  const shiftPressed = e.shiftKey

  if (needsMeta && !metaPressed) return false
  if (!needsMeta && metaPressed) return false
  if (needsShift && !shiftPressed) return false

  return true
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: ShortcutOptions = {}
) {
  const { enabled = true, preventDefault = true } = options

  const stableCallback = useCallback(callback, [callback])

  // Register this callback in the module-level Map
  useEffect(() => {
    if (!enabled) return

    const entry: CallbackEntry = { callback: stableCallback, options }

    if (!keyCallbacks.has(key)) {
      keyCallbacks.set(key, new Set())
    }
    keyCallbacks.get(key)!.add(entry)

    return () => {
      const set = keyCallbacks.get(key)
      if (set) {
        set.delete(entry)
        if (set.size === 0) {
          keyCallbacks.delete(key)
        }
      }
    }
  }, [key, stableCallback, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Single shared global keydown listener via useSWRSubscription
  useSWRSubscription(
    enabled ? 'global-keydown' : null,
    (_, { next }: { next: (err: Error | null, data?: KeyboardEvent) => void }) => {
      const handler = (e: KeyboardEvent) => {
        // Skip if user is typing in an input/textarea/contenteditable
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          // Allow meta shortcuts (Cmd/Ctrl+K) even in inputs
          if (!(e.metaKey || e.ctrlKey)) return
        }

        const entries = keyCallbacks.get(e.key.toLowerCase())
        if (entries) {
          entries.forEach((entry) => {
            if (matchesModifiers(e, entry.options)) {
              if (entry.options.preventDefault !== false) {
                e.preventDefault()
              }
              entry.callback()
            }
          })
        }

        next(null, e)
      }

      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }
  )
}
