import { create } from 'zustand'
import { getCurrentUser } from '@/lib/api/users'
import type { CurrentUserResponse } from '@/lib/api/types'

type UserState = {
  user: CurrentUserResponse | null
  isLoading: boolean
  error: string | null
  setUser: (user: CurrentUserResponse | null) => void
  clearUser: () => void
  fetchCurrentUser: () => Promise<CurrentUserResponse | null>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user, error: null }),
  clearUser: () => set({ user: null, isLoading: false, error: null }),
  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null })
    try {
      const user = await getCurrentUser()
      set({ user, isLoading: false })
      return user
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user'
      set({ isLoading: false, error: message })
      return null
    }
  }
}))
