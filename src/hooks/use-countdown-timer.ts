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
  const [startedAt, setStartedAt] = useState<number | null>(
    autoStart ? Date.now() : null
  )
  const completedRef = useRef(false)

  // Timer effect
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          if (onComplete && !completedRef.current) {
            completedRef.current = true
            onComplete()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, timeLeft, onComplete])

  const start = useCallback(() => {
    if (!isRunning && timeLeft > 0) {
      setIsRunning(true)
      setStartedAt(Date.now())
      completedRef.current = false
    }
  }, [isRunning, timeLeft])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const resume = useCallback(() => {
    if (timeLeft > 0) {
      setIsRunning(true)
    }
  }, [timeLeft])

  const reset = useCallback(
    (newTime?: number) => {
      setTimeLeft(newTime ?? initialTime)
      setIsRunning(false)
      setStartedAt(null)
      completedRef.current = false
    },
    [initialTime]
  )

  const setTime = useCallback((time: number) => {
    setTimeLeft(time)
  }, [])

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
