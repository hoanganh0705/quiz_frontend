'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/shared/log'

export function useFullscreen() {
const [isFullscreen, setIsFullscreen] = useState(false)

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

logger.warn('fullscreen', 'request was denied')
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
logger.warn('fullscreen', 'exit failed')
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
