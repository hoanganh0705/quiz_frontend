'use client'

import { useRouter } from 'next/navigation'
import { logout as logoutApi } from '@/features/auth/api/auth'
import { clearAuthToken } from '@/features/auth/utils/auth-cookies'
import { useClearUser } from '@/features/users/store/user-store'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'

export function useLogout() {
  const router = useRouter()
  const clearUser = useClearUser()
  const { setAuthenticated } = useAuthState()

  const logout = async () => {
    try {
      await logoutApi()
    } catch {
      // Clear local state even if API fails
    } finally {
      clearAuthToken()
      clearUser()
      setAuthenticated(false)
      router.push('/')
    }
  }

  return { logout }
}
