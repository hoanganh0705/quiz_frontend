'use client'

import { useEffect } from 'react'

export function PwaServiceWorker() {
useEffect(() => {
if (!('serviceWorker' in navigator)) return

if (process.env.NODE_ENV !== 'production') {
navigator.serviceWorker.getRegistrations().then((registrations) => {
registrations.forEach((registration) => {
void registration.unregister()
        })
      })
return
    }

navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore in environments where sw.js is not yet generated
    })
  }, [])

return null
}
