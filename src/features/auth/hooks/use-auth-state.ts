'use client'

import { useCallback, useEffect, useState } from 'react'
import { clearAuthToken, getAuthToken } from '@/features/auth/utils/auth-cookies'

export function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(!!getAuthToken())
  }, [])

  const setAuthenticated = useCallback((value: boolean) => {
    if (!value) {
      clearAuthToken()
    }
    setIsAuthenticated(value)
  }, [])

  return {
    isAuthenticated,
    setAuthenticated
  }
}
