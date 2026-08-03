import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getCurrentUser } from '@/features/users/services/users.reads.service'
import type { UserMeResponseDto } from '@/lib/api/generated/schemas'
import {
  subscribeToProfileEvents,
  type ProfileUpdatedEvent,
} from '@/lib/api/core/profile-broadcast-channel'

type UserState = {
  user: UserMeResponseDto | null
  isLoading: boolean
  error: string | null
  setUser: (user: UserMeResponseDto | null) => void
  clearUser: () => void
  fetchCurrentUser: () => Promise<UserMeResponseDto | null>
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

// ─── Cross-tab profile sync ───────────────────────────────────────────────────
//
// Register a profile-mutation listener once on module load so every tab
// revalidates the store when another tab saves a profile or settings change.
// This is the mechanism that makes Epic 4.3 AC4 ("Cross-tab: a profile update
// in one tab is reflected in the other within ~1 second") true.
//
// The `subscribeToProfileEvents` listener ignores same-tab events internally
// via `tabId` (see profile-broadcast-channel.ts).

/** Guard to prevent double-subscription during Next.js HMR. */
let hasProfileListener = false

if (typeof window !== 'undefined' && !hasProfileListener) {
  const unsubscribe = subscribeToProfileEvents((event: ProfileUpdatedEvent) => {
    // Only revalidate for profile-surface changes that affect the user store.
    // 'preferences' is not included — it targets other caches, not this store.
    if (event.kind === 'me' || event.kind === 'settings' || event.kind === 'avatar') {
      void useUserStore.getState().fetchCurrentUser()
    }
  })

  // Keep the unsubscribe reference in case explicit teardown is needed.
  // We intentionally do NOT call it on module reload (HMR handles it).
  void unsubscribe
  hasProfileListener = true
}
