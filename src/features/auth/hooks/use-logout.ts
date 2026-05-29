'use client'

import { useRouter } from 'next/navigation'
import { logout } from '@/features/auth/wrappers/auth.wrapper'
import { clearAuthToken } from '@/features/auth/utils/auth-cookies'
import { useClearUser } from '@/features/users/store/user-store'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'

export function useLogout() {
  const router = useRouter()
  const clearUser = useClearUser()
  const { setAuthenticated } = useAuthState()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Clear local state even if API fails
    } finally {
      clearAuthToken()
      clearUser()
      setAuthenticated(false)
      router.push('/')
    }
  }

  return { logout: handleLogout }
}
