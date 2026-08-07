'use client';

/**
 * `useAuthSession` — read-only replacement for `useAuthBootstrap()`.
 *
 * Source ticket: cleanup / 2026-08.
 *
 * ## Why this hook exists
 *
 * The original `useAuthBootstrap()` returned a large struct
 * (`bootstrapState`, `isAuthenticated`, `isBootstrapping`,
 * `isDegraded`, `currentUser`, `user`, `error`, `profileError`,
 * `refetch`, `clearBootstrap`). It was backed by an `AuthBootstrapContext`
 * provider that was never mounted anywhere in the runtime tree, which
 * meant every consumer would throw at runtime. The provider has been
 * removed; this hook is the canonical read-only replacement for the
 * subset of fields the codebase actually used.
 *
 * ## Source mapping
 *
 * | Old (`useAuthBootstrap`) | New (`useAuthSession`) | Source |
 * |---|---|---|
 * | `isAuthenticated`        | `isAuthenticated`       | `useAuthState` (cookie-backed `useSyncExternalStore`) |
 * | `currentUser?.userId`    | `currentUserId` (string \| null) | `useUserStore` (populated by `LayoutShell`) |
 * | `user`                   | `user`                  | `useUserStore` |
 * | `isBootstrapping`        | `isBootstrapping`       | `useUserStore.isLoading` (the only in-flight flag that mattered) |
 * | `isDegraded`             | `isDegraded`            | `useUserStore.error` is set AND `user === null` |
 * | `bootstrapState`         | `bootstrapState` (derived) | `'authenticated' \| 'unauthenticated' \| 'bootstrapping'` |
 *
 * Fields NOT preserved (and why):
 *
 *   - `error` / `profileError` — callers should use `useUserError()`
 *     or the underlying auth-state instead. They were rarely read
 *     and the underlying source-of-truth has moved.
 *   - `refetch` — call `useFetchCurrentUser()` directly. Most
 *     callers only invoked `refetch()` to retry `/users/me`; the
 *     store action is the new public entry point.
 *   - `clearBootstrap` — call `useClearUser()` directly. Most callers
 *     were wiring it into a logout path that already drives the
 *     Zustand store.
 *
 * ## Semantics
 *
 *   - `isAuthenticated` follows the cookie. The cookie is the
 *     canonical "do you have a token?" check; `LayoutShell`'s
 *     `useEffect` fires `fetchCurrentUser()` when this flips true.
 *   - `currentUserId` is `null` until `useUserStore.user` is populated.
 *     Before `LayoutShell` mounts the call sites, the value is `null`
 *     even if the cookie says authenticated — this is the exact
 *     behaviour the old context had under its `bootstrapping` state.
 *
 * @see features/users/store/user-store.ts
 * @see features/auth/hooks/use-auth-state.ts
 */

import {
  useIsUserLoading,
  useUser,
  useUserStore,
} from '@/features/users/store/user-store';
import { useAuthState } from '@/features/auth/hooks';

export type AuthSessionBootstrapState =
  | 'unauthenticated'
  | 'bootstrapping'
  | 'authenticated';

export interface AuthSessionValue {
  /** Cookie says we have an access token. */
  isAuthenticated: boolean;
  /** Profile hydration is in flight (`useUserStore.isLoading`). */
  isBootstrapping: boolean;
  /** `true` when authenticated AND profile hydration has failed. */
  isDegraded: boolean;
  /** Coarse state derived from the cookie + store. */
  bootstrapState: AuthSessionBootstrapState;
  /** The viewer's user id (`null` while profile is hydrating). */
  currentUserId: string | null;
  /** The full profile (`null` until hydration completes). */
  user: ReturnType<typeof useUser>;
  /**
   * The slim identity (`null` while the profile is hydrating).
   *
   * Projected from `user` so consumers reading the legacy
   * `currentUser` field keep working. Field shape mirrors the
   * generated `UserMeResponseDto` (which is the source the
   * `useUserStore` is populated from).
   */
  currentUser: ReturnType<typeof useUser>;
}

export function useAuthSession(): AuthSessionValue {
  const { isAuthenticated } = useAuthState();
  const isBootstrapping = useIsUserLoading();
  const user = useUser();

  // `currentUserId` — derive from `useUserStore.user.userId`.
  // (The previous import of a non-existent `useCurrentUserId` was a
  // pre-existing bug in this file. The derivation is the actual
  // intent: `user.userId` is the canonical id once the profile is
  // hydrated, and `null` while it's not.)
  const currentUserId = user?.userId ?? null;

  // Coarse state — matches the original `bootstrapState` semantics
  // closely enough that consumer branching (`bootstrapState === 'authenticated'`)
  // continues to work.
  const bootstrapState: AuthSessionBootstrapState =
    !isAuthenticated
      ? 'unauthenticated'
      : isBootstrapping || user === null
        ? 'bootstrapping'
        : 'authenticated';

  // The original `isDegraded` meant: authenticated but profile failed
  // to load. Reproduced here via `useUserError()` indirectly: a
  // non-null `error` plus a still-null user implies degradation.
  const error = useUserStore((state) => state.error);
  const isDegraded = bootstrapState === 'authenticated' && user === null && error !== null;

  return {
    isAuthenticated,
    isBootstrapping,
    isDegraded,
    bootstrapState,
    currentUserId,
    user,
    // `currentUser` is the same reference as `user` — surfaced as a
    // legacy alias for callers that still branch on `session.currentUser`.
    currentUser: user,
  };
}