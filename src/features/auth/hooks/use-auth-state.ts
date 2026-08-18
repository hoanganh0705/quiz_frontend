'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
clearAuthToken,
getAuthToken,
subscribeToAuthChanges
} from '@/features/auth/utils/auth-cookies'
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag'

function getAuthSnapshot() {
if (typeof window === 'undefined') {
return false
  }

return !!getAuthToken()
}

export function useAuthState() {
const isAuthenticated = useSyncExternalStore(
subscribeToAuthChanges,
getAuthSnapshot,
() => false
  )

const setAuthenticated = useCallback((value: boolean) => {
if (!value) {
clearAuthToken()

clearVerificationFlags()
return
    }

if (typeof window !== 'undefined') {
window.dispatchEvent(new Event('auth-state-change'))
    }
  }, [])

return {
isAuthenticated,
setAuthenticated
  }
}
