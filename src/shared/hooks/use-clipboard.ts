'use client'

import { useState, useCallback } from 'react'
import { useEffect, useRef } from 'react'
import { logger } from '@/shared/log'

/**
 * Custom hook for copying text to clipboard with success state
 * @param timeout - Duration in ms to show success state (default: 2000)
 * @returns Copy function and copied state
 */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !navigator.clipboard) {
        logger.warn('clipboard', 'Clipboard API not available')
        return
      }

      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(() => setCopied(false), timeout)
        })
        .catch((error) => {
          logger.error('clipboard', 'Failed to copy', error)
        })
    },
    [timeout]
  )

  return { copied, copy }
}
