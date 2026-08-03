import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getCurrentUser } from '@/features/users/services/users.reads.service'
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
      partialize: (state) => ({ user: state.user }),
      // Required for Next.js App Router: prevents persist from reading localStorage
      // during SSR, which makes getServerSnapshot unstable and causes an infinite loop.
      // Rehydration is triggered manually on the client in LayoutShell.
      skipHydration: true
    }
  )
)

// ─── Individual scalar/function selectors ────────────────────────────────────
// Rule: NEVER return an object from a selector. Objects create a new reference
// on every call, which breaks React's getServerSnapshot caching requirement and
// causes an infinite loop. Primitives and function refs are stable by identity.

export const useUser = () => useUserStore((state) => state.user)

// Status — scalar primitives
export const useIsUserLoading = () => useUserStore((state) => state.isLoading)
export const useUserError = () => useUserStore((state) => state.error)

// Actions — stable function references (defined once in create(), never change)
export const useSetUser = () => useUserStore((state) => state.setUser)
export const useClearUser = () => useUserStore((state) => state.clearUser)
export const useFetchCurrentUser = () => useUserStore((state) => state.fetchCurrentUser)
