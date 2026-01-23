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
  const onCompleteRef = useRef(onComplete)

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Timer effect - only depends on isRunning
  useEffect(() => {
    if (!isRunning) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          if (onCompleteRef.current && !completedRef.current) {
            completedRef.current = true
            // Use setTimeout to avoid calling during render
            setTimeout(() => onCompleteRef.current?.(), 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning])

  const start = useCallback(() => {
    setIsRunning(true)
    setStartedAt(Date.now())
    completedRef.current = false
  }, [])

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
