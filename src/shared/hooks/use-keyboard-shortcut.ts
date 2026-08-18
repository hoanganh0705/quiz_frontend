'use client'

import { useEffect, useCallback, useMemo } from 'react'

export interface ShortcutOptions {

meta?: boolean

shift?: boolean

preventDefault?: boolean

enabled?: boolean
}

interface CallbackEntry {
callback: () => void
options: ShortcutOptions
}

const keyCallbacks = new Map<string, Set<CallbackEntry>>()
let globalListenerAttached = false
let globalHandler: ((e: KeyboardEvent) => void) | null = null

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
const { enabled = true } = options

const stableCallback = useCallback(() => {
callback()
  }, [callback])

const optionsKey = useMemo(
() => JSON.stringify({ meta: options.meta, shift: options.shift, preventDefault: options.preventDefault }),
[options.meta, options.shift, options.preventDefault]
  )

useEffect(() => {
if (!enabled) return

const parsedOptions = JSON.parse(optionsKey) as ShortcutOptions
const entry: CallbackEntry = { callback: stableCallback, options: { ...parsedOptions, enabled } }

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
  }, [key, stableCallback, enabled, optionsKey])

useEffect(() => {
if (!enabled) return

if (globalListenerAttached) return

const handler = (e: KeyboardEvent) => {
const target = e.target as HTMLElement
if (
target.tagName === 'INPUT' ||
target.tagName === 'TEXTAREA' ||
target.isContentEditable
        ) {
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
      }

window.addEventListener('keydown', handler)
globalListenerAttached = true
globalHandler = handler

return () => {
window.removeEventListener('keydown', handler)
globalListenerAttached = false
globalHandler = null
      }
      // We only want to run this effect once per mount

    }, [enabled])
}
