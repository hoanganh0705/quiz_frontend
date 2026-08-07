import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getCurrentUser } from "@/features/users/services/users.reads.service";
import type { UserMeResponseDto } from "@/lib/api/generated/schemas";
import {
  subscribeToProfileEvents,
  type ProfileUpdatedEvent,
} from "@/lib/api/core/profile-broadcast-channel";

type UserState = {
  user: UserMeResponseDto | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: UserMeResponseDto | null) => void;
  clearUser: () => void;
  fetchCurrentUser: () => Promise<UserMeResponseDto | null>;
};

// ─── Single-flight in-flight tracker ─────────────────────────────────────────
//
// Source ticket: loop-fix / 2026-08.
//
// Bug history: the previous `fetchCurrentUser` action flipped
// `isLoading: false` on error and did not track its own in-flight
// state. Combined with `LayoutShell`'s `useEffect([...])`, an error
// from the underlying `GET /users/me` call produced an unbounded
// loop — each failed fetch reset `isLoading`, the effect re-fired,
// and the next fetch started. After several dozen attempts the
// NestJS global rate limiter (`@nestjs/throttler`) returned
// `429 GLOBAL_RATE_LIMITED`, surfacing to the UI as repeated
// "Server error" banners.
//
// Fix: a module-level `inFlight` Promise ensures every concurrent
// caller (Strict Mode double-invoke, simultaneous hook subscribers,
// cross-tab listener, profile-broadcast listener) gets the SAME
// Promise. After the Promise settles we clear the slot so a fresh,
// intentional refetch (e.g. `useMyProfile().refetch()`) can fire.
//
// The 30-second error timestamp mirrors the layout-shell guard so
// that an external caller (`useMyProfile.refetch`, the broadcast
// listener, etc.) can opt into an immediate retry by clearing the
// error via `setUser(...)` or by setting `user` directly.
let inFlight: Promise<UserMeResponseDto | null> | null = null;
let lastErrorAt: number | null = null;
const ERROR_COOLDOWN_MS = 30_000;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      setUser: (user) => set({ user, error: null }),
      clearUser: () => {
        // Reset loop-guard state on logout so a future login starts fresh.
        inFlight = null;
        lastErrorAt = null;
        set({ user: null, isLoading: false, error: null });
      },
      fetchCurrentUser: async () => {
        // Already running? Return the shared Promise — never start a
        // duplicate fetch. This is what breaks the loop when many
        // components subscribe simultaneously.
        if (inFlight) {
          return inFlight;
        }

        // Respect the post-error cooldown. External callers can bypass
        // it by calling `setUser`/`clearUser` first (e.g. logout → login).
        if (
          lastErrorAt !== null &&
          Date.now() - lastErrorAt < ERROR_COOLDOWN_MS
        ) {
          return get().user;
        }

        const promise = (async (): Promise<UserMeResponseDto | null> => {
          set({ isLoading: true, error: null });
          try {
            const user = await getCurrentUser();
            // Success — wipe the error timestamp so a later legitimate
            // fetch (e.g. forced `refetch()`) is allowed immediately.
            lastErrorAt = null;
            set({ user, isLoading: false });
            return user;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to load user";
            lastErrorAt = Date.now();
            set({ isLoading: false, error: message });
            return null;
          }
        })();

        inFlight = promise.finally(() => {
          inFlight = null;
        });

        return inFlight;
      },
    }),
    {
      name: "user_store_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      // Required for Next.js App Router: prevents persist from reading localStorage
      // during SSR, which makes getServerSnapshot unstable and causes an infinite loop.
      // Rehydration is triggered manually on the client in LayoutShell.
      skipHydration: true,
    },
  ),
);

// ─── Individual scalar/function selectors ────────────────────────────────────
// Rule: NEVER return an object from a selector. Objects create a new reference
// on every call, which breaks React's getServerSnapshot caching requirement and
// causes an infinite loop. Primitives and function refs are stable by identity.

export const useUser = () => useUserStore((state) => state.user);

// Status — scalar primitives
export const useIsUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);

// Actions — stable function references (defined once in create(), never change)
export const useSetUser = () => useUserStore((state) => state.setUser);
export const useClearUser = () => useUserStore((state) => state.clearUser);
export const useFetchCurrentUser = () =>
  useUserStore((state) => state.fetchCurrentUser);
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
let hasProfileListener = false;

if (typeof window !== "undefined" && !hasProfileListener) {
  const unsubscribe = subscribeToProfileEvents((event: ProfileUpdatedEvent) => {
    // Only revalidate for profile-surface changes that affect the user store.
    // 'preferences' is not included — it targets other caches, not this store.
    if (
      event.kind === "me" ||
      event.kind === "settings" ||
      event.kind === "avatar"
    ) {
      void useUserStore.getState().fetchCurrentUser();
    }
  });

  // Keep the unsubscribe reference in case explicit teardown is needed.
  // We intentionally do NOT call it on module reload (HMR handles it).
  void unsubscribe;
  hasProfileListener = true;
}
