import { useEffect, useRef, useCallback } from 'react'

interface SwipeGestureOptions {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  threshold?: number
  /** Maximum vertical distance allowed for horizontal swipe (default: 100) */
  maxVerticalOffset?: number
  /** Whether the swipe gesture is enabled (default: true) */
  enabled?: boolean
}

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

/**
 * Custom hook for detecting swipe gestures on touch devices.
 * Useful for navigating between quiz questions on mobile.
 *
 * @param handlers - Callbacks for swipe left/right events
 * @param options - Configuration for swipe sensitivity
 * @param ref - Optional ref to attach the listener to (defaults to document)
 */
export function useSwipeGesture(
  handlers: SwipeHandlers,
  options: SwipeGestureOptions = {},
  ref?: React.RefObject<HTMLElement | null>
) {
  const {
    threshold = 50,
    maxVerticalOffset = 100,
    enabled = true
  } = options

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const touchEndY = useRef<number>(0)
  const isSwiping = useRef(false)

  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isSwiping.current = true
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwiping.current) return
      touchEndX.current = e.touches[0].clientX
      touchEndY.current = e.touches[0].clientY
    },
    [enabled]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isSwiping.current) return
    isSwiping.current = false

    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = Math.abs(touchEndY.current - touchStartY.current)

    // Only trigger horizontal swipe if vertical movement is within limits
    if (Math.abs(deltaX) < threshold || deltaY > maxVerticalOffset) return

    if (deltaX < 0) {
      // Swiped left → go to next
      handlersRef.current.onSwipeLeft?.()
    } else {
      // Swiped right → go to previous
      handlersRef.current.onSwipeRight?.()
    }
  }, [enabled, threshold, maxVerticalOffset])

  useEffect(() => {
    if (!enabled) return

    const target = ref?.current ?? document

    target.addEventListener('touchstart', handleTouchStart as EventListener, {
      passive: true
    })
    target.addEventListener('touchmove', handleTouchMove as EventListener, {
      passive: true
    })
    target.addEventListener('touchend', handleTouchEnd as EventListener, {
      passive: true
    })

    return () => {
      target.removeEventListener(
        'touchstart',
        handleTouchStart as EventListener
      )
      target.removeEventListener(
        'touchmove',
        handleTouchMove as EventListener
      )
      target.removeEventListener('touchend', handleTouchEnd as EventListener)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, ref])
}
