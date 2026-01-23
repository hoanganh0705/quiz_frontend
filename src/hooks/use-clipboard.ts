import { useState, useCallback } from 'react'

/**
 * Custom hook for copying text to clipboard with success state
 * @param timeout - Duration in ms to show success state (default: 2000)
 * @returns Copy function and copied state
 */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !navigator.clipboard) {
        console.warn('Clipboard API not available')
        return
      }

      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), timeout)
        })
        .catch((error) => {
          console.error('Failed to copy to clipboard:', error)
        })
    },
    [timeout]
  )

  return { copied, copy }
}
