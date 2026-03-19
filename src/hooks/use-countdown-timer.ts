'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCountdownTimerOptions {
  initialTime: number
  onComplete?: () => void
  autoStart?: boolean
}

/**
 * Custom hook for countdown timer with pause/resume functionality
 * @param options - Timer configuration
 * @returns Timer state and controls
 */
export function useCountdownTimer({
  initialTime,
  onComplete,
  autoStart = false
}: UseCountdownTimerOptions) {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const endTimeRef = useRef<number | null>(null)

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Timer effect - only depends on isRunning
  useEffect(() => {
    if (!isRunning) return

    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + timeLeft * 1000
    }

    const timer = setInterval(() => {
      const endTime = endTimeRef.current
      if (endTime === null) return

      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)

      if (remaining <= 0) {
        setIsRunning(false)
        endTimeRef.current = null
        if (onCompleteRef.current && !completedRef.current) {
          completedRef.current = true
          setTimeout(() => onCompleteRef.current?.(), 0)
        }
      }
    }, 250)

    return () => clearInterval(timer)
  }, [isRunning, timeLeft])

  const start = useCallback(() => {
    setIsRunning(true)
    const now = Date.now()
    setStartedAt(now)
    endTimeRef.current = now + timeLeft * 1000
    completedRef.current = false
  }, [timeLeft])

  const pause = useCallback(() => {
    if (endTimeRef.current !== null) {
      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000)
      )
      setTimeLeft(remaining)
    }
    endTimeRef.current = null
    setIsRunning(false)
  }, [])

  const resume = useCallback(() => {
    if (timeLeft > 0) {
      endTimeRef.current = Date.now() + timeLeft * 1000
      setIsRunning(true)
    }
  }, [timeLeft])

  const reset = useCallback(
    (newTime?: number) => {
      setTimeLeft(newTime ?? initialTime)
      setIsRunning(false)
      setStartedAt(null)
      endTimeRef.current = null
      completedRef.current = false
    },
    [initialTime]
  )

  const setTime = useCallback((time: number) => {
    if (isRunning) {
      endTimeRef.current = Date.now() + time * 1000
    }
    setTimeLeft(time)
  }, [isRunning])

  return {
    timeLeft,
    isRunning,
    startedAt,
    start,
    pause,
    resume,
    reset,
    setTime
  }
}
