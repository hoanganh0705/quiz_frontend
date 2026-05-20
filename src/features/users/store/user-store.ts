import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getCurrentUser } from '@/features/users/api/users'
import type { CurrentUserResponse } from '@/features/users/types'

type UserState = {
  user: CurrentUserResponse | null
  isLoading: boolean
  error: string | null
  setUser: (user: CurrentUserResponse | null) => void
  clearUser: () => void
  fetchCurrentUser: () => Promise<CurrentUserResponse | null>
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
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
          const message =
            error instanceof Error ? error.message : 'Failed to load user'
          set({ isLoading: false, error: message })
          return null
        }
      }
    }),
    {
      name: 'user_store_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user })
    }
  )
)

export const useUser = () => useUserStore((state) => state.user)
export const useUserStatus = () =>
  useUserStore((state) => ({
    isLoading: state.isLoading,
    error: state.error
  }))
export const useUserActions = () =>
  useUserStore((state) => ({
    setUser: state.setUser,
    clearUser: state.clearUser,
    fetchCurrentUser: state.fetchCurrentUser
  }))
