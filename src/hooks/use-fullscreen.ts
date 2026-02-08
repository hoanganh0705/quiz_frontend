import { useState, useCallback, useEffect } from 'react'

/**
 * Custom hook for managing fullscreen mode.
 * Uses the Fullscreen API with fallback for browsers that don't support it.
 *
 * @returns Fullscreen state and toggle controls
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sync state with actual fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange
      )
    }
  }, [])

  const enterFullscreen = useCallback(
    async (element?: HTMLElement | null) => {
      const target = element ?? document.documentElement

      try {
        if (target.requestFullscreen) {
          await target.requestFullscreen()
        } else if (
          'webkitRequestFullscreen' in target &&
          typeof (target as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen === 'function'
        ) {
          await (target as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
        }
        setIsFullscreen(true)
      } catch {
        // Fullscreen request may be denied by browser policy
        console.warn('Fullscreen request was denied')
      }
    },
    []
  )

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (
        'webkitExitFullscreen' in document &&
        typeof (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen === 'function'
      ) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()
      }
      setIsFullscreen(false)
    } catch {
      console.warn('Exit fullscreen failed')
    }
  }, [])

  const toggleFullscreen = useCallback(
    async (element?: HTMLElement | null) => {
      if (isFullscreen) {
        await exitFullscreen()
      } else {
        await enterFullscreen(element)
      }
    },
    [isFullscreen, enterFullscreen, exitFullscreen]
  )

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  }
}
