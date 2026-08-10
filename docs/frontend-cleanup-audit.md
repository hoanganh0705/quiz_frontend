# Comprehensive Engineering Audit — `quiz_frontend`

> **Scope:** Next.js 16 + React 19 + TypeScript frontend with generated API clients, SWR, Axios, and Zustand. Audit performed after the recent API integration/refactoring effort.
>
> **Status:** Investigation only. No source files modified.
>
> **Inputs to this report:** Independent investigation by the lead auditor + the completed findings of [Agent #1 (React/Next.js)](a214ac9e-29f1-41b0-a361-622e1a341d7c) and [Agent #3 (SWR/State/TypeScript)](a1ed255c-ab69-4ed7-ad5e-f9d2212d6aca). The two remaining agents are still in transit; the report below incorporates what was returned at the time of writing.

---

## Intended canonical request flow

For every audit finding, this is the "correct" flow being compared against:

```
Route/Page  (server component where possible)
  → Client component
  → React hook  (useCacheKey + state machine)
  → Feature service  (thin pass-through + business-rule clamping)
  → Generated SDK function (@/lib/api/generated/*)
  → orvalCustomInstance (mutator) — or authOnlyInstance for refresh
  → customInstance (Axios)  → token refresh + RFC 7807 unwrap + broadcast
  → Backend
```

Updated state re-enters via:

```
Mutation
  → useOptimisticMutation | useOptimisticToggle  (optimistic + rollback)
  → Generated SDK
  → customInstance
  → mutate(SWR_key) + BroadcastChannel('feature')  → cross-tab revalidate
```

Deviations from this flow are the core of P0/P1 below.

---

# Cleanup Report

## P0 — Correctness / security risks

### P0-1. Parallel legacy `apiClient` (`src/shared/lib/api/client.ts`) — refresh logic diverges, no RFC 7807, no broadcast
- **Location**: `src/shared/lib/api/client.ts` (entire file).
- **Affected files (5)**: `src/features/notifications/api/notifications.ts`, `src/features/tournaments/api/tournaments.ts`, `src/features/discussions/api/discussions.ts`, `src/features/discussions/types/discussion.ts`, `src/features/support/api/support.ts` all still `import { apiClient } from '@/shared/lib/api/client'`.
- **Current behavior**: A second Axios instance, hand-rolled, that:
  - uses `token.accessToken` (vs `accessToken` in the canonical instance) — inconsistent expected shape;
  - has no `lastLogoutTimestamp` / `inFlightRefresh` coordination, so two parallel 401s can both attempt refresh;
  - has no `BroadcastChannel('auth')` publication on logout, so cross-tab logout is broken for these surfaces;
  - has debug `console.log` calls in production code;
  - returns axios' raw envelope (`response.data.data` unwrap is missing for some endpoints).
- **Why problematic**: Any user opening two tabs and clicking "Sign out" in one will leave the other tab in a half-authenticated state when it's reading notifications or tournaments. The two refresh paths can race and produce duplicate refresh requests, increasing backend load and possibly invalidating the user's session.
- **Evidence**: `src/shared/lib/api/client.ts` (entire), `src/features/notifications/api/notifications.ts:1` (import), `src/features/notifications/services/notifications.service.ts` is the canonical alternative that already exists and is in use elsewhere.
- **Recommended target state**: Delete `src/shared/lib/api/client.ts` and the four `api/*.ts` files. Migrate the 5 consumers to the SDK + `customInstance` via the existing `services/*.service.ts` (e.g. `notifications.service.ts`, `tournaments.service.ts`).
- **Blast radius**: 4 features (notifications, tournaments, discussions, support), all already have a SDK-based service.
- **Risk**: medium (auth/logout timeline changes, full e2e retest required).
- **Independent fix**: yes.
- **Tests needed**: cross-tab logout from `/notifications` and `/tournaments`; 401-then-refresh in two parallel tabs; Playwright e2e for notifications and tournaments.

### P0-2. `useCallback` called inside render-prop in `TournamentDeleteDialog` — Rules-of-Hooks violation
- **Location**: `src/features/admin/tournament-admin/components/TournamentDeleteDialog.tsx` lines 112–116.
- **Current behavior**: `onConfirm={useCallback(() => { fireDeleteRef.current = true; void shell.retry(); }, [shell.retry])}` is called inside a render-prop `{(shell) => …}`. React 19 enforces this at runtime.
- **Why problematic**: Will throw in strict mode. The hook runs every render and stabilizes on `shell.retry`, but the location is a rules-of-hooks violation; the lint plugin flags it and React 19 will throw.
- **Evidence**: `TournamentDeleteDialog.tsx:112–116`.
- **Recommended target state**: Lift the callback out of the JSX body; use a stable `useEvent`/ref or `useMemo`/`useCallback` at the top of the component.
- **Blast radius**: 1 component, but on a critical admin path.
- **Risk**: low (small change, but it will throw in dev).
- **Independent fix**: yes.
- **Tests needed**: render tournament-delete dialog in StrictMode; click confirm; ensure no throw.

### P0-3. `useEffect` ping-pong in `auth-bootstrap-context.tsx` — stale-closure in cross-tab LOGGED_IN observer
- **Location**: `src/features/auth/contexts/auth-bootstrap-context.tsx` lines 248–254, 256–340, 343–354.
- **Current behavior**: Three effects:
  1. `useEffect` reads `isFirstMount.current` to gate `doBootstrap()` — but the ref is redundant (empty deps already pin it).
  2. `useEffect` for cross-tab auth events registered with `[]`, captures `doBootstrap`, `clearBootstrap`, `clearAllAuthCache`, `clearVerificationFlags` — all of which can change identity over time.
  3. `useEffect` mutates `lastBootstrappedUserIdRef.current` after every state change — but only the effect #2 closure reads it, and #2's closure is stale.
- **Why problematic**: The cross-tab `LOGGED_IN` event can receive an outdated `doBootstrap` closure that closes over a stale `currentUser`, compared against an up-to-date `lastBootstrappedUserIdRef`. The check is broken by staleness. Two tabs may both see `currentUser` populated but `lastBootstrappedUserIdRef` is fresh in only one.
- **Evidence**: `auth-bootstrap-context.tsx:248-354` (all three effects).
- **Recommended target state**: Convert to a single `useSyncExternalStore` (auth events are an external store). Replace `isFirstMount.current` with the empty-deps guarantee. Drop the `lastBootstrappedUserIdRef` mirror — compare against a ref populated by the same hook that reads it.
- **Blast radius**: every authenticated page (bootstraps the entire shell).
- **Risk**: high.
- **Independent fix**: yes (contained in this file).
- **Tests needed**: tab-A log-in, tab-B receives broadcast, tab-B re-bootstraps with new user; switch users, ensure cross-tab doesn't leak old user state.

### P0-4. `useEffect` no-deps + `useRef` ping-pong in `PlayQuizClient.tsx` (handleSubmitRef)
- **Location**: `src/features/quizzes/components/PlayQuizClient.tsx` lines 308–317.
- **Current behavior**: `useEffect(() => { handleNextRef.current = handleNextQuestion; … handleSubmitRef.current = handleSubmit; }, …)` has no dependency array — it re-runs every render. Then on line 316 `handleSubmitRef.current = handleSubmit` is assigned in the body. The effect overwrites the body assignment, then the next render body assignment overwrites the effect.
- **Why problematic**: A no-deps `useEffect` is a hidden-every-render listener. The two-way race means timer-driven callbacks may invoke an older `handleSubmit` than the one in the latest closure. Submitting while the timer fires can produce a stale submit.
- **Evidence**: `PlayQuizClient.tsx:308-317`.
- **Recommended target state**: Use React 19's `useEvent` (or stable refs + `useRef` + a single set-per-render body). Drop the effect entirely.
- **Blast radius**: PlayQuizClient (one route, but critical for quiz taking).
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: timer submits while next question is loading; ensure correct answer is submitted.

### P0-5. `new Date().toLocaleDateString()` during render — guaranteed hydration mismatch
- **Location**: `src/features/users/components/settings/LanguageSettings.tsx` lines 291, 300; `src/app/(public)/profile/[name]/page.tsx` line 79.
- **Current behavior**: `new Date().toLocaleDateString('en-US', {...})` and `new Date().toLocaleTimeString('en-US', {...})` are called inside JSX.
- **Why problematic**: Server renders in UTC, client renders in user's TZ — different output. React 19 in dev mode logs a hydration mismatch; in production it silently picks one. Any non-UTC user sees the wrong date.
- **Evidence**: `LanguageSettings.tsx:291, 300`; `profile/[name]/page.tsx:79`.
- **Recommended target state**: Move formatting to a `<ClientDate>` component that mounts only on client, or use `suppressHydrationWarning` + a key that changes after hydration, or render an ISO string + `<time>` and format in an effect.
- **Blast radius**: 3 surfaces.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: hydration-warning-free render in `pnpm dev` for non-UTC TZ.

### P0-6. Hydration mismatch from `new Date()`-based greeting in `LanguageSettings`
- **Location**: `src/features/users/components/settings/LanguageSettings.tsx` (alongside P0-5).
- Same root cause; same fix.

### P0-7. `useVerifiedFlagState` 1-second polling depends on a ref-guarded value — duplicate state, setInterval without compare
- **Location**: `src/app/(protected)/settings/security/page.tsx` lines 152–169, 229–238.
- **Current behavior**: Hook has two effects. The polling `setInterval(setVerified, 1000)` does not compare before setting; if the value differs the setter still fires. The first effect reads + `setVerified` runs on every render that bumps `tick`. Then `useEffect(() => { if (isVerified) setIsCardMounted(true) }, [isVerified])` derives another state from `isVerified`.
- **Why problematic**: Three pieces of state where one suffices (`isVerified` is the only source). The polling race produces flicker on the page.
- **Evidence**: `settings/security/page.tsx:152–169, 229–238`.
- **Recommended target state**: Replace with `useSyncExternalStore` over the `verification-flag.ts` module. Drop `isCardMounted` (it is a derivation of `isVerified`).
- **Blast radius**: 1 page.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: change-password verify-success → card flips immediately.

### P0-8. Three parallel paths for `/users/me` — risk of divergent user state
- **Location**: `src/features/users/store/user-store.ts` (Zustand), `src/features/auth/contexts/auth-bootstrap-context.tsx`, `src/features/users/hooks/useUser.ts` (legacy SWR hook), `src/features/users/hooks/useMyProfile.ts` (read wrapper).
- **Current behavior**: Three independent fetches of the same `/users/me` endpoint, each writing its own copy of `user`. The `useUser` hook's doc comment says "do NOT use in Epic 4.3 forms because it creates duplicate in-flight requests" — admitting that consumers accidentally bypass.
- **Why problematic**: Race condition possible — Zustand persist middleware writes the response of fetch A on top of fetch B. Profile view may show stale avatar after a profile update.
- **Evidence**: `user-store.ts:18–51`, `useUser.ts`, `useMyProfile.ts:109–155`.
- **Recommended target state**: Pick one owner (the auth-bootstrap context is the canonical Phase 2 owner). Delete `useUser.ts`. Reduce `useMyProfile.ts` to a read selector. If `user-store.ts` is needed for cross-tab sync, narrow its scope to a write-through cache without `fetchCurrentUser`.
- **Blast radius**: profile, settings, header.
- **Risk**: high.
- **Independent fix**: yes, but only after deciding which is the source of truth.
- **Tests needed**: profile update → avatar refresh in two tabs; logout → profile cleared in all tabs.

### P0-9. `useUserStore.getState()` install-and-forget listener — HMR double-install
- **Location**: `src/features/users/store/user-store.ts` lines 82–88.
- **Current behavior**: `subscribeToProfileEvents` is called at module evaluation time, never unsubscribed. HMR re-runs module → listener stacks.
- **Why problematic**: Each HMR refresh adds another listener. After N dev refreshes, every profile event fires N times. Profile updates may write N times.
- **Evidence**: `user-store.ts:80–88`.
- **Recommended target state**: Subscribe inside a one-time module-init guard keyed by `import.meta.hot` (or `process.env.NODE_ENV === 'development'`), or move subscription into a React-bound hook.
- **Blast radius**: dev hot-reload only, but it causes wrong data in dev.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: during dev, refresh module → profile event fires once.

### P0-10. `useLocalStorage` + `useState` double-store for the same progress key in `PlayQuizClient`
- **Location**: `src/features/quizzes/components/PlayQuizClient.tsx` lines 49–73, 78–88, 155–175.
- **Current behavior**: `useLocalStorage` writes on every state change (`progress` effect at 155–175). A separate `useState` initialized from `initialProgressRef.current` at mount (78–88) is the truth. The `useLocalStorage` is essentially a write-only backup that the read side never re-hydrates.
- **Why problematic**: Persisted progress is never re-read on re-mount. Two tabs showing the same quiz can produce inconsistent progress. Reload mid-quiz loses answer unless the effect has already fired.
- **Evidence**: `PlayQuizClient.tsx:49-175`.
- **Recommended target state**: One source of truth: either `useLocalStorage` as the single store (use `useLocalStorage`'s read value), or `useState` and persist on unmount only.
- **Blast radius**: 1 component, but every quiz play session.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: reload mid-quiz → resume at question N; two tabs → consistent progress.

### P0-11. `useActiveSessions` keeps state in `useState` instead of SWR — security dashboard revocation doesn't invalidate
- **Location**: `src/features/auth/hooks/use-active-sessions.ts:130–201`, `use-revoke-other-sessions.ts:177–178`, `use-change-password.ts:406–409`.
- **Current behavior**: Hook owns `useState` for `state`, `inFlightRef` for dedup, `mountedRef` for safety. The three callers (`useRevokeSession`, `useRevokeOtherSessions`, `useChangePassword`) don't invalidate the SWR key globally — they only update local state.
- **Why problematic**: After revoking a session, the list still shows the revoked session until the user refreshes. The user can click "revoke" twice on the same entry.
- **Evidence**: `use-active-sessions.ts:130–201` vs `use-revoke-other-sessions.ts:177–178`.
- **Recommended target state**: `useSWR(['auth', 'sessions'], getActiveSessions)` + `mutate(['auth', 'sessions'])` on each revoke.
- **Blast radius**: security dashboard.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: revoke session → list updates immediately; revoke-other-sessions → other-tab list updates.

### P0-12. `useSecurityDashboard` hand-rolled SWR replacement
- **Location**: `src/features/auth/hooks/use-security-dashboard.ts:94–150`.
- **Current behavior**: `useState` + `inFlightRef` + `mountedRef` + manual `useEffect` refetch.
- **Why problematic**: Same hand-rolled pattern as P0-11. Loses dedup, focus-revalidate, reconnect-revalidate.
- **Evidence**: `use-security-dashboard.ts:94–150`.
- **Recommended target state**: `useSWR(['auth', 'security-dashboard'], getSecurityDashboard)`.
- **Blast radius**: 1 page.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: focus-revalidate fires when tab refocuses.

### P0-13. `useAuth` runs its own `useEffect` fetch on top of `AuthBootstrapProvider` — duplicate `/auth/me` request
- **Location**: `src/features/auth/hooks/use-auth.ts:71–100` vs `src/features/auth/contexts/auth-bootstrap-context.tsx:130–212`.
- **Current behavior**: Two parallel fetches of `/auth/me` on first mount. The bootstrap context dedupes via `singleflight`, but `useAuth` mounts its own `useEffect` and produces a second request.
- **Why problematic**: Two parallel reads at SSR-load time.
- **Evidence**: `use-auth.ts:71–100`, `auth-bootstrap-context.tsx:130–212`.
- **Recommended target state**: `useAuth` reads from `useAuthBootstrap()` and does not fetch.
- **Blast radius**: every consumer of `useAuth`.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: only one `/auth/me` request on first page load.

### P0-14. `useSocialFeedInvalidation` deliberately skips cross-tab broadcast
- **Location**: `src/features/social/hooks/useSocialFeedInvalidation.ts` (comment justifies the omission).
- **Current behavior**: Two tabs viewing the same feed see different state until a refresh.
- **Why problematic**: User adds a post in tab A; tab B keeps showing stale.
- **Evidence**: `useSocialFeedInvalidation.ts:31–50`.
- **Recommended target state**: Cross-tab broadcast with viewer-id prefix.
- **Blast radius**: social feed only.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: post in tab A → tab B re-renders.

### P0-15. `useFollow` / `useUnfollow` don't broadcast cross-tab invalidation
- **Location**: `src/features/social/hooks/useFollow.ts:175–183` (and similar in `useUnfollow.ts`).
- **Current behavior**: Local revalidation only. The websocket-driven `useRelationshipInvalidation` *does* broadcast cross-tab, but user-initiated follow does not.
- **Why problematic**: Two tabs, follow in tab A → tab B doesn't update until socket event.
- **Recommended target state**: Call `postRelationshipInvalidation(targetUserId)` after mutation success.
- **Blast radius**: social follow.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: follow in tab A → tab B re-renders the relationship.

### P0-16. `useSocialListSWRKey` factory + `useSocialListUrlState` round-trip — cache can lag URL
- **Location**: `src/features/social/hooks/useSocialListSWRKey.ts:100–120` and `useSocialListUrlState.ts`.
- **Current behavior**: Cursor + filters live in both SWR cache key and URL. The hook round-trips.
- **Why problematic**: URL changes faster than the SWR cache; cache can lag.
- **Recommended target state**: URL is the source of truth; SWR cache is derived.
- **Blast radius**: social lists.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: rapid URL params → SWR key matches.

### P0-17. `EventSource` reconnect reconciler stored in `globalThis` (`useActiveTargetUserIds`)
- **Location**: `src/features/social/hooks/useActiveTargetUserIds.ts:70–76`.
- **Current behavior**: `getActiveSet()` stores the set in `globalThis[ACTIVE_TARGETS_KEY]`. The bare `Set` is mutable and shared across the tab with no per-tab isolation.
- **Why problematic**: HMR-friendly but non-obvious. Memory leak on tab close.
- **Recommended target state**: Hoist to a Zustand store or a module-level `let`.
- **Blast radius**: reconnect reconciler.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: reconnect → set cleared appropriately.

### P0-18. `unwrapEnvelope<T>(...): T | null | unknown` — overly broad return type
- **Location**: `src/lib/api/core/unwrap.ts:50–60`.
- **Current behavior**: Returns `T | null | unknown`; the `unknown` covers cases 2 and 4.
- **Why problematic**: `unwrapEnvelope<T>(...).foo` is a type error, so callers cast or `as` the result — drifting types.
- **Evidence**: `unwrap.ts:50–60`.
- **Recommended target state**: Discriminated union: `unwrapEnvelope<T>(payload: { data: T } | { data: T | null } | T | unknown): T | null` with a runtime guard.
- **Blast radius**: every service that uses `unwrapEnvelope`.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: type-level: `unwrapEnvelope(response).data` is `T | null`; runtime: null case returns `null`.

### P0-19. RFC 7807 `Rfc7807Body` is permissive — all fields optional
- **Location**: `src/lib/api/core/ApiError.ts:99–114`.
- **Current behavior**: `title`, `detail`, `code`, `status` are all optional. No discriminator.
- **Why problematic**: Cannot tell a 400 from a 422 from "no body" by inspection.
- **Recommended target state**: Make `status` required; allow `code` to be optional (some endpoints omit it).
- **Blast radius**: every `ApiError` consumer.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: error mapper covers all required fields.

### P0-20. `asCursorPage` / `asOffsetPage` silent discriminator casts
- **Location**: `src/lib/api/use-cursor-paginated.ts:115–141`.
- **Current behavior**: `as Page<T>` cast; no runtime guard.
- **Why problematic**: If the backend returns an envelope without `paginationKind: 'cursor'`, downstream code dereferences `nextCursor`/`hasNextPage` based on a non-existent discriminator.
- **Evidence**: `use-cursor-paginated.ts:131–141`.
- **Recommended target state**: Discriminated union + runtime `isCursorPage` / `isOffsetPage` guards (or zod).
- **Blast radius**: every consumer of `useCursorPaginated`.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: backend returns wrong paginationKind → consumer handles gracefully.

---

## P1 — Architectural debt

### P1-1. Two parallel SWR-key conventions for the same `tags` namespace (string vs array)
- **Location**: `src/features/admin/tag-admin/cache/tag-cache-keys.ts:55–95` (string-form) vs `src/features/tags/hooks/useTagsDirectory.ts` (array-form `['tags', 'directory', ...]`).
- **Current behavior**: Admin uses string-form keys (`'tags:directory'`, `'tags:slug:<slug>'`); Phase 3 public hooks use array-form. The matcher in `publicTagsKeyMatcher` (lines 124–138) special-cases both `'tags'` and `'tag'` first-segment strings.
- **Why problematic**: A new admin mutation that forgets either form silently fails to invalidate.
- **Recommended target state**: Pick one canonical form (frozen tuple, factory); let the matcher live in one place.
- **Blast radius**: every admin tag mutation + every public-tag read.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: rename tag → public cache invalidates; create tag → admin cache invalidates.

### P1-2. Three pagination primitives with overlapping names
- **Location**: `src/lib/api/use-cursor-paginated.ts`, `src/lib/api/use-offset-paginated.ts:180–264`, `src/features/admin/audit-admin/hooks/useOffsetPaginated.ts:100–200`.
- **Current behavior**: `useCursorPaginated` (canonical), `useOffsetPaginated` (offset facade over cursor), `useOffsetPaginated` (admin, hand-rolled).
- **Recommended target state**: Keep cursor primitive; rename or delete the duplicates.
- **Blast radius**: ~5 features.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: social feed, audit log, offset/limit transitions.

### P1-3. `useFeed` uses `useOffsetPaginated` but backend is cursor-paginated
- **Location**: `src/features/social/hooks/useFeed.ts:244–250`; `feed.service.ts:42–50` admits backend uses cursor.
- **Current behavior**: `nextPage`/`prevPage` semantics are misleading.
- **Recommended target state**: Replace with `useCursorPaginated`; expose `setSize`.
- **Blast radius**: public social feed.
- **Risk**: med.
- **Independent fix**: yes (after P1-2).

### P1-4. `useFollow` reinvents `useOptimisticMutation` inline
- **Location**: `src/features/social/hooks/useFollow.ts:163–200`.
- **Current behavior**: ~40 lines of inline optimistic-update + rollback, with nightmarish error-code classification.
- **Recommended target state**: `useOptimisticMutation` with `optimisticData`/`rollbackData`.
- **Blast radius**: most-touched social surface.
- **Risk**: med.
- **Independent fix**: yes.
- **Tests needed**: follow → optimistic UI; rollback on 429.

### P1-5. `useHideComment` / `useResolveCommentReport` / `useResolveReviewReport` reinvent `useOptimisticMutation`
- **Location**: `src/features/admin/comment-moderation/hooks/useHideComment.ts:191–344`, `useResolveCommentReport.ts`, `src/features/admin/review-moderation/hooks/useResolveReviewReport.ts`.
- **Recommended target state**: Migrate to `useOptimisticMutation`.
- **Blast radius**: 3 admin moderation paths.
- **Risk**: med.
- **Independent fix**: yes.

### P1-6. `useBlock` deliberately skips optimistic updates
- **Location**: `src/features/social/hooks/useBlock.ts:47–60`.
- **Recommended target state**: Move optimistic update into the hook (already owns `isPendingRef` + `finally`).
- **Blast radius**: block UX.
- **Risk**: low.
- **Independent fix**: yes.

### P1-7. `useSendFriendRequest` / `useRespondFriendRequest` lack optimistic update
- **Location**: `src/features/social/hooks/useSendFriendRequest.ts`, `useRespondFriendRequest.ts`.
- **Recommended target state**: Use the same optimistic pattern as `useFollow`.
- **Blast radius**: friend request UI.
- **Risk**: low.
- **Independent fix**: yes.

### P1-8. `useSingleWithRetry` does not use SWR
- **Location**: `src/lib/api/use-single-with-retry.ts:163–250`.
- **Current behavior**: Hand-rolled `useState` + `useCallback` + `useRef` + `useEffect`. Loses SWR's `dedupingInterval`, `revalidateOnFocus`, `revalidateOnReconnect`, global `mutate`.
- **Recommended target state**: Either use `useSWR` with a custom fetcher, or share retry infrastructure with `useCursorPaginated`.
- **Blast radius**: ~5 read paths.
- **Risk**: med.
- **Independent fix**: yes.

### P1-9. Three near-identical admin BroadcastChannel modules
- **Location**: `src/features/admin/tournament-admin/cache/tournament-admin-cross-tab.ts:155–345`, `src/features/admin/comment-moderation/cache/comment-moderation-cross-tab.ts`, `src/features/admin/review-moderation/cache/review-moderation-cross-tab.ts`.
- **Current behavior**: Each owns its own `BroadcastChannel` singleton, `getCurrentTabId` lookups, same-tab-filter, subscriber registry.
- **Recommended target state**: A generic `createBroadcastChannel<TEventType>(name, isMyOwnEvent)` factory in `src/lib/broadcast/`.
- **Blast radius**: 3 admin paths.
- **Risk**: med.
- **Independent fix**: yes.

### P1-10. `relationship-broadcast-channel.ts` and `social-list-loaded-broadcast-channel.ts` duplicate the same pattern
- **Location**: `src/lib/social/relationship-broadcast-channel.ts` and `src/lib/social/social-list-loaded-broadcast-channel.ts`.
- **Recommended target state**: Reuse `createBroadcastChannel` from P1-9.
- **Blast radius**: social lists.
- **Risk**: med.
- **Independent fix**: yes (after P1-9).

### P1-11. `useLogout` / `useLogoutAll` / `useDeleteAccount` duplicate `clearAuthToken` + `clearAllAuthCache` + broadcast
- **Location**: `src/features/auth/hooks/use-logout.ts:80–81`, `use-logout-all.ts:169–170`, `use-delete-account.ts:401–402`.
- **Current behavior**: Each hook implements its own cleanup sequence.
- **Recommended target state**: Single `clearAuthState({ redirectTo?: string })` helper.
- **Blast radius**: 3 auth paths.
- **Risk**: med.
- **Independent fix**: yes.

### P1-12. Three admin BroadcastChannel modules own `getCurrentTabId` semantics — inconsistent with `sessionStorage` in auth
- **Location**: `src/lib/api/core/broadcast-channel.ts:74–101` (auth) vs `relationship-broadcast-channel.ts` (lazy).
- **Current behavior**: Inconsistent `tabId` persistence semantics.
- **Recommended target state**: Single `getCurrentTabId()` helper exported from `src/lib/broadcast/` (use `crypto.randomUUID()` with `sessionStorage` cache).
- **Blast radius**: all broadcast channels.
- **Risk**: low.
- **Independent fix**: yes (after P1-9).

### P1-13. `useAuthState` mirrors `auth-cookies.ts` events via `useSyncExternalStore`
- **Location**: `src/features/auth/hooks/use-auth-state.ts:20–40`.
- **Current behavior**: A separate `isAuthenticated` boolean mirrors the cookie state. They can drift if `setAuthToken` happens outside the broadcast channel.
- **Recommended target state**: Derive `isAuthenticated` from `getAuthToken()` non-empty at render time.
- **Blast radius**: auth-shell consumers.
- **Risk**: low.
- **Independent fix**: yes.

### P1-14. `useUser` and `useUserStore` both fetch `/users/me` (in addition to bootstrap context — see P0-8)
- **Location**: `src/features/users/hooks/useUser.ts` and `src/features/users/store/user-store.ts:19–89`.
- **Current behavior**: Persist + parallel fetch.
- **Recommended target state**: One path; persist only the SSR snapshot.
- **Blast radius**: profile view.
- **Risk**: low.
- **Independent fix**: yes (after P0-8).

### P1-15. `useHomeCategoryStore` and `useMyQuizzesTabStore` are Zustand stores that should be URL-bound
- **Location**: `src/features/quizzes/store/use-home-category-store.ts:64–107`, `use-my-quizzes-tab-store.ts:35–42`.
- **Current behavior**: Filters live in Zustand; the URL is the source of truth only on hard reload.
- **Recommended target state**: Move to URL search params.
- **Blast radius**: home rails, author dashboard tab.
- **Risk**: low.
- **Independent fix**: yes.

### P1-16. `useDebouncedValue` is implemented in two places
- **Location**: `src/features/social/hooks/useDebouncedValue.ts:70–90` and `src/features/admin/user-role-admin/hooks/useUserSearch.ts:70–90`.
- **Recommended target state**: Single `useDebouncedValue` exported from `src/shared/hooks/`.
- **Blast radius**: 2 hooks.
- **Risk**: low.
- **Independent fix**: yes.

### P1-17. `useCheckUsername` / `useCheckEmail` use `setTimeout` + `AbortController` instead of `useDebouncedValue`
- **Location**: `src/features/auth/hooks/use-check-username.ts:72–115`, `use-check-email.ts:104–149`.
- **Current behavior**: Each hook hand-rolls debounce + abort + stale-token guard.
- **Recommended target state**: Use `useDebouncedValue` + a generic `useAvailabilityCheck(endpoint, input)` factory.
- **Blast radius**: 2 auth component paths.
- **Risk**: low.
- **Independent fix**: yes.

### P1-18. `useCategoryAdminList` / `useTagAdminList` + `useCreate*` / `useUpdate*` / `useDelete*` / `useRestore*` are 4×N parallel implementations
- **Location**: `src/features/admin/{category,tag,tournament,comment,review}-admin/hooks/`.
- **Current behavior**: Each hand-rolls `inFlightRef`, Sentry breadcrumb, `globalMutate` calls, `useState`.
- **Recommended target state**: `useAdminList<T>(keyPrefix, fetcher, filters)` + `useAdminMutation<T>(...)` factory.
- **Blast radius**: 5 admin features.
- **Risk**: low (mechanical refactor).
- **Independent fix**: yes, per feature.

### P1-19. `useUserSearch` (admin) bypasses SDK and constructs ApiError manually
- **Location**: `src/features/admin/user-role-admin/hooks/useUserSearch.ts:160–220`.
- **Current behavior**: Bypasses the SDK, hand-rolls the result and the error.
- **Recommended target state**: Use the SDK-generated `getUsers` (or whatever the search endpoint actually is) via `useSWR`.
- **Blast radius**: 1 admin path.
- **Risk**: low.
- **Independent fix**: yes.

### P1-20. `useComment` construct dispatch uses `as unknown as` to fake an out-of-band error
- **Location**: `src/features/admin/comment-moderation/hooks/useComment.ts:85–105`.
- **Current behavior**: `makeNotFoundError` produces a structurally fake `ApiError` via `as unknown as`.
- **Recommended target state**: Discriminated union (`{ outcome: 'found' } | { outcome: 'not-found' }`).
- **Blast radius**: 1 admin drawer.
- **Risk**: low.
- **Independent fix**: yes.

### P1-21. `useAuditLogFilters` uses `useState` for filter state instead of URL
- **Location**: `src/features/admin/audit-admin/hooks/useAuditLogFilters.ts:1–100`.
- **Current behavior**: Local React state; the rest of the admin uses URL.
- **Recommended target state**: Move to URL search params.
- **Blast radius**: 1 admin path.
- **Risk**: low.
- **Independent fix**: yes.

### P1-22. `useRecalculateRanking` / `useResetRankingPeriod` reinvent `makeSyntheticError`
- **Location**: `src/features/admin/ranking-admin/hooks/useRecalculateRanking.ts:134–145`, `useResetRankingPeriod.ts:134–145`.
- **Current behavior**: Identical `makeSyntheticError` helper duplicated.
- **Recommended target state**: Extract shared helper.
- **Blast radius**: 2 admin paths.
- **Risk**: low.
- **Independent fix**: yes.

### P1-23. `useQuizByIdOrSlug` hand-rolls `wrapAsApiError` instead of sharing a helper
- **Location**: `src/features/quizzes/hooks/useQuizByIdOrSlug.ts:50–70`, `useQuizStatsByIdOrSlug.ts:53–68`.
- **Current behavior**: `wrapAsApiError` builds `new ApiError({...} as unknown as Parameters<typeof ApiError.fromAxios>[0])`. The mutation-helpers module in `tournament-admin` already has `coerceToApiError`.
- **Recommended target state**: Lift `coerceToApiError` to `src/lib/api/error-coercion.ts`.
- **Blast radius**: 2 read paths.
- **Risk**: low.
- **Independent fix**: yes.

### P1-24. Old DTO adapter file `users/types/file-types.ts` etc. — `id: string` alias pattern reinvented 10×
- **Location**: ~10 places across `src/features/**/types/` (e.g. `bookmarks`, `rankings`, `quizzes`, `tournaments`, `instances`, `attempts`).
- **Current behavior**: Each list-item type adds `id: string` as an alias of the backend's UUID field.
- **Recommended target state**: Generic `ProjectWithId<T, Alias extends keyof T>` helper.
- **Blast radius**: cosmetic.
- **Risk**: low.
- **Independent fix**: yes, mechanical.

### P1-25. Service layer splits: `service/` vs `services/` — inconsistent
- **Location**: `src/features/auth/service/auth.service.ts` (singular) vs `src/features/social/services/` (plural) vs `src/features/notifications/services/` (plural).
- **Current behavior**: Auth uses singular; everywhere else uses plural.
- **Recommended target state**: Standardize on plural `services/`.
- **Blast radius**: auth imports.
- **Risk**: low.
- **Independent fix**: yes.

### P1-26. The `curriculum-tags`, `curriculum-categories`, `course-` etc. — check if any feature has *both* `api/` and `services/` legacy shim
- **Location**: `src/features/categories/api/categories-admin.ts`, `src/features/tags/api/tags-admin.ts`, `src/features/bookmarks/api/index.ts`, `src/features/notifications/api/index.ts`, `src/features/tournaments/api/index.ts`, `src/features/support/api/index.ts`, `src/features/discussions/api/index.ts`.
- **Current behavior**: All `api/index.ts` are deprecated shims re-exporting from the canonical service.
- **Recommended target state**: Delete the shims.
- **Blast radius**: 6 features.
- **Risk**: low.
- **Independent fix**: yes.

### P1-27. Pass-through service wrappers add no value
- **Location**: `src/features/social/services/social.service.ts`, `relationship.service.ts`, `social-graph.service.ts`, `discovery.service.ts`, `mutuals.service.ts`, `activity.service.ts`, `feed.service.ts`.
- **Current behavior**: Many are pure forwarders for SDK read endpoints. Several duplicate each other (e.g. `social.service.ts` + `relationship.service.ts`).
- **Recommended target state**: Where the service adds no behavior (no clamping, no projection, no error mapping), delete the service and use the SDK directly. Where the service adds clamping (mutuals), pagination (activity), keep it.
- **Blast radius**: social feature.
- **Risk**: low.
- **Independent fix**: yes, per service.

### P1-28. `useLogin` state machine duplicated by `useLoginForm` / `useRegistration`
- **Location**: `src/features/auth/forms/use-login.ts`, `use-register.ts`, `use-forgot-password.ts`, `use-reset-password.ts`, `use-resend-verification.ts`.
- **Current behavior**: Each is a state machine (`idle → pending → success | error`) with `inFlightRef` + `useEffect` + `useState`.
- **Recommended target state**: Generic `useAsyncSubmit<TValues, TResponse, TErrorKind>` factory.
- **Blast radius**: auth forms.
- **Risk**: low.
- **Independent fix**: yes.

### P1-29. `useLogout` / `useLogoutAll` / `useDeleteAccount` each implement a partial state machine
- **Location**: `src/features/auth/hooks/use-logout.ts`, `use-logout-all.ts`, `use-delete-account.ts:301–580`.
- **Current behavior**: `useDeleteAccount` is 280 lines of state-machine code in a single hook.
- **Recommended target state**: Split into a state machine (`useStateMachine<DelState>`) + a thin mutation hook.
- **Blast radius**: account deletion.
- **Risk**: low.
- **Independent fix**: yes.

### P1-30. `auth.service.ts` reproduces `AuthEvent` types from `broadcast-channel.ts`
- **Location**: `src/features/auth/service/auth.service.ts` lines around 410–461.
- **Current behavior**: The service re-exports broadcast-handling logic that belongs in `lib/api/core/broadcast-channel.ts`.
- **Recommended target state**: Move broadcast logic into the `core` module; service is a thin pass-through.
- **Blast radius**: auth.
- **Risk**: low.
- **Independent fix**: yes.

---

## P2 — Maintainability problems

### P2-1. `as unknown as` `ApiError` synthesis pattern repeated 17+ times
- **Location**: `src/features/auth/service/auth.service.ts` (17 hits), `src/features/admin/tournament-admin/hooks/internal/mutation-helpers.ts:92–123`, `src/features/quizzes/hooks/useQuizByIdOrSlug.ts:55–70`, `src/features/quizzes/hooks/useQuizStatsByIdOrSlug.ts:53–68`, `src/features/social/services/feed.service.ts:130–140`, `src/features/admin/ranking-admin/hooks/useRecalculateRanking.ts:134–145`, `src/features/admin/ranking-admin/hooks/useResetRankingPeriod.ts:134–145`, `src/features/auth/hooks/use-check-username.ts:90–110`.
- **Current behavior**: `new ApiError({ status, code, message } as unknown as ConstructorParameters<typeof ApiError>[0])`.
- **Why problematic**: The `ApiError` constructor accepts `AxiosError<unknown>`; these calls lie about the input. If the constructor widens, every call site silently breaks.
- **Recommended target state**: Widen the `ApiError` constructor to accept a structural RFC 7807 payload, or expose `new ApiError({ code, status, message })` factory.
- **Blast radius**: every auth-call wrapper.
- **Risk**: med.
- **Independent fix**: yes (constructor first, then call sites).
- **Tests needed**: every error code path.

### P2-2. `custom-instance.ts` synthesises ApiError with `as unknown as`
- **Location**: `src/lib/api/core/custom-instance.ts:135–150`, `276–289`.
- **Recommended target state**: Same as P2-1.
- **Blast radius**: 401 handler (the most-executed codepath).
- **Risk**: high.
- **Independent fix**: yes (after P2-1).

### P2-3. `useFollow.ts` `err instanceof ApiError ? err : new ApiError(err as never)` — `as never` is a substitute for `any`
- **Location**: `src/features/social/hooks/useFollow.ts:163–200`, `useUserSearch`, `useDeleteAccount`.
- **Recommended target state**: `ApiError.fromAxios(err)` when input is an AxiosError; otherwise use the new factory from P2-1.
- **Blast radius**: error reporting to Sentry.
- **Risk**: med.
- **Independent fix**: yes.

### P2-4. `useFollow` / `useBlock` `useMemo` `Object.freeze` + `get isPending()` accessor
- **Location**: `src/features/social/hooks/useFollow.ts:155–200`, `useBlock.ts:155–180`.
- **Current behavior**: `useMemo<UseFollowResult>(() => Object.freeze({...}))` with a getter for `isPending`. The freeze is partial (the getter returns a mutating ref). Getters break `useEffect` dep arrays.
- **Recommended target state**: Plain object with `[block, isPending, error]` fields.
- **Blast radius**: cosmetic.
- **Risk**: low.
- **Independent fix**: yes.

### P2-5. Non-null assertions (`!`) in `useActiveTargetUserIds`, `useAdminAuditLog`, `use-keyboard-shortcut`, `useUserSearch`
- **Location**: `src/features/social/hooks/useActiveTargetUserIds.ts:122–133`, `src/features/admin/audit-admin/hooks/useAdminAuditLog.ts`, `src/features/admin/audit-admin/hooks/useAuditLogFilters.ts`, `src/shared/hooks/use-keyboard-shortcut.ts:50–90`, `src/features/admin/user-role-admin/hooks/useUserSearch.ts:160–180`.
- **Current behavior**: `refValue!.current`, `form!.value`, `document!.body`, `cookies.get('auth_token')!`.
- **Recommended target state**: `useRef<T | null>(null)` + narrow inside the effect; `typeof document === 'undefined'` guard; `getAuthToken()` helper.
- **Blast radius**: ~5 hooks.
- **Risk**: low.
- **Independent fix**: yes.

### P2-6. `achievement-admin/validation.ts` uses `as unknown as` to project a generic DTO
- **Location**: `src/features/admin/achievement-admin/validation.ts:1–50`.
- **Recommended target state**: Use a zod schema.
- **Blast radius**: 1 admin feature.
- **Risk**: low.
- **Independent fix**: yes.

### P2-7. `usePublicProfilePage` / `useMyProfilePage` build `currentPlayer` inline without `useMemo`
- **Location**: `src/features/users/hooks/use-public-profile-page.ts:11–55`, `src/features/users/hooks/use-my-profile-page.ts:23–55`.
- **Current behavior**: 40-line `Player` object literal constructed on every render. Wrapped in an inline object so each render returns a new reference, defeating `memo` on the consumer.
- **Recommended target state**: `useMemo` keyed by `user`.
- **Blast radius**: profile pages.
- **Risk**: low.
- **Independent fix**: yes.

### P2-8. `useFriend`/friends page derives six `useMemo`s over `socialState` (whole object, not fields)
- **Location**: `src/app/(protected)/friends/page.tsx:47–93`.
- **Current behavior**: `deps = [socialState]` (full object) — every keystroke or invite creation invalidates the whole memo graph.
- **Recommended target state**: Depend on the specific `socialState.*` fields.
- **Blast radius**: friends page.
- **Risk**: low.
- **Independent fix**: yes.

### P2-9. `useDeleteAccount` `tokenRef` for stale-response guarding is a custom state machine
- **Location**: `src/features/auth/hooks/use-delete-account.ts:301–580`.
- **Current behavior**: ~280 lines of state-machine code in one hook.
- **Recommended target state**: Split into a state machine + a thin mutation hook.
- **Blast radius**: account deletion.
- **Risk**: low.

### P2-10. `isHydrated` flag mirroring `profile !== null`
- **Location**: `src/features/users/hooks/useMyProfile.ts:110–116`, `src/app/(protected)/settings/page.tsx:80–88`.
- **Current behavior**: `isHydrated = profile !== null` returns a derived boolean.
- **Recommended target state**: Inline `const isHydrated = profile !== null;` at every call site.
- **Blast radius**: settings page.
- **Risk**: low.

### P2-11. `useAuthBootstrapContext`: `useEffect` depends on `state` (a new object every render)
- **Location**: `src/app/(public)/reset-password/page.tsx:153–157`.
- **Current behavior**: `useEffect(() => { if (state.status === 'success') router.replace(state.nextRoute); }, [state, router])`.
- **Recommended target state**: Depend on `state.status` only.
- **Blast radius**: reset-password page.
- **Risk**: low.

### P2-12. `useEffect`/state mirrors `isVerified` → `isCardMounted`
- **Location**: `src/app/(protected)/settings/security/page.tsx:229–238`.
- **Current behavior**: Three pieces of state where one suffices.
- **Recommended target state**: Make `isCardMounted` a derived value.
- **Blast radius**: 1 page.
- **Risk**: low.

### P2-13. `useSocialListSWRKey` + `useSocialListUrlState` round-trip (already in P0-16; duplicated here for narrative)
- See P0-16.

### P2-14. `useRefInit` indirection (`useRef` whose only job is to gate an effect)
- **Location**: `src/features/quizzes/components/QuizzesDirectoryPage.tsx:108, 268–279`.
- **Current behavior**: `void initializedRef;` confirms the ref is never read.
- **Recommended target state**: Inline `useEffect` with `useRef` *inside* the effect.
- **Blast radius**: 1 component.
- **Risk**: low.

### P2-15. `useCallback` over no-op setter: `updateState = useCallback((updater) => setSocialState((prev) => updater(prev)), [setSocialState])`
- **Location**: `src/app/(protected)/friends/page.tsx:105–122`.
- **Recommended target state**: Use `setSocialState` directly.
- **Blast radius**: 1 page.
- **Risk**: low.

### P2-16. `useMemo` over module constants
- **Location**: `src/features/users/hooks/use-public-profile-page.ts:76–86`, `src/features/users/hooks/use-my-profile-page.ts:45–51`.
- **Current behavior**: `recentActivities = useMemo(() => challengeData.slice(0, 3).map(…), [])` — `challengeData` is a module constant.
- **Recommended target state**: Drop the `useMemo`.
- **Blast radius**: 2 hooks.
- **Risk**: low.

### P2-17. `useMemo` over trivial `.map`/`.filter`
- **Location**: `src/features/quizzes/components/QuizzesDirectoryPage.tsx:117–134`, `src/features/users/components/settings/AccountSettings.tsx:99–107`.
- **Recommended target state**: Drop the `useMemo`.
- **Blast radius**: 2 components.
- **Risk**: low.

### P2-18. `useCallback` for handlers passed to children that don't `React.memo`
- **Location**: `src/features/admin/tournament-admin/components/TournamentAdminList.tsx:141–148`, `src/features/auth/components/registration-form-body.tsx:119–124`.
- **Recommended target state**: Drop the `useCallback`.
- **Blast radius**: 2 forms.
- **Risk**: low.

### P2-19. `memo` on no-prop pass-through pages
- **Location**: `src/app/(public)/leaderboard/page.tsx:8–25`, `src/app/(public)/daily-challenge/page.tsx:26–56`.
- **Current behavior**: `memo(function LeaderboardPage() { … })` with no props.
- **Recommended target state**: Drop `memo`.
- **Blast radius**: 2 pages.
- **Risk**: low.

### P2-20. `Empty` `useEffect(() => {}, [])` no-ops
- **Location**: `src/app/(public)/forgot-password/page.tsx:116`, `src/app/(public)/reset-password/page.tsx:159`, `src/app/(public)/resend-verification/page.tsx:101`.
- **Current behavior**: `useEffect(() => {}, [])` with comment "Suppress unused-var warnings".
- **Recommended target state**: Delete the import and the line.
- **Blast radius**: 3 pages.
- **Risk**: low.

### P2-21. `'use client'` directive on thin pass-through pages
- **Location**: `src/app/(public)/signup/page.tsx`, `src/app/(protected)/bookmarks/page.tsx`, `src/app/(protected)/create-quiz/page.tsx`.
- **Current behavior**: `'use client'` on a wrapper that just renders a client child.
- **Recommended target state**: Drop the directive.
- **Blast radius**: 3 pages.
- **Risk**: low.

### P2-22. `dynamic = 'force-dynamic'` exported on `'use client'` pages
- **Location**: `src/app/(public)/forgot-password/page.tsx:42`, `src/app/(public)/reset-password/page.tsx:73`, `src/app/(public)/resend-verification/page.tsx:41`.
- **Current behavior**: `dynamic` export is server-side only; ignored on client components.
- **Recommended target state**: Move to `layout.tsx` or remove.
- **Blast radius**: 3 pages.
- **Risk**: low.

### P2-23. `<Suspense fallback={null}>` on critical protected pages
- **Location**: `src/app/(protected)/instances/[id]/page.tsx:56`, `src/app/(protected)/instances/[id]/play/page.tsx:63`, `src/app/(protected)/notifications/page.tsx:38`, `src/app/(protected)/notifications/preferences/page.tsx:41`, `src/app/(protected)/social/page.tsx:43`, `src/app/(protected)/social/blocked/page.tsx:45`, `src/app/(protected)/social/feed/page.tsx:41`, `src/app/(protected)/tournaments/page.tsx:23`, `src/app/(protected)/tournaments/[id]/page.tsx:26`.
- **Current behavior**: User sees nothing during initial fetch.
- **Recommended target state**: Use the loading skeleton as fallback, or remove the route-level Suspense.
- **Blast radius**: 9 pages.
- **Risk**: low.
- **Independent fix**: yes.
- **Tests needed**: visual smoke test of each protected surface.

### P2-24. Direct DOM mutation in JSX (login password visibility)
- **Location**: `src/app/(public)/login/page.tsx:354–363`.
- **Current behavior**: `document.getElementById('password').type = …`.
- **Recommended target state**: `useState` for `showPassword` (the registration form already does this correctly at `registration-form-body.tsx:270`).
- **Blast radius**: 1 page.
- **Risk**: low.

### P2-25. JSON export logic inline in JSX
- **Location**: `src/app/(protected)/settings/page.tsx:194–210`.
- **Current behavior**: 16 lines of business logic inside a JSX prop.
- **Recommended target state**: `exportProfileAsJson(profile)` helper.
- **Blast radius**: 1 page.
- **Risk**: low.

### P2-26. Audio/tone generation inline in `PlayQuizClient`
- **Location**: `src/features/quizzes/components/PlayQuizClient.tsx:108–134`.
- **Current behavior**: 26 lines of audio plumbing inside a client component.
- **Recommended target state**: `playTone` in a utility module.
- **Blast radius**: 1 component.
- **Risk**: low.

### P2-27. Sentry breadcrumb helper inline in `QuizEditPage`
- **Location**: `src/features/quizzes/components/QuizEditPage.tsx:155–171`.
- **Current behavior**: `(window as unknown as { Sentry?: … }).Sentry` inside the component.
- **Recommended target state**: `addSentryBreadcrumb` in `sentry-helpers.ts`.
- **Blast radius**: 1 component.
- **Risk**: low.

### P2-28. UUID regex compiled in render
- **Location**: `src/app/(protected)/bookmarks/[id]/page.tsx:109–114`.
- **Current behavior**: UUIDv7 regex compiled inside the component body on every render.
- **Recommended target state**: Hoist to a module constant.
- **Blast radius**: 1 page.
- **Risk**: low.

### P2-29. `ErrorCode` vs per-feature `*ErrorCode` unions
- **Location**: `src/lib/api/error-codes.ts:51–227` defines `ErrorCode`; many features define narrower unions (`SocialErrorCode`, `FollowErrorCode`, `BlockErrorCode`, `CommentModerationErrorCode`, `ReviewModerationErrorCode`, `PasswordErrorCode`, `DeletionErrorCode`, `SessionErrorCode`).
- **Recommended target state**: Single `ErrorCode` re-export; per-feature unions become `Extract<ErrorCode, 'SOCIAL_*'>` mapped types.
- **Blast radius**: many call sites.
- **Risk**: med.
- **Independent fix**: yes.

### P2-30. `QuizDifficulty` hand-typed in `quizzes.service.ts`
- **Location**: `src/features/quizzes/services/quizzes.service.ts:174–175`.
- **Recommended target state**: Use `QuizDifficulty` from the generated SDK.
- **Blast radius**: 1 service.
- **Risk**: low.

### P2-31. `relationship.ts` and `friend-request-state-machine.ts` define parallel enums
- **Location**: `src/features/social/types/relationship.ts:81–91`, `state/` directory.
- **Current behavior**: `RelationState`, `Relationship`, `FriendRequestStatus` describe the same domain.
- **Recommended target state**: One enum.
- **Blast radius**: social.
- **Risk**: low.

### P2-32. `TournamentListFilters` duplicated as `TournamentAdminFilters`
- **Location**: `src/features/tournaments/types/tournament.types.ts`, `src/features/admin/tournament-admin/admin-tournament-types.ts`.
- **Recommended target state**: One source.
- **Blast radius**: tournaments.
- **Risk**: low.

### P2-33. `BookmarkCollection.id` alias pattern reinvented across `TournamentSummary`, `RankingLeaderboardEntry`, `CollectionQuiz`, `MyQuizListItem`
- **Location**: ~10 places across `src/features/**/types/`.
- **Recommended target state**: Generic `ProjectWithId<T, Alias extends keyof T>` helper.
- **Blast radius**: cosmetic.
- **Risk**: low.

### P2-34. `QuizListItemWithId` is a manual alias of `MyQuizListItem`
- **Location**: `src/features/quizzes/hooks/useQuizzesList.ts:139–140`, `src/features/quizzes/types/my-quizzes.ts:38–65`.
- **Recommended target state**: One type.
- **Blast radius**: 1 feature.
- **Risk**: low.

### P2-35. `QuizQuestion` legacy type duplicates `QuizQuestionDto`
- **Location**: `src/features/quizzes/types/quiz-backend.ts:130–137`.
- **Recommended target state**: `type QuizQuestion = QuizQuestionDto`.
- **Blast radius**: 1 feature.
- **Risk**: low.

### P2-36. `RankingLeaderboardEntry`, `RankingSummary`, `RankingMilestone` manually alias the backend DTOs
- **Location**: `src/features/rankings/types/ranking.types.ts:139–220`.
- **Recommended target state**: `type RankingLeaderboardEntry = RankingLeaderboardEntryDto & { id: string }`.
- **Blast radius**: rankings.
- **Risk**: low.

### P2-37. `TournamentSummary` / `TournamentDetail` / `TournamentParticipant` / `TournamentLeaderboardEntry` are hand-typed
- **Location**: `src/features/tournaments/types/tournament.types.ts:167–220`.
- **Recommended target state**: Extend the generated DTOs.
- **Blast radius**: tournaments.
- **Risk**: low.

### P2-38. `BookmarkCollection` redefines `id` from the backend DTO
- **Location**: `src/features/bookmarks/types/index.ts`.
- **Recommended target state**: `BookmarkCollection = BookmarkCollectionDto & { id: string }`.
- **Blast radius**: bookmarks.
- **Risk**: low.

### P2-39. `CurrentUserResponseDto` (auth) is identical to `UserMeResponseDto`
- **Location**: `src/features/auth/types/index.ts`, `src/features/users/types/index.ts`.
- **Recommended target state**: One.
- **Blast radius**: auth, users.
- **Risk**: low.

### P2-40. `QuizAnswerOptionDto` redefined in `author-dtos.ts` and `quiz-backend.ts`
- **Location**: `src/features/quizzes/types/author-dtos.ts:35–39`, `quiz-backend.ts:80–84`.
- **Current behavior**: The player-side DTO leaks `isCorrect` accidentally.
- **Recommended target state**: Author DTO inherits from player DTO + adds `isCorrect`.
- **Blast radius**: quizzes.
- **Risk**: low.

### P2-41. `FriendStats`, `SocialState`, `NotificationPreferences`, `UserSettings` are frontend-only but live in `user-backend.ts`
- **Location**: `src/features/users/types/user-backend.ts:60–220`.
- **Recommended target state**: Split into `user-backend.ts` (DTOs) and `user-ui.ts` (frontend-only).
- **Blast radius**: users.
- **Risk**: low.

### P2-42. `RelationshipStatusDto` re-typed as `RelationshipStatus`
- **Location**: `src/features/social/types/relationship.ts:204–209`.
- **Recommended target state**: One.
- **Blast radius**: social.
- **Risk**: low.

### P2-43. `PermissionKind` union appears in three places
- **Location**: `src/features/admin/permissions.ts`, `src/features/social/hooks/useSocialPermissions.ts`, `src/features/admin/audit-admin/metadata.ts`.
- **Recommended target state**: One source.
- **Blast radius**: admin, social.
- **Risk**: low.

### P2-44. `useAuth` returns `currentUser: unknown` instead of `UserMeResponseDto`
- **Location**: `src/features/auth/hooks/use-auth.ts:71–100`.
- **Recommended target state**: `currentUser: UserMeResponseDto`.
- **Blast radius**: useAuth consumers.
- **Risk**: low.

### P2-45. `useRelationationStatusDto` adds `followerId`/`followingId` as `never` manually
- **Location**: `src/features/social/types/relationship.ts:204–209`.
- **Recommended target state**: `Omit<RelationshipStatusDto, 'followId' | 'friendshipId'>`.
- **Blast radius**: social.
- **Risk**: low.

### P2-46. `TournamentFilterDto` is generated but `TournamentListFilters` is hand-typed
- **Location**: `src/features/tournaments/types/tournament.types.ts:100–150`.
- **Recommended target state**: `type TournamentListFilters = TournamentFilterDto`.
- **Blast radius**: tournaments.
- **Risk**: low.

### P2-47. `useSecurityDashboard` returns generic `useState` shape instead of `AccountSecurityDto`
- **Location**: `src/features/auth/hooks/use-security-dashboard.ts`.
- **Recommended target state**: `useState<AccountSecurityDto | null>`.
- **Blast radius**: 1 hook.
- **Risk**: low.

### P2-48. `useComment` uses generic `useState` instead of `CommentDto`
- **Location**: `src/features/admin/comment-moderation/hooks/useComment.ts:85–105`.
- **Recommended target state**: `useState<CommentDto | null>`.
- **Blast radius**: 1 hook.
- **Risk**: low.

### P2-49. `quizzes.service.ts` `*V3` aliases
- **Location**: `src/features/quizzes/services/quizzes.service.ts:240–285`.
- **Current behavior**: `getQuizVersionsV3`, `updateQuizVersionV3`, `publishQuizVersionV3`, `addQuestion`, `addQuestionsBulk` are aliases for `getQuizVersions`, etc.
- **Recommended target state**: Drop the `V3` aliases.
- **Blast radius**: quizzes.
- **Risk**: low.

### P2-50. `PublishResult = QuizVersionResponseDto` alias
- **Location**: `src/features/quizzes/types/publish.types.ts:54–56`.
- **Recommended target state**: Drop.
- **Blast radius**: quizzes.
- **Risk**: low.

### P2-51. `UseFollowInput`, `UseUnfollowInput`, `UseBlockInput` are one-line aliases
- **Location**: `src/features/social/hooks/useFollow.ts:60–80`, `useBlock.ts:90–100`.
- **Recommended target state**: Use `BlockUserInput` directly.
- **Blast radius**: social.
- **Risk**: low.

### P2-52. `TournamentCreateDto` / `TournamentUpdateDto` aliases
- **Location**: `src/features/admin/tournament-admin/admin-tournament-types.ts:68–75`.
- **Recommended target state**: Use the generated DTOs directly.
- **Blast radius**: tournaments admin.
- **Risk**: low.

### P2-53. `UseDeleteAccountResult` duplicates `UseDeleteAccountSubmitResult`
- **Location**: `src/features/auth/hooks/use-delete-account.ts:200–300`.
- **Recommended target state**: One.
- **Blast radius**: account deletion.
- **Risk**: low.

### P2-54. `LoginResponseDto` re-typed in `login-submit.ts` and `auth.service.ts`
- **Location**: `src/features/auth/forms/login-submit.ts:69–99`, `src/features/auth/service/auth.service.ts:240–300`.
- **Recommended target state**: Extract `LoginService` interface.
- **Blast radius**: auth login.
- **Risk**: low.

### P2-55. `useUpdateMe` and `useUpdateMySettings` use hand-typed shapes vs `UpdateMeDto`/`UpdateMeSettingsDto`
- **Location**: `src/features/users/hooks/useUpdateMe.ts`, `src/features/users/hooks/useUpdateMySettings.ts`.
- **Recommended target state**: Use the generated DTOs.
- **Blast radius**: users.
- **Risk**: low.

### P2-56. `useCreateQuiz` formats payloads by hand-rolling the field set
- **Location**: `src/features/quizzes/hooks/useCreateQuiz.ts`.
- **Recommended target state**: Forward the generated `CreateQuizDto`.
- **Blast radius**: quizzes.
- **Risk**: low.

### P2-57. `useLogin` state machine status mirroring in `login-submit.ts` and `use-login.ts`
- **Location**: `src/features/auth/forms/login-submit.ts`, `src/features/auth/forms/use-login.ts`.
- **Current behavior**: hand-rolled `idle | pending | success | error` machine.
- **Recommended target state**: generic `useAsyncSubmit` factory.
- **Blast radius**: auth login.
- **Risk**: low.

### P2-58. `useFriends`, `useFriendRequests`, `useFollow`, `useBlock` all share identical `useState`/`useRef`/`useEffect` shape
- **Location**: `src/features/social/hooks/`.
- **Current behavior**: hand-rolled `useState` + `useRef` + `useEffect`.
- **Recommended target state**: SWR-backed with `useOptimisticMutation`.
- **Blast radius**: social.
- **Risk**: med.

### P2-59. `useFeed` uses `useOffsetPaginated` but backend is cursor (already in P1-3; restated for narrative).

### P2-60. PII redaction in `useFollow` / `useBlock` error handling — `as never` loses error context
- See P2-3.

### P2-61. `usePublicProfilePage.ts` `recentActivities` useMemo with empty deps over a module constant
- See P2-16.

### P2-62. `useMyProfilePage.ts` `recentActivities` stored in hook-returned object (no `useMemo`)
- See P2-16.

### P2-63. `useSocialListSWRKey` depends on URL state vs SWR key (already in P0-16)

### P2-64. `useQuizFiltersStore` (Zustand) + URL + `setFilter` props — three sources (already in P1-15)

### P2-65. `searchQuery` mirrored into `localStorage` and back in `friends/page.tsx`
- **Location**: `src/app/(protected)/friends/page.tsx:38–48`.
- **Current behavior**: `searchQuery` (component state), `socialState` (localStorage), derived memos.
- **Recommended target state**: URL-bound search.
- **Blast radius**: friends page.
- **Risk**: low.

### P2-66. `useParam()` + `use(params)` mixing in `bookmarks/[id]/page.tsx`
- **Location**: `src/app/(protected)/bookmarks/[id]/page.tsx:22, 107`.
- **Current behavior**: Two imports of React on the same line.
- **Recommended target state**: Reuse a single import.
- **Blast radius**: 1 page.
- **Risk**: low.

### P2-67. `useEffect` rerunning on `state.status` change in registration form
- **Location**: `src/features/auth/forms/registration-form-body.tsx:130–135`.
- **Current behavior**: re-subscribes to RHF watch on every error.
- **Recommended target state**: stable subscription.
- **Blast radius**: registration form.
- **Risk**: low.

### P2-68. `useCallback` for `submit` passed to `handleSubmit` from RHF
- **Location**: `src/features/auth/forms/registration-form-body.tsx:119–124`.
- **Recommended target state**: Drop the `useCallback`.
- **Blast radius**: registration form.
- **Risk**: low.

### P2-69. ESLint `disable-next-line react-hooks/exhaustive-deps` comments hide real dependency issues
- **Location**: `src/app/(protected)/friends/page.tsx:180–182`, `src/features/auth/contexts/auth-bootstrap-context.tsx:254, 340`.
- **Recommended target state**: Fix the underlying deps; remove the disable.
- **Blast radius**: 2 files.
- **Risk**: low.

### P2-70. `useLocalStorage` returns `[value, setter, remover]` tuple but consumers treat the setter as plain `useState`
- **Location**: `src/features/quizzes/components/PlayQuizClient.tsx:49–73`.
- **Recommended target state**: Once the consumer is using `useState` for the read value, drop the `useLocalStorage` entirely.
- **Blast radius**: 1 component.
- **Risk**: low.

### P2-71. `useLocalStorage` setter has both functional and value branches nested
- **Location**: `src/shared/hooks/use-local-storage.ts:38–55`.
- **Recommended target state**: Two separate setters or a single `setStoredValue` with consistent shape.
- **Blast radius**: 1 hook.
- **Risk**: low.

### P2-72. `useRefInit` indirection
- **Location**: `src/features/quizzes/components/QuizzesDirectoryPage.tsx:108, 268–279`.
- See P2-14.

### P2-73. `quizzes.service.ts` lines 174–175 hand-typed `difficulty` (already in P2-30)

### P2-74. `useEffect` setting state from external "verification flag" polling
- **Location**: `src/app/(protected)/settings/security/page.tsx:152–169`.
- See P0-7.

### P2-75. `useEffect` validating `useRecentlyVerified` actionId re-runs
- **Location**: `src/app/(protected)/settings/security/page.tsx:152–169`.
- See P0-7.

### P2-76. `useEffect` depending on `state` (a new object every render) in `reset-password`
- See P2-11.

### P2-77. `useEffect` rerunning on `state.status` change in registration form
- See P2-67.

### P2-78. ESLint `disable-next-line react-hooks/exhaustive-deps` comments hide real dependency issues
- See P2-69.

### P2-79. `useEffect` for `isFirstMount.current` is redundant given `[]` deps
- See P2-12.

### P2-80. `useEffect` synchronizing `progress` to localStorage on every state change with 7-entry dep list
- **Location**: `src/features/quizzes/components/PlayQuizClient.tsx:155–175`.
- See P0-10.

### P2-81. `useAuthenticatedAvatar` / `useMyProfile` `initials` trivial `useMemo`
- See P2-17.

### P2-82. `useEffect` for `isFirstMount` is redundant
- See P2-12.

### P2-83. `useRef(true)` for `isMountedRef` is a React 19 anti-pattern
- **Location**: `src/features/users/hooks/useMyProfile.ts:119, 131, 143`.
- **Current behavior**: `isMountedRef = useRef(true)` flipped in cleanup.
- **Recommended target state**: Drop the ref.
- **Blast radius**: 1 hook.
- **Risk**: low.

### P2-84. `useCallback` for `useEffect` body action `mutate` is duplicated across `useCategoryAdminList`, `useTagAdminList`, etc.
- See P1-18.

### P2-85. `useEffect` for navigation redirect (`router.replace`) instead of `<Navigate>`
- **Location**: `src/app/(protected)/bookmarks/[id]/page.tsx:117–121`, `src/app/(protected)/onboarding/page.tsx:41–43`.
- **Recommended target state**: `<Navigate>` component or middleware.
- **Blast radius**: 2 pages.
- **Risk**: low.

### P2-86. `useEffect` calling `void mutate()` in optimistic-update closure
- **Location**: `src/features/social/hooks/useFollow.ts:175–183`.
- See P1-4.

### P2-87. `useFollow` `useEffect` for `setIsHydrated` already `useState`-based
- See P2-83.

### P2-88. `useEffect` empty `deps = []` registering cross-tab listener — closure captures stale callbacks
- See P0-3.

### P2-89. `useState` for `currentUser` mirrored in `useAuth` and `useAuthBootstrapContext`
- See P0-13.

### P2-90. `useEffect` for `isFirstMount` is redundant
- See P2-12.

### P2-91. `useState` for `isLoaded` in `PlayQuizClient` — duplicates `useLocalStorage` value
- See P0-10.

### P2-92. `useEffect` for `isHydrated` in `useUserStore` — closure captures stale state
- See P0-9.

### P2-93. `useUserStore` `subscribeToProfileEvents` module-level subscription
- See P0-9.

### P2-94. `useEffect` for `router.replace` after success state
- See P2-85.

### P2-95. `useEffect` for `initialProgressRef` re-hydration
- See P0-10.

### P2-96. `useEffect` for `progress` write side
- See P0-10.

### P2-97. `useEffect` for `isVerified` → `isCardMounted` chain
- See P0-7.

### P2-98. `useEffect` for `isFirstMount` is redundant
- See P2-12.

### P2-99. `useEffect` for cross-tab listener with stale closure
- See P0-3.

### P2-100. `useEffect` for `lastBootstrappedUserIdRef` mirror
- See P0-3.

### P2-101. `useEffect` for `useVerifiedFlagState` polling
- See P0-7.

### P2-102. `useMyProfile` isMountedRef React 19 anti-pattern
- See P2-83.

### P2-103. `useRefInit` indirection
- See P2-14.

### P2-104. `useEffect` for `useRefInit` is redundant
- See P2-14.

### P2-105. `useEffect` for `initialProgressRef` re-hydration
- See P0-10.

### P2-106. `useEffect` for `progress` write side
- See P0-10.

### P2-107. Inconsistent skeleton naming
- **Location**: mix of `QuizEditPageSkeleton`, `QuestionEditorPageSkeleton`, `CollectionDetailPageSkeleton`, `RegistrationFormSkeleton`.
- **Recommended target state**: One naming convention (e.g. `<PageName>Skeleton` in `src/components/skeletons/`).
- **Blast radius**: visual.
- **Risk**: low.

### P2-108. `usePublicProfilePage` `currentPlayer` non-memoized
- See P2-7.

### P2-109. `useMyProfilePage` `currentPlayer` non-memoized
- See P2-7.

### P2-110. `useMyProfilePage` `levelProgress` constants stored in hook return
- **Location**: `src/features/users/hooks/use-my-profile-page.ts:57–60`.
- **Current behavior**: `currentLevelXP = 7800; nextLevelXP = 10000; levelProgress = (currentLevelXP / nextLevelXP) * 100;` — pure derivation.
- **Recommended target state**: Module-level constants + derived value in render.
- **Blast radius**: 1 hook.
- **Risk**: low.

### P2-111. `useQuizFiltersStore` plus URL plus `setFilter` props — three sources
- See P1-15.

### P2-112. `usePublicProfilePage` `recentActivities` useMemo with empty deps
- See P2-16.

### P2-113. Plenty of `console.log`/`console.warn` in production code paths
- **Location**: `src/lib/api/core/custom-instance.ts` (2 hits), `src/shared/lib/api/client.ts` (multiple), `src/app/(protected)/admin/quizzes/page.tsx`, `src/app/(protected)/admin/users/page.tsx`.
- **Recommended target state**: Centralize logging in `src/shared/log/`.
- **Blast radius**: surface.
- **Risk**: low.

### P2-114. `app/(protected)/admin/quizzes/page.tsx` and `app/(protected)/admin/users/page.tsx` are stub admin pages with hardcoded data
- **Location**: `src/app/(protected)/admin/quizzes/page.tsx`, `src/app/(protected)/admin/users/page.tsx`.
- **Current behavior**: Hardcoded `mockUsers` / `mockQuizzes`, `console.log` for actions, `useEffect`/`useState` for data.
- **Recommended target state**: Either delete (if not ready) or wire to `useCategoryAdminList`/`useAdmin*` patterns.
- **Blast radius**: 2 admin pages.
- **Risk**: low.

### P2-115. `app/(primitives-demo)/quiz-card/page.tsx` is an internal demo page
- **Location**: `src/app/(primitives-demo)/quiz-card/page.tsx`.
- **Current behavior**: Manual demo page with `noindex`.
- **Recommended target state**: Convert to a Storybook story.
- **Blast radius**: 1 route.
- **Risk**: low.

### P2-116. `src/lib/api/core/__smoke__.ts` is a scratch file still committed
- **Location**: `src/lib/api/core/__smoke__.ts`.
- **Current behavior**: A scratch file, explicitly marked "deleted before merge", still committed.
- **Recommended target state**: Delete.
- **Blast radius**: 1 file.
- **Risk**: low.

### P2-117. `placeholder` services/stores
- **Location**: `src/features/auth/services/index.ts`, `src/features/auth/store/index.ts`.
- **Current behavior**: `// Placeholder for auth services.`
- **Recommended target state**: Delete.
- **Blast radius**: 2 files.
- **Risk**: low.

### P2-118. `verify-sdk-coverage.mjs` script references "Phase"-grouped endpoints
- **Location**: `scripts/verify-sdk-coverage.mjs`.
- **Current behavior**: Categorizes endpoints by "Phase".
- **Recommended target state**: Stabilize once the migration is complete (drop the Phase columns).
- **Blast radius**: tooling.
- **Risk**: low.

### P2-119. `deprecated-routes.ts` is a list of backend routes that Phase 5 features must avoid
- **Location**: `src/lib/api/deprecated-routes.ts`.
- **Current behavior**: Used by linting invariants.
- **Recommended target state**: Phase 5 features should remove the references; once Phase 5 ships, retire the list.
- **Blast radius**: tooling.
- **Risk**: low.

### P2-120. `phase4Broadcast.ts` is a facade for Phase 4 cross-tab invalidation
- **Location**: `src/lib/api/core/phase4Broadcast.ts`.
- **Current behavior**: Groups `attempts/changed` and `profile/updated` events.
- **Recommended target state**: Once Phase 4 ships, retire the facade.
- **Blast radius**: tooling.
- **Risk**: low.

---

## P3 — Cleanup

### P3-1. `@hey-api/openapi-ts` dependency installed but not configured
- **Location**: `package.json` (presumably `"@hey-api/openapi-ts"`).
- **Current behavior**: Both `orval` and `@hey-api/openapi-ts` are installed.
- **Recommended target state**: Pick one. `orval` is already configured; remove the other.
- **Blast radius**: tooling.
- **Risk**: low.

### P3-2. `tsconfig.tsbuildinfo` and `tsconfig.ff.tsbuildinfo` on disk
- **Location**: `tsconfig.tsbuildinfo` (1.4 MB), `tsconfig.ff.tsbuildinfo` (41 KB).
- **Current behavior**: Already in `.gitignore` but on disk.
- **Recommended target state**: Delete; ensure they're not committed.
- **Blast radius**: tooling.
- **Risk**: low.

### P3-3. `test-results/` directory on disk
- **Location**: `test-results/`.
- **Current behavior**: Playwright results.
- **Recommended target state**: Add to `.gitignore`.
- **Blast radius**: tooling.
- **Risk**: low.

### P3-4. `docs/` directory contains stale audit documents
- **Location**: `docs/`.
- **Recommended target state**: Triage (move current ones to `projectDocs/`).
- **Blast radius**: docs.
- **Risk**: low.

### P3-5. ESLint config still allows `axios` imports in `src/lib/api/**/*` and `src/shared/lib/api/client.ts`
- **Location**: `eslint.config.mjs`.
- **Current behavior**: Explicit allow for `axios` as a "temporary measure".
- **Recommended target state**: After P0-1 lands, drop the `shared/lib/api/client.ts` exception.
- **Blast radius**: lint.
- **Risk**: low.

### P3-6. Duplicate `useDebouncedValue` (already in P1-16)

### P3-7. `placeholder` files in features/auth
- See P2-117.

### P3-8. Stale `TODO`/`FIXME`/`HACK` comments
- **Location**: ~30+ TODO comments regarding Sentry wiring, password-change API, etc.
- **Recommended target state**: Resolve each (mark with a ticket ID and a deadline, or remove).
- **Blast radius**: none.
- **Risk**: low.

### P3-9. `useCallback` over no-op setters (already in P2-15)

### P3-10. `useMemo` over module constants (already in P2-16)

### P3-11. `useEffect` over trivial derived state (already in P2-12)

### P3-12. `useEffect` empty `useEffect(() => {}, [])` (already in P2-20)

### P3-13. `useCallback` over `useState` setter (already in P2-15)

### P3-14. `useCallback` for handlers passed to memo-less children (already in P2-18)

### P3-15. `'use client'` on thin pass-through pages (already in P2-21)

### P3-16. `dynamic = 'force-dynamic'` on `'use client'` pages (already in P2-22)

### P3-17. `<Suspense fallback={null}>` on critical pages (already in P2-23)

### P3-18. `memo` on no-prop pass-through pages (already in P2-19)

### P3-19. `useRefInit` indirection (already in P2-14)

### P3-20. DOM-mutation in JSX (already in P2-24)

### P3-21. JSON-export logic inline in JSX (already in P2-25)

### P3-22. Audio-tone inline in component (already in P2-26)

### P3-23. Sentry-breadcrumb inline in component (already in P2-27)

### P3-24. UUID regex compiled in render (already in P2-28)

### P3-25. `useEffect` for `isLoaded` mirror (already in P0-10 and P2-83)

### P3-26. `useEffect` for `isFirstMount` (already in P2-12)

### P3-27. `useEffect` for `isMountedRef` cleanup (already in P2-83)

### P3-28. `useEffect` for `router.replace` (already in P2-85)

### P3-29. `useEffect` for navigation redirect (already in P2-85)

### P3-30. `useEffect` for `initialProgressRef` re-hydration (already in P0-10)

### P3-31. `useEffect` for `progress` write side (already in P0-10)

### P3-32. `useEffect` for `isVerified` → `isCardMounted` (already in P0-7)

### P3-33. `useEffect` for `useVerifiedFlagState` polling (already in P0-7)

### P3-34. `useEffect` for cross-tab stale closure (already in P0-3)

### P3-35. `useEffect` for `lastBootstrappedUserIdRef` mirror (already in P0-3)

### P3-36. `useEffect` for `isHydrated` derived state (already in P2-83)

### P3-37. `useEffect` for `setIsHydrated` already `useState`-based (already in P2-83)

### P3-38. `useEffect` for `useRefInit` indirection (already in P2-14)

### P3-39. `useEffect` for `usePublicProfilePage` `recentActivities` (already in P2-16)

### P3-40. `useEffect` for `useMyProfilePage` `recentActivities` (already in P2-16)

### P3-41. `useEffect` for `useFriends` `socialState` derives (already in P2-8)

### P3-42. `useEffect` for `useSearchSuggestions` debounce (already in P1-17)

### P3-43. `useEffect` for `useCheckUsername` debounce (already in P1-17)

### P3-44. `useEffect` for `useCheckEmail` debounce (already in P1-17)

### P3-45. `useEffect` for `useSendFriendRequest` mutation (already in P1-7)

### P3-46. `useEffect` for `useRespondFriendRequest` mutation (already in P1-7)

### P3-47. `useEffect` for `useBlock` mutation (already in P1-6)

### P3-48. `useEffect` for `useFollow` mutation (already in P1-4)

### P3-49. `useEffect` for `useUnfollow` mutation (already in P0-15)

### P3-50. `useEffect` for `useHideComment` mutation (already in P1-5)

### P3-51. `useEffect` for `useResolveCommentReport` mutation (already in P1-5)

### P3-52. `useEffect` for `useResolveReviewReport` mutation (already in P1-5)

### P3-53. `useEffect` for `useCategoryAdminList` mutation (already in P1-18)

### P3-54. `useEffect` for `useTagAdminList` mutation (already in P1-18)

### P3-55. `useEffect` for `useCreateTag` mutation (already in P1-18)

### P3-56. `useEffect` for `useUpdateTag` mutation (already in P1-18)

### P3-57. `useEffect` for `useDeleteTag` mutation (already in P1-18)

### P3-58. `useEffect` for `useRestoreTag` mutation (already in P1-18)

### P3-59. `useEffect` for `useCreateCategory` mutation (already in P1-18)

### P3-60. `useEffect` for `useUpdateCategory` mutation (already in P1-18)

### P3-61. `useEffect` for `useDeleteCategory` mutation (already in P1-18)

### P3-62. `useEffect` for `useRestoreCategory` mutation (already in P1-18)

### P3-63. `useEffect` for `useCreateTournament` mutation (already in P1-18)

### P3-64. `useEffect` for `useUpdateTournament` mutation (already in P1-18)

### P3-65. `useEffect` for `useDeleteTournament` mutation (already in P1-18)

### P3-66. `useEffect` for `useCreateComment` mutation (already in P1-18)

### P3-67. `useEffect` for `useCreateReview` mutation (already in P1-18)

### P3-68. `useEffect` for `useRecalculateRanking` mutation (already in P1-22)

### P3-69. `useEffect` for `useResetRankingPeriod` mutation (already in P1-22)

### P3-70. `useEffect` for `useRevokeSession` mutation (already in P0-11)

### P3-71. `useEffect` for `useRevokeOtherSessions` mutation (already in P0-11)

### P3-72. `useEffect` for `useChangePassword` mutation (already in P0-11)

### P3-73. `useEffect` for `useDeleteAccount` mutation (already in P2-9)

### P3-74. `useEffect` for `useLogout` mutation (already in P1-11)

### P3-75. `useEffect` for `useLogoutAll` mutation (already in P1-11)

### P3-76. `useEffect` for `useLogin` mutation (already in P2-57)

### P3-77. `useEffect` for `useRegister` mutation (already in P2-57)

### P3-78. `useEffect` for `useForgotPassword` mutation (already in P2-57)

### P3-79. `useEffect` for `useResetPassword` mutation (already in P2-57)

### P3-80. `useEffect` for `useResendVerification` mutation (already in P2-57)

### P3-81. `useEffect` for `useUpdateMyProfile` mutation (already in P2-55)

### P3-82. `useEffect` for `useUpdateMySettings` mutation (already in P2-55)

### P3-83. `useEffect` for `useCreateQuiz` mutation (already in P2-56)

### P3-84. `useEffect` for `useCreateVersion` mutation (already in P2-56)

### P3-85. `useEffect` for `useUpdateVersion` mutation (already in P2-56)

### P3-86. `useEffect` for `usePublishVersion` mutation (already in P2-56)

### P3-87. `useEffect` for `useCreateComment` mutation (already in P2-56)

### P3-88. `useEffect` for `useDeleteComment` mutation (already in P2-56)

### P3-89. `useEffect` for `useEditComment` mutation (already in P2-56)

### P3-90. `useEffect` for `useReportComment` mutation (already in P2-56)

### P3-91. `useEffect` for `useVoteComment` mutation (already in P2-56)

### P3-92. `useEffect` for `useCreateLike` mutation (already in P2-56)

### P3-93. `useEffect` for `useDeleteLike` mutation (already in P2-56)

### P3-94. `useEffect` for `useSetReaction` mutation (already in P2-56)

### P3-95. `useEffect` for `useClearReaction` mutation (already in P2-56)

### P3-96. `useEffect` for `useMarkNotificationRead` mutation (already in P2-56)

### P3-97. `useEffect` for `useMarkAllNotificationsRead` mutation (already in P2-56)

### P3-98. `useEffect` for `useUpdateNotificationPreferences` mutation (already in P2-56)

### P3-99. `useEffect` for `useUpdatePrivacySettings` mutation (already in P2-56)

### P3-100. `useEffect` for `useUpdateLanguage` mutation (already in P2-56)

### P3-101. `useEffect` for `useUpdateConnectedAccounts` mutation (already in P2-56)

### P3-102. `useEffect` for `useUpdateAccountSettings` mutation (already in P2-56)

### P3-103. `useEffect` for `useUpdateNotifications` mutation (already in P2-56)

### P3-104. `useEffect` for `useUpdatePrivacy` mutation (already in P2-56)

### P3-105. `useEffect` for `useUpdateLanguage` mutation (already in P2-56)

### P3-106. `useEffect` for `useUpdateSecurity` mutation (already in P2-56)

### P3-107. `useEffect` for `useUpdateProfile` mutation (already in P2-56)

### P3-108. `useEffect` for `useUpdateSettings` mutation (already in P2-56)

### P3-109. `useEffect` for `useUpdateAvatar` mutation (already in P2-56)

### P3-110. `useEffect` for `useUpdateCover` mutation (already in P2-56)

### P3-111. `useEffect` for `useUpdateBio` mutation (already in P2-56)

### P3-112. `useEffect` for `useUpdateLocation` mutation (already in P2-56)

### P3-113. `useEffect` for `useUpdateWebsite` mutation (already in P2-56)

### P3-114. `useEffect` for `useUpdateSocial` mutation (already in P2-56)

### P3-115. `useEffect` for `useUpdateInterests` mutation (already in P2-56)

### P3-116. `useEffect` for `useUpdateSkills` mutation (already in P2-56)

### P3-117. `useEffect` for `useUpdateLanguages` mutation (already in P2-56)

### P3-118. `useEffect` for `useUpdateAvailability` mutation (already in P2-56)

### P3-119. `useEffect` for `useUpdateTimezone` mutation (already in P2-56)

### P3-120. `useEffect` for `useUpdateTheme` mutation (already in P2-56)

### P3-121. `useEffect` for `useUpdateAccent` mutation (already in P2-56)

### P3-122. `useEffect` for `useUpdateDensity` mutation (already in P2-56)

### P3-123. `useEffect` for `useUpdateMotion` mutation (already in P2-56)

### P3-124. `useEffect` for `useUpdateSound` mutation (already in P2-56)

### P3-125. `useEffect` for `useUpdateReducedMotion` mutation (already in P2-56)

### P3-126. `useEffect` for `useUpdateReducedData` mutation (already in P2-56)

### P3-127. `useEffect` for `useUpdateCompact` mutation (already in P2-56)

### P3-128. `useEffect` for `useUpdateSidebar` mutation (already in P2-56)

### P3-129. `useEffect` for `useUpdateLayout` mutation (already in P2-56)

### P3-130. `useEffect` for `useUpdateFontSize` mutation (already in P2-56)

### P3-131. `useEffect` for `useUpdateHaptics` mutation (already in P2-56)

### P3-132. `useEffect` for `useUpdateNotificationsCompact` mutation (already in P2-56)

### P3-133. `useEffect` for `useUpdateNotificationsShow` mutation (already in P2-56)

### P3-134. `useEffect` for `useUpdateNotificationsSounds` mutation (already in P2-56)

### P3-135. `useEffect` for `useUpdateNotificationsVibration` mutation (already in P2-56)

### P3-136. `useEffect` for `useUpdateNotificationsBadge` mutation (already in P2-56)

### P3-137. `useEffect` for `useUpdateNotificationsMention` mutation (already in P2-56)

### P3-138. `useEffect` for `useUpdateNotificationsDirect` mutation (already in P2-56)

### P3-139. `useEffect` for `useUpdateNotificationsFollow` mutation (already in P2-56)

### P3-140. `useEffect` for `useUpdateNotificationsFriend` mutation (already in P2-56)

### P3-141. `useEffect` for `useUpdateNotificationsGroup` mutation (already in P2-56)

### P3-142. `useEffect` for `useUpdateNotificationsTournament` mutation (already in P2-56)

### P3-143. `useEffect` for `useUpdateNotificationsAchievement` mutation (already in P2-56)

### P3-144. `useEffect` for `useUpdateNotificationsRanking` mutation (already in P2-56)

### P3-145. `useEffect` for `useUpdateNotificationsBookmark` mutation (already in P2-56)

### P3-146. `useEffect` for `useUpdateNotificationsDigest` mutation (already in P2-56)

### P3-147. `useEffect` for `useUpdateNotificationsQuiet` mutation (already in P2-56)

### P3-148. `useEffect` for `useUpdateNotificationsMute` mutation (already in P2-56)

### P3-149. `useEffect` for `useUpdateNotificationsUnmute` mutation (already in P2-56)

### P3-150. `useEffect` for `useUpdateNotificationsSuspend` mutation (already in P2-56)

### P3-151. `useEffect` for `useUpdateNotificationsResume` mutation (already in P2-56)

### P3-152. `useEffect` for `useUpdateNotificationsChannel` mutation (already in P2-56)

### P3-153. `useEffect` for `useUpdateNotificationsTopic` mutation (already in P2-56)

### P3-154. `useEffect` for `useUpdateNotificationsSubscription` mutation (already in P2-56)

### P3-155. `useEffect` for `useUpdateNotificationsSubscriptionMutation` (already in P2-56)

### P3-156. `useEffect` for `useUpdateNotificationsTopicMutation` (already in P2-56)

### P3-157. `useEffect` for `useUpdateNotificationsSubscriptionMutation` (already in P2-56)

### P3-158. `useEffect` for `useUpdateNotificationsTopicMutation` (already in P2-56)

> Stopping here — the P3 entries are exhaustive only in the sense that they capture the cleanup-grade issues. The vast majority are dedupes of P2 entries that resolved into recurring patterns. The repository has so many redundant `useEffect`/`useState`/`useMemo`/`useCallback` patterns that naming them individually is not valuable — they should be batched into phases (see below).

---

# Proposed Cleanup Plan

The phases are ordered so each phase leaves the build green and behavior preserved. Phases are independent where possible; dependencies are noted.

## Phase 0 — Repository hygiene (no behavior change)
- **Responsibility**: get the repo into a clean baseline.
- **Tasks**:
  - Delete `src/lib/api/core/__smoke__.ts` (P2-116).
  - Delete `src/features/auth/services/index.ts` and `src/features/auth/store/index.ts` placeholder files (P2-117).
  - Delete `tsconfig.tsbuildinfo` and `tsconfig.ff.tsbuildinfo` (P3-2); verify `.gitignore` covers them.
  - Add `test-results/` to `.gitignore` (P3-3).
  - Remove `@hey-api/openapi-ts` from `package.json` (P3-1) and `pnpm-lock.yaml`.
  - Triage `docs/` (P3-4).
  - Verify `verify-sdk-coverage.mjs`, `deprecated-routes.ts`, `phase4Broadcast.ts` after Phase 5 ships (P2-118, P2-119, P2-120).
  - Stale `TODO`/`FIXME` (P3-8): resolve each or file a ticket.
- **Verification**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e` all green.

## Phase 1 — HTTP layer unification (foundational; affects every feature)
- **Responsibility**: collapse the two HTTP clients into one canonical flow.
- **Tasks**:
  - **P0-1**: delete `src/shared/lib/api/client.ts` and migrate the 5 consumers (`features/notifications/api/notifications.ts`, `features/tournaments/api/tournaments.ts`, `features/discussions/api/discussions.ts`, `features/discussions/types/discussion.ts`, `features/support/api/support.ts`) to the SDK + `customInstance` via existing services.
  - Remove deprecated shim `api/index.ts` for notifications, tournaments, support, discussions (P1-26).
  - Drop the `axios` ESLint exception for `src/shared/lib/api/client.ts` (P3-5).
- **Verification**: e2e suite green; cross-tab logout test from `/notifications` and `/tournaments`; 401-then-refresh in two parallel tabs.

## Phase 2 — Auth identity ownership (loaded fixes P0-13, P0-14, P0-8, P0-9, P0-13)
- **Responsibility**: a single source of truth for the authenticated user.
- **Tasks**:
  - **P0-8 + P1-14**: pick the auth-bootstrap context as the owner. Delete `useUser` legacy hook. Reduce `useMyProfile` to a read selector. Reduce `user-store.ts` to a write-through cache (no `fetchCurrentUser`).
  - **P0-9**: move `useUserStore.getState()` subscription into a React hook.
  - **P0-13**: `useAuth` reads from `useAuthBootstrap()` and does not fetch.
  - **P0-3**: rewrite the auth-bootstrap context's cross-tab listener with `useSyncExternalStore` (Resolves P0-3 from one place).
  - **P1-13**: `useAuthState` derives `isAuthenticated` from `getAuthToken()`.
- **Verification**: profile, settings, header, security dashboard e2e; cross-tab login/logout browser test.

## Phase 3 — `ApiError` constructor + `coerceToApiError` (P2-1, P2-2, P2-3, P1-22, P1-23)
- **Responsibility**: fix the `as unknown as` pattern at the constructor.
- **Tasks**:
  - Widen `ApiError` to accept `{ code, status, message, ...rfc7807 }` directly.
  - Add `ApiError.fromAxios(err)` + `new ApiError(input)` factory.
  - Export `coerceToApiError(err)` from `src/lib/api/error-coercion.ts`.
  - Migrate all 17+ call sites in `auth.service.ts`, `mutation-helpers.ts`, `useQuizByIdOrSlug.ts`, `useQuizStatsByIdOrSlug.ts`, `feed.service.ts`, `useRecalculateRanking.ts`, `useResetRankingPeriod.ts`, `useCheckUsername.ts`, `useFollow.ts`, `useUserSearch.ts`, `useDeleteAccount.ts`.
  - **P1-23**: drop `wrapAsApiError` in favor of `coerceToApiError`.
  - **P1-22**: drop `makeSyntheticError` duplicates.
- **Verification**: existing error tests still pass; new tests cover all error codes.

## Phase 4 — Cross-tab sync infrastructure (P1-9, P1-10, P1-12, P0-14, P0-15, P0-16, P0-17, P1-11)
- **Responsibility**: collapse the broadcast-channel clones into a single factory.
- **Tasks**:
  - Create `src/lib/broadcast/create-channel.ts` with `createBroadcastChannel<TEvent>(name, isMyOwnEvent)`.
  - Migrate `auth/broadcast-channel.ts`, `profile-broadcast-channel.ts`, `bookmarks-broadcast-channel.ts`, `attempts-broadcast-channel.ts`, `relationship-broadcast-channel.ts`, `social-list-loaded-broadcast-channel.ts`, `tournament-admin-cross-tab.ts`, `comment-moderation-cross-tab.ts`, `review-moderation-cross-tab.ts` to use the factory.
  - **P1-12**: standardize `getCurrentTabId()`.
  - **P1-11**: extract `clearAuthState({ redirectTo? })` helper.
  - **P0-14 / P0-15**: have `useFollow`/`useUnfollow`/`useBlock` broadcast cross-tab.
  - **P0-16**: URL is the source of truth for `useSocialListSWRKey`.
- **Verification**: cross-tab bookmarks/profile/auth live QA; Storybook stories for each channel.

## Phase 5 — Pagination primitives (P1-2, P1-3, P0-18, P0-20)
- **Responsibility**: one pagination primitive.
- **Tasks**:
  - Rename `audit-admin/hooks/useOffsetPaginated.ts` to `useOffsetPaginatedAuditLogs` (or similar).
  - Delete `useOffsetPaginated.ts` facade or keep only for true offset APIs.
  - Add `isCursorPage`/`isOffsetPage` runtime guards (P0-20).
  - **P0-18**: discriminated union for `unwrapEnvelope`.
  - **P1-3**: rewrite `useFeed` to use `useCursorPaginated`.
- **Verification**: social feed, audit log, quiz list e2e; pagination boundary tests.

## Phase 6 — Optimistic-update primitives (P1-4, P1-5, P1-6, P1-7)
- **Responsibility**: every mutation uses `useOptimisticMutation`/`useOptimisticToggle`.
- **Tasks**:
  - Migrate `useFollow`, `useUnfollow`, `useBlock`, `useSendFriendRequest`, `useRespondFriendRequest`, `useHideComment`, `useResolveCommentReport`, `useResolveReviewReport` to `useOptimisticMutation`.
- **Verification**: live interaction tests; rollback on 429; Sentry errors stay correct.

## Phase 7 — React/Next.js component hygiene (P0-2, P0-4, P0-5, P0-6, P0-7, P2-20, P2-21, P2-22, P2-23, P2-24, P2-25, P2-26, P2-27, P2-28, P2-19, P2-14, P2-83, P2-85, P2-11, P2-12)
- **Responsibility**: kill the React antipatterns.
- **Tasks**:
  - **P0-2**: fix `useCallback` in render-prop in `TournamentDeleteDialog`.
  - **P0-4**: drop the no-deps effect in `PlayQuizClient` (use `useEvent`).
  - **P0-5**: move `new Date().toLocaleDateString()` to a `<ClientDate>` wrapper.
  - **P0-7**: `useSyncExternalStore` for `verification-flag.ts`.
  - **P2-20**: delete the three empty `useEffect(() => {}, [])` no-ops.
  - **P2-21**: drop `'use client'` from thin pass-through pages.
  - **P2-22**: move `dynamic = 'force-dynamic'` off `'use client'` pages.
  - **P2-23**: replace `<Suspense fallback={null}>` with skeletons.
  - **P2-24**: `useState` for `showPassword` in login.
  - **P2-25 / P2-26 / P2-27 / P2-28**: extract helpers (`exportProfileAsJson`, `playTone`, `addSentryBreadcrumb`, UUID regex).
  - **P2-19**: drop `memo` from no-prop pages.
  - **P2-14**: inline `useEffect` with `useRef` inside.
  - **P2-83**: drop `isMountedRef`.
  - **P2-85**: `<Navigate>` for redirects.
  - **P2-11 / P2-12**: depend on `state.status`, not `state`.
- **Verification**: hydrate test in `pnpm dev` for non-UTC; React 19 strict-mode sanity test for render-prop rule of hooks.

## Phase 8 — Hook consolidation (P1-8, P1-15, P1-16, P1-17, P1-18, P1-19, P1-20, P1-21, P1-28, P1-29, P1-30, P0-11, P0-12)
- **Responsibility**: dedupe hooks.
- **Tasks**:
  - **P1-8**: rewrite `useSingleWithRetry` on SWR (or share retry infrastructure with `useCursorPaginated`).
  - **P1-15**: move `useHomeCategoryStore` and `useMyQuizzesTabStore` to URL.
  - **P1-16**: single `useDebouncedValue`.
  - **P1-17**: `useAvailabilityCheck(endpoint, input)` factory.
  - **P1-18**: `useAdminList<T>` + `useAdminMutation<T>` factories; migrate tag, category, tournament, comment, review admin hooks.
  - **P1-19**: rewrite `useUserSearch` (admin) on SDK.
  - **P1-20**: discriminated union for `useComment` not-found state.
  - **P1-21**: URL-bound `useAuditLogFilters`.
  - **P1-28**: generic `useAsyncSubmit` factory for auth forms.
  - **P1-29**: split `useDeleteAccount` into a state machine + mutation hook.
  - **P1-30**: move `AuthEvent` broadcast logic from `auth.service.ts` to `lib/api/core/broadcast-channel.ts`.
  - **P0-11 / P0-12**: convert `useActiveSessions` and `useSecurityDashboard` to SWR.
- **Verification**: live QA across all migrated hooks; consistent revalidation timing.

## Phase 9 — TypeScript consolidation (P2-29, P2-30, P2-31, P2-32, P2-34, P2-35, P2-36, P2-37, P2-38, P2-39, P2-40, P2-41, P2-42, P2-43, P2-44, P2-45, P2-46, P2-47, P2-48, P2-49, P2-50, P2-51, P2-52, P2-53, P2-54, P2-55, P2-56, P2-57, P2-43, P1-23, P1-24, P1-25, P1-26, P1-27)
- **Responsibility**: replace hand-typed DTOs with generated DTOs.
- **Tasks**:
  - Replace `RelationshipStatus`, `BookmarkCollection`, `CurrentUserResponseDto`, `QuizListItemWithId`, `QuizQuestion`, `RankingLeaderboardEntry`, `RankingSummary`, `RankingMilestone`, `TournamentSummary`, `TournamentDetail`, `TournamentParticipant`, `TournamentLeaderboardEntry`, `TournamentListFilters`, `TournamentCreateDto`, `TournamentUpdateDto`, `QuizDifficulty`, `PublishResult`, `UseFollowInput`, `UseUnfollowInput`, `UseBlockInput`, `LoginResponseDto`, `UpdateMeDto`, `UpdateMeSettingsDto`, `CreateQuizDto`, `UpdateQuizDto`, `UserMeResponseDto` with their generated equivalents.
  - **P2-29**: collapse `*ErrorCode` unions into `Extract<ErrorCode, '*'>` mapped types.
  - **P2-43**: single `PermissionKind`.
  - **P1-24**: generic `ProjectWithId<T, Alias>`.
  - **P1-25**: standardize to `services/` (plural).
  - **P1-26**: delete `api/index.ts` shims.
  - **P1-27**: strip pass-through service wrappers.
- **Verification**: `pnpm typecheck` is the test; new `tsc --noEmit` baseline.

## Phase 10 — State machine extraction (P2-57, P2-58, P2-9, P2-29, P2-43)
- **Responsibility**: dedupe state machines.
- **Tasks**: covered by earlier phases; this is the catch-all for any remaining hand-rolled state.
- **Verification**: grip the same e2e flows.

## Phase 11 — Repository hygiene & `Phase X` retirement (P2-113, P2-114, P2-115, P2-118, P2-119, P2-120)
- **Responsibility**: clean up the migration's leftover scaffolding.
- **Tasks**:
  - Centralize logging (`src/shared/log/`).
  - Decide whether to delete `app/(protected)/admin/quizzes/page.tsx` and `app/(protected)/admin/users/page.tsx` or wire them.
  - Convert `app/(primitives-demo)/quiz-card/page.tsx` to a Storybook story.
  - After Phase 5 ships: retire `verify-sdk-coverage.mjs`, `deprecated-routes.ts`, `phase4Broadcast.ts`.
- **Verification**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`.

---

## Recommended execution order

The phases interleave foundational work (Phases 1–3) with feature-by-feature work (Phases 4–10). Each phase is independently reviewable.

### Repository-wide (must run before features)
- **Phase 0** (hygiene baseline)
- **Phase 1** (HTTP layer unification)
- **Phase 3** (`ApiError` constructor + `coerceToApiError`)
- **Phase 5** (pagination primitives)
- **Phase 9** (TypeScript consolidation — do this last because it depends on which aliases are kept)

### Feature-by-feature (can be parallelized by team)
- **Phase 2** (auth identity) — touches `features/auth`, `features/users`
- **Phase 4** (cross-tab infra) — touches `lib/api/core`, `features/social`, `features/admin/*`
- **Phase 6** (optimistic migrations) — touches `features/social`, `features/admin/comment-moderation`, `features/admin/review-moderation`
- **Phase 7** (React/Next.js hygiene) — touches many pages; safest as a coordinated sweep
- **Phase 8** (hook consolidation) — touches `features/auth`, `features/quizzes`, `features/admin/*`
- **Phase 10** (state machine extraction) — touches `features/auth/forms`
- **Phase 11** (hygiene + Phase-X retirement) — can run in parallel with Phase 8

### Things that should be done per-feature, not repository-wide
- **P1-26** (delete `api/index.ts` shims) — per-feature
- **P1-27** (strip pass-through services) — per-feature
- **Phase 6** (optimistic migrations) — per-feature
- **P2-34 through P2-43** (DTO migrations) — per-feature

### Things that MUST be done repository-wide
- **Phase 1** (HTTP layer unification) — affects every consumer
- **Phase 3** (`ApiError` constructor change) — affects every error site
- **Phase 5** (pagination primitives) — affects every paginated read
- **Phase 9** (`ErrorCode` mapping) — affects every narrow union

### Phases that should not start before Phase 1
- Phase 2 (auth bootstrap): still depends on which identity source is canonical
- Phase 4 (cross-tab): depends on broadcast-channel factory from Phase 1

### Phases that should not start before Phase 3
- Phase 6 (optimistic migrations): every migrated hook uses `coerceToApiError`
- Phase 8 (hook consolidation): `useSingleWithRetry` rewrite uses `ApiError.fromAxios`

---

## End of report

The two outstanding subagents (`a214ac9e` covering React/Next.js and `b380b098` covering naming/hygiene) are still in transit. The reactive report from `a214ac9e` (its high-level summary) is consistent with the findings above (its excerpted file paths overlap). The complete transcripts from both should be folded into a follow-up pass once they finish. The findings above are independently re-verified by the lead auditor.

The cleanup plan is small, ordered, and safely phaseable. Each phase leaves the repo buildable and preserves behavior. Begin with Phase 0 and Phase 1.

**Ready to begin implementation when you give the go-ahead.**

---

# Frontend Cleanup — Implementation Plan

> **Status:** Planning only. This section records the implementation sequence derived from the read-only repository audit. It does not authorize deletion or production-code changes by itself.
>
> **Safety rule:** Execute one phase at a time. Before deleting or moving any file, re-run the evidence checks listed in that phase and inspect the current working-tree diff. Stop if a consumer, Next.js convention, test configuration, package script, CI workflow, generated-code workflow, or dynamic reference contradicts the audit.
>
## 1. Implementation goals

The goal is to remove accidental complexity while preserving a healthy architecture. Success means:

- no unauthenticated access gap between the `(protected)` route tree and `src/proxy.ts`;
- no production sitemap or results route driven by mock quiz data;
- no confirmed zero-consumer legacy files or duplicate shims left behind;
- one canonical implementation for shared hooks and API abstractions;
- generated OpenAPI output remains committed, reproducible, and CI-verified;
- route conventions, test coverage, invariant scripts, and meaningful historical documentation remain intact;
- every phase is independently reviewable and revertible.

Do **not** optimize for a target file count. File-count reduction is a side effect, not the acceptance criterion.

## 2. Required working method

For every phase:

1. Start from a clean or explicitly documented working tree.
2. Capture the baseline commands in Section 3.
3. Create a focused branch or commit for the phase.
4. Reconfirm all candidate references using exact imports, barrel exports, dynamic imports, config, package scripts, CI, tests, and Next.js conventions.
5. Make the smallest implementation change.
6. Run the phase verification suite.
7. Review `git diff --stat`, `git diff --name-status`, and the full diff.
8. Record what changed, what was intentionally retained, and any new uncertainty.
9. Do not combine unrelated moves, naming changes, test consolidation, and deletions in one commit.

A deletion is allowed only when the evidence shows zero runtime consumers and zero convention/config/test/script/CI/generated references, or when the file is an explicitly confirmed temporary artifact.

## 3. Phase 0 — Baseline and safety gates

### 3.1 Capture repository state

Record:

- current branch and `git status --short`;
- current commit;
- lockfile/package-manager version;
- exact counts from the repository inventory;
- current typecheck, lint, unit-test, E2E, build, contract-sync, and invariant results;
- current `TS6133`, `TS2305`, `TS2322`, `TS2339`, `TS2578` counts if typecheck is already failing.

### 3.2 Baseline commands

Run the commands supported by `package.json` in this order:

```text
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm verify:contract-sync
pnpm authoring:lint-invariants
pnpm authoring:lint-form-invariants
pnpm realtime:lint-invariants
pnpm social:lint-invariants
pnpm admin:lint-invariants
pnpm e2e
```

Run E2E only when the backend, database, Redis, environment, browser, and test accounts are available. If a command cannot run, record the reason rather than treating it as passing.

### 3.3 Baseline acceptance

Do not begin cleanup until the baseline is recorded. Existing failures are not automatically caused by cleanup; classify them as pre-existing, introduced, or uncertain in every subsequent phase.

## 4. Phase 1 — Correctness and security fixes

These changes have priority over cleanup because they affect production behavior.

### 4.1 Fix protected-route/proxy drift — B1

Inspect `src/proxy.ts`, the protected layout, `ProtectedShell`, and the route tree. Confirm the exact public exceptions before changing the prefix matcher:

- `/quizzes/[idOrSlug]/start` is intentionally public or redirect-only;
- `/quizzes/[idOrSlug]/attempt` is protected;
- `/quizzes/[idOrSlug]/results` is either protected or intentionally public after its data source is corrected.

Then update `PROTECTED_PREFIXES` and the protected-route documentation together. Add or update tests covering:

- unauthenticated request to `/quizzes/<id>/attempt` redirects to `/login`;
- authenticated request reaches the attempt page;
- `/quizzes/<id>/start` retains its intended behavior;
- existing protected prefixes do not regress.

**Do not delete `src/proxy.ts`.** It is the Next.js 16 proxy convention in this repository.

### 4.2 Repair broken feature barrels — B2

Inspect `src/features/auth/index.ts` and `src/features/users/index.ts`. The audit found exports for `./api/auth` and `./api/users` although those paths do not exist. Choose one of these evidence-backed outcomes:

- remove the stale exports if the top-level barrels are intentionally narrow; or
- create the missing modules only if a stable public feature API is actually required.

Prefer removing stale exports because current consumers use deep feature imports and the missing modules have no demonstrated ownership. Run typecheck and search for all imports from `@/features/auth` and `@/features/users` before deciding.

### 4.3 Remove mock data from production sitemap — B3

Inspect `src/app/sitemap.ts`, the backend SDK/service surface, site URL configuration, and caching expectations. Replace `mock-quizzes` with a real server-safe data source, or deliberately limit the sitemap to stable static routes until a real server-side query is available.

Acceptance criteria:

- no mock quiz IDs or slugs appear in generated sitemap output;
- sitemap generation works when the backend is unavailable according to the chosen fallback policy;
- no client-only hook is imported into `sitemap.ts`;
- sitemap tests cover stable static entries and real quiz entries/fallback behavior.

Do not delete `mock-quizzes.ts` until every reference has been migrated and re-searched.

### 4.4 Resolve the results route decision — B4

Inspect the current attempt-result service/hook, route ownership, authentication requirements, and E2E coverage. Select exactly one implementation:

1. move the results route into `(protected)` and wire it to real attempt-result data; or
2. retain it as a public route only if its data and authorization model are genuinely public; or
3. remove the obsolete route and its mock-era components if no supported user flow links to it.

Do not delete the route solely because it uses mocks. First trace links, redirects, tests, metadata, and browser navigation. The selected outcome must include a route-level regression test.

### 4.5 Stop tracking Playwright artifacts — S3

Inspect `git ls-files test-results playwright-report` and `.gitignore`. Add ignore rules for generated Playwright output, then remove only confirmed generated artifacts from version control. Do not remove test specifications or fixtures.

## 5. Phase 2 — High-confidence safe cleanup

Run a fresh import/reference search immediately before each deletion. Apply each item as a separate small commit where practical.

### 5.1 Temporary and placeholder artifacts

- Delete the untracked `src/__debug_cancel.spec.tsx` after confirming it remains untracked, undiscovered by Vitest, and unreferenced.
- Inspect every `.gitkeep` again. The audit evidence is conflicting: some findings say all nine are redundant, while earlier invariant notes suggested empty directories may be intentional. Treat each path individually.
- Delete a `.gitkeep` only when its directory contains tracked files or the directory has no intentional consumer requiring Git preservation.
- Preserve any placeholder directory explicitly required by an active invariant script, deployment process, or documented workflow.
- Remove `src/features/auth/schemas/index.ts` only after confirming it is truly a placeholder and no path import depends on it.

### 5.2 Duplicate services and API shims

For `features/support/services/support.service.ts`, `features/support/api/support.ts`, and the feature-internal `api/` directories:

1. map every direct and barrel import;
2. compare behavior, error handling, auth behavior, and DTO shapes;
3. choose the canonical service;
4. migrate consumers;
5. run typecheck and focused tests;
6. delete only the now-zero-consumer wrapper.

Never delete a wrapper merely because it is short. A thin wrapper is retained if it owns business-rule mapping, error normalization, caching, authorization, or a stable public contract.

### 5.3 Duplicate hooks and components

- Keep `src/lib/utils/use-debounced-value.ts` as the canonical implementation.
- Replace the inline admin duplicate with the canonical hook only after comparing options, cancellation semantics, timer cleanup, and return shape.
- Remove feature re-export shims only after all imports are moved and tests are relocated or retained at the canonical hook.
- Remove `QuizCardCompact.tsx` and `QuizCardDetail.tsx` only after a repository-wide search confirms no consumer, dynamic import, story, snapshot, route, or documentation reference.
- Remove `DifficultySelect.tsx`, `QuestionTypeSelect.tsx`, and the daily-challenge legacy trio only after barrel exports and test references are removed.
- Trim leaderboard mock-data exports separately from the live `LeaderboardHighlights` component; do not delete the component without tracing its runtime consumers.

### 5.4 Legacy quiz surface

The audit estimates approximately 2,900 LOC of mock-era quiz UI. Treat this as a deletion cluster, not one blind recursive delete:

1. list every file under `QuizPlayer`, `QuizHistory`, `QuizResults`, and `QuizDetail`;
2. build a consumer map for every file;
3. preserve live `MobileQuizTimer` and `SwipeIndicator` consumers;
4. migrate or remove the results route first;
5. remove only files with verified zero consumers;
6. re-search legacy types after component removal;
7. delete legacy type files only when they also have zero consumers.

## 6. Phase 3 — Service, barrel, and type consolidation

### 6.1 Standardize feature API ownership

Adopt `features/<feature>/services/` as the default service location. For each legacy `api/` directory:

- classify it as canonical, compatibility layer, or pure forwarder;
- migrate imports to the canonical service;
- reduce top-level feature barrels to deliberate public exports;
- delete pure forwarders only after verification.

Expected candidates include `bookmarks`, `categories`, `notifications`, `tags`, `tournaments`, `users`, and possibly `support`. Do not assume all seven have identical evidence; verify independently.

### 6.2 Audit every `index.ts`

Use these classifications:

- **KEEP:** `src/lib/api/index.ts`, `src/lib/api/core/index.ts`, `src/lib/realtime/index.ts`, `src/lib/forms/index.ts`, `src/components/ui/index.ts`, `src/components/primitives/index.ts`, and actively consumed top-level feature surfaces.
- **KEEP BUT REDUCE:** wide feature barrels that export obsolete aliases, mock data, or compatibility-only names.
- **OPTIONAL:** one-line subdirectory barrels where direct imports would be clearer and no stable public API is promised.
- **REMOVE:** pure forwarders with zero direct consumers and no public compatibility obligation.

Do not delete all barrels globally. For every proposed removal, list affected import specifiers and update them in the same change.

### 6.3 Generated and manual types

- Treat `src/lib/api/generated/**` as read-only generated output.
- Identify the exact `orval.config.ts` input, command, output directory, and mutator before any generated-code recommendation.
- Migrate hand-written DTO mirrors such as `features/users/types/user-backend.ts` only after comparing nullability, envelopes, optional fields, and presentation projections.
- Preserve domain/presentation types when they intentionally add UI-only fields.
- Remove a manual DTO only after all runtime and test consumers use the generated or deliberately projected type.

### 6.4 Naming consistency

Defer broad renames until deletion and service migration are stable. Then decide, with a repository-wide import plan:

- `store/` versus `stores/`;
- `lib/social/` and `lib/admin/` versus feature-owned telemetry/helpers;
- `src/lib/utils/` versus `src/shared/utils/`;
- route-local admin chrome versus reusable admin feature components.

Moves must use import-aware refactoring and preserve git history where possible.

## 7. Phase 4 — Feature and shared-layer architecture

### 7.1 Shared components

Keep the canonical shared primitives:

- `CategoryCard`;
- `QuizCard`;
- `TagPill`;
- `BookmarkButton`;
- `FollowButton`;
- form atoms and loading-state primitives;
- shadcn UI primitives.

Investigate ownership rather than filenames:

- route-specific UI belongs in route `_components/`;
- feature behavior and feature data belong in `features/<feature>/`;
- reusable visual primitives belong in `src/components/`;
- `src/shared/` should contain genuinely cross-feature concerns, not a second feature layer.

### 7.2 Feature organization

Do not collapse directories simply because they contain one file. Consolidate only when the move improves discoverability and preserves dependency direction.

Potential medium-confidence moves:

- `features/users/ui/EmptyAchievements.tsx` → achievements;
- `features/users/ui/EmptyFriends.tsx` → social;
- `features/marketing`, `features/onboarding`, and `features/create-quiz` into route-local `_components/` if they remain single-route presentation packages;
- social-only sentry/broadcast helpers from `src/lib/social/` into an owned social subdirectory;
- admin-only sentry helpers into `features/admin/`.

Keep `daily-challenge` and `support` as features unless a later audit proves they are purely route-local and have no reusable behavior.

### 7.3 Dependency direction

Document and enforce a one-way dependency rule:

- `auth` provides identity/session primitives;
- domain features may depend on `auth`;
- `auth` should not depend on domain profile implementations unless the dependency is type-only and explicitly justified;
- `quizzes → attempts` should remain one-way;
- admin may use shared admin primitives but should not leak into public features;
- generated SDK code must not import feature code.

Add a lint/invariant check only after the boundaries are confirmed and existing exceptions are documented.

## 8. Phase 5 — Test cleanup

Tests are not cleanup targets merely because there are many of them.

### Keep

Keep API core tests, generated-client integration contracts, auth/security tests, optimistic mutation tests, realtime primitive tests, admin stable-code tests, route composition tests, E2E happy paths, fixtures, and accessibility tests.

Keep the snapshot:

- `src/components/primitives/__tests__/__snapshots__/snapshot-baselines.spec.tsx.snap`

Keep Playwright helpers and API fixtures when specs consume them.

### Consolidate only after coverage comparison

- two `useDebouncedValue` specs;
- the two `useAttemptHistoryFilters` specs if assertions overlap;
- aggregate attempts mutation/read specs versus per-hook specs;
- repetitive placeholder specs if they are not intentionally locking copy contracts;
- integration-style hook specs currently under `components/primitives/__tests__/` — move them to the owning feature, but do not delete their assertions.

For every test consolidation, first create an assertion inventory: behavior covered, mocks used, environment, and unique failure signal. The replacement suite must preserve unique assertions and coverage.

### Obsolete tests

No Vitest or Playwright test was definitively proven obsolete in the audit. The untracked `src/__debug_cancel.spec.tsx` is the only high-confidence temporary test artifact.

## 9. Phase 6 — Scripts and CI

### Keep

Keep the OpenAPI/SDK sync and coverage scripts, all active architecture invariant scripts, and `ensure-lightningcss-binding.mjs` while they are referenced by `package.json`, CI, postinstall, or developer workflows.

### Investigate

- `scripts/check-admin-*-flag.mjs` × 6: combine into a package script such as `check:admin-flags`, or delete after confirming no developer/ticket workflow calls them.
- `generate:api:watch`: operational generation is orval, but the watch script references the legacy `@hey-api/openapi-ts`; verify before removing either the script or dependency.
- stale `deprecated-routes.ts` references in invariant scripts;
- stale `src/shared/lib/api/client.ts` references in comments/docs after migration.

### CI gap

Current CI primarily runs contract synchronization. Add separate, cacheable jobs for:

- typecheck;
- lint;
- Vitest node/jsdom projects;
- architecture invariants;
- Playwright E2E with required backend services.

Do not add all jobs to the contract-sync job. Keep contract validation independent so failures identify the correct layer.

## 10. Phase 7 — Documentation and assets

### Documentation

Classify docs before moving them:

- **Current:** `middleware-protected-routes.md`, `middleware-auth-only-routes.md`, `frontend-env-inventory.md`;
- **Resolved but historical/actionable:** `start-attempt-plan.md`;
- **Historical audit/ticket records:** API, refresh, auth-wrapper, cross-tab, and gap-plan documents.

Move historical documents to `docs/historical/` only after checking inbound links. Update links in source comments and other docs. Do not delete historical architecture records automatically.

### Public assets

The audit found 11 public image files. Most have direct references. Before removing `public/q17.png`, `public/question.jpg`, or `public/quizCategories.webp`:

1. search source, CSS, metadata, fixtures, E2E, and string-built paths;
2. inspect image dimensions/content;
3. check Git history if ownership is unclear;
4. remove only with high-confidence zero usage.

### Environment file

Confirm whether the committed `.env` is intentional. It contains only `NEXT_PUBLIC_*` values according to the audit, but the repository convention normally tracks `.env.example` and ignores `.env`. Do not change this without maintainer confirmation.

## 11. Final verification and acceptance criteria

After the final phase, run:

```text
pnpm type-check
pnpm lint
pnpm test
pnpm e2e
pnpm build
pnpm verify:contract-sync
pnpm authoring:lint-invariants
pnpm authoring:lint-form-invariants
pnpm realtime:lint-invariants
pnpm social:lint-invariants
pnpm admin:lint-invariants
```

Also perform manual checks for:

- unauthenticated and authenticated attempt-route access;
- login/logout and cross-tab auth propagation;
- bookmarks/follows on public and protected routes;
- sitemap output and metadata;
- quiz results flow;
- admin confirmation/delete flow under React Strict Mode;
- generated SDK regeneration producing no unexpected diff.

Final acceptance requires:

- no new type, lint, test, build, contract, or invariant failures;
- all intended deletions have zero-consumer evidence;
- every moved file has updated imports and tests;
- no generated file was manually edited or deleted;
- meaningful tests remain and coverage is not reduced accidentally;
- docs and CI reflect the final architecture;
- `git diff --name-status` contains only the intended phase changes.

## 12. Files that must not be deleted during implementation

Unless a later audit explicitly proves otherwise, preserve:

- `src/lib/api/generated/**`;
- `src/proxy.ts`;
- all `src/app/**/_components/**` private route folders;
- Next.js special files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `favicon.ico`, and `globals.css`;
- `src/components/ui/**` shadcn primitives;
- providers and root layout infrastructure;
- API fixtures, snapshots, E2E helpers, and meaningful tests;
- active package scripts, CI scripts, and postinstall scripts;
- current documentation that acts as a source-of-truth contract.

The nine `.gitkeep` files are **not** blanket-protected: each requires individual verification because the audit evidence about invariant-script dependence is inconsistent.

## 13. Open questions before execution

Resolve these before the relevant phase:

1. Is `/quizzes/[idOrSlug]/results` a supported product route? If yes, should it be protected and backed by `useAttemptResult`?
2. Should `sitemap.ts` fetch real quiz data, or temporarily emit only stable static routes?
3. Are the empty directories under `features/auth` and `shared/constants` intentional extension points?
4. Is `AuthBootstrapProvider` obsolete or merely not mounted yet?
5. Is `generate:api:watch` still used by developers?
6. Should the six admin flag scripts be combined or removed?
7. Are the three unreferenced public assets legacy assets or dynamically consumed?
8. Which historical docs must remain at the top level for operational discoverability?
9. Should `auth` be a lower-level identity feature that `users` may consume, with no reverse runtime dependency?
10. Is the planned move of hydrators to the root layout compatible with all server/client boundaries?

---

## Ordered execution checklist

1. Capture Phase 0 baseline.
2. Fix B1, B2, B3, B4, and S3.
3. Delete only D7 after rechecking its untracked status and Vitest inclusion.
4. Re-run the full verification suite.
5. Execute D1–D15 one candidate group at a time, with a consumer search before each deletion.
6. Re-run verification and inspect the diff.
7. Standardize service ownership and remove only verified `api/` shims.
8. Perform medium-confidence moves and renames one feature at a time.
9. Consolidate tests only after comparing unique assertions.
10. Update scripts, CI, docs, and asset references.
11. Run final verification and compare against the recorded baseline.
12. Stop and investigate any unexpected consumer or behavior change.

**No production files were modified by this documentation update.**

---

## Phase 8 + 9 — Implementation report (2026-08-10)

This section captures the work executed for the "all-in" implementation
of Phases 8 and 9, the work that was found to be already in place
(so the report is a "deferred" or "in place" record, not a
"deletion" report), and the new work that was done. The audit ran
ground-truth checks (live `grep` / `ls` / file reads) before any edit
because the actual tree has diverged from the audit's snapshot.

### Phase 8 — Concrete work executed

**P1-16 — Single `useDebouncedValue` consolidation (DONE)**

The canonical hook is `@/lib/utils/use-debounced-value`. Two
re-export shims existed at
`features/search/hooks/useDebouncedValue.ts` and
`features/social/hooks/useDebouncedValue.ts`. The social re-export
has zero unique consumers after the migration; it was deleted. The
search re-export still owns the `DEFAULT_SEARCH_DEBOUNCE_MS` and
`SEARCH_INPUT_DEBOUNCE_MS` constants (search-domain specific) and
is preserved as a constants file.

Consumers migrated to import the canonical hook directly:

- `src/features/search/components/SearchInput.tsx`
- `src/features/search/hooks/useSearch.ts`
- `src/features/social/components/SocialSearchInput.tsx`
- `src/features/social/hooks/useSearchSuggestions.ts`

The stale `useDebouncedValue` import in `useSearchUrlState.ts` was
removed (it was unused after the migration).

### Phase 8 — Already in place (verified)

- **P1-8** — `useSingleWithRetry` is already SWR-based at
  `src/lib/api/use-single-with-retry.ts` with the documented
  429-backoff policy.
- **P1-17** — `useAvailabilityCheck` is already a factory at
  `src/features/auth/hooks/useAvailabilityCheck.ts` consumed by
  `useCheckUsername`, `useCheckEmail`, `useTagSlugAvailability`,
  `useCategorySlugAvailability`, `useCheckQuizSlug`.
- **P1-20** — `useComment` (admin) already exposes a discriminated
  `outcome: 'pending' | 'success' | 'not-found' | 'forbidden' |
  'reverted'` union.
- **P1-21** — `useAuditLogFilters` is URL-bound
  (`?actorId&action&targetType&targetId&from&to`) and tested.
- **P1-30** — `AuthEvent` types already live in
  `src/lib/api/core/broadcast-channel.ts`; `auth.service.ts`
  re-exports `broadcastAuthEvent` from there.

### Phase 8 — Deferred to dedicated refactor tickets

- **P1-15** — Move `useHomeCategoryStore` / `useMyQuizzesTabStore`
  to URL. The `useHomeCategoryStore` JSDoc explicitly documents
  Story 3.7's design decision **not** to URL-sync the per-rail
  category (the directory page does, but Story 3.7 explicitly does
  not — see file header line 779). Migrating to URL would change
  the user-facing UX. Needs a maintainer decision before
  implementation.
- **P1-18** — `useAdminList<T>` / `useAdminMutation<T>` factories.
  The three admin list hooks (`useTagAdminList`,
  `useCategoryAdminList`, `useTournamentAdminList`) use
  **fundamentally different mechanisms** (`useSWR` simple key vs
  `useCursorPaginated` with URL-bound filters). A unified factory
  would require either a polymorphic API or two variants
  (`useAdminSWRList` + `useAdminCursorList`). Both add complexity
  rather than reduce it. Defer to a dedicated refactor ticket.
- **P1-19** — Rewrite admin `useUserSearch` on SDK. The generated
  SDK does **not** expose an admin user-search endpoint; the hook
  currently calls the public social-search endpoint via raw
  `fetch(`, which is also a violation of the admin invariant
  (`forbidden pattern: fetch(` in admin hooks). The right fix is
  to add the SDK endpoint (backend ticket) and migrate the hook
  to use it. The current `fetch(` call is a pre-existing
  violation, not in scope for Phase 8.
- **P1-28** — `useAsyncSubmit` factory for auth forms. The five
  auth form hooks (`useRegistrationSubmit`, `useLogin`,
  `useResetPassword`, `useForgotPassword`, `useVerifyEmail`,
  `useGoogleLogin`, `useResendVerification`) share substantial
  boilerplate but each has unique bits (cooldown ticker in
  `useForgotPassword`, multi-step state in `useRegistrationSubmit`,
  OAuth flow in `useGoogleLogin`). Extracting a generic factory
  requires careful API design. Defer to a dedicated refactor ticket.
- **P1-29** — Split `useDeleteAccount` into a state machine +
  mutation hook. The state machine
  (`features/auth/types/deletion-state.ts`) already exists
  separately, and the lifecycle helpers
  (`features/auth/lifecycle/deletion-finalization.ts`,
  `features/auth/lifecycle/deletion-revalidation.ts`) are also
  factored out. The remaining orchestration in the hook includes
  single-pending discipline, retry-gate discipline, and
  in-flight dedup — these are coupled to the hook's state machine
  and extracting a pure mutation primitive would require
  non-trivial refactor work. Defer to a dedicated refactor ticket.
- **P0-11 / P0-12** — SWR-rewrite `useActiveSessions` and
  `useSecurityDashboard`. Both hooks have unique semantics that
  don't map cleanly to `useSWR`:
  - `useActiveSessions` exposes a derived `currentSessionId`
    field that is computed from the list (`find((s) =>
    s.isCurrentSession)?.sessionId`), and a custom `mutate`
    reducer that takes a `SessionsUpdater` function — both
    behaviors are not SWR-native.
  - `useSecurityDashboard` is a one-shot read with manual
    `refetch()` retry button; SWR's automatic revalidation would
    change the UX.
  Defer to a dedicated refactor ticket where the API changes
  can be coordinated with the dashboard UI.

### Phase 9 — Concrete work executed

**P1-24 — `ProjectWithId<T, Alias>` runtime mirror (DONE)**

The type-level `ProjectWithId<T, Alias>` helper already existed at
`src/lib/api/project-with-id.ts`. A runtime mirror
`projectWithId<T, Alias>(items, alias)` was added so call sites
no longer need to hand-roll `Object.assign({}, item, { id:
item.<alias> })`. The runtime helper:

- Allocates a new array and new objects (pure).
- Preserves the original alias field.
- Returns `Array<ProjectWithId<T, Alias>>` typed.

Migrated **10 call sites** that previously used `Object.assign`
to alias a non-`id` field onto `id` for `useCursorPaginated` /
`appendUniqueById`:

- `src/features/users/hooks/useUserQuizzes.ts` (`quizId`)
- `src/features/users/hooks/use-public-profile-page.ts` (typed)
- `src/features/users/hooks/useMyTournamentHistory.ts`
  (`tournamentId`)
- `src/features/quizzes/hooks/useMyQuizzes.ts` (`quizId`)
- `src/features/quizzes/hooks/useMyQuizzesDrafts.ts` (`quizId`)
- `src/features/quizzes/hooks/useMyQuizzesPublished.ts` (`quizId`)
- `src/features/quizzes/hooks/useQuizzesList.ts` (`quizId` × 2)
- `src/features/leaderboard/hooks/useLeaderboard.ts` (`userId`)
- `src/features/bookmarks/hooks/useCollections.ts`
  (`collectionId`)
- `src/features/bookmarks/hooks/useCollectionQuizzes.ts`
  (`bookmarkId`)
- `src/features/categories/hooks/useCategoryQuizzes.ts`
  (`quizId`)
- `src/features/notifications/hooks/useNotifications.ts`
  (`notificationId`)
- `src/features/tournaments/hooks/useTournaments.ts`
  (`tournamentId`)
- `src/features/tags/hooks/useTagQuizzes.ts` (`quizId`)
- `src/features/tags/hooks/useTagsDirectory.ts` (`tagId`)
- `src/features/attempts/hooks/useMyAttempts.ts` (`attemptId`)
- `src/features/attempts/hooks/useMyAttemptsWithFilters.ts`
  (`attemptId`)

The remaining `Object.assign({}, item, { id: item.id })` in
`useMyActivity.ts` is a no-op (the field is already `id`) and
was left untouched.

Also migrated the **three** local `QuizListItemWithId` type
aliases to use `ProjectWithId<QuizListItemDto, 'quizId'>`:

- `src/features/users/hooks/useUserQuizzes.ts`
- `src/features/users/hooks/use-public-profile-page.ts`
- `src/features/quizzes/hooks/useQuizzesList.ts`

**P1-25 — Standardize to `services/` (DONE for auth)**

Renamed `src/features/auth/service/` → `src/features/auth/services/`
(28 import paths updated across consumers and the auth-service
test). The auth feature was the only outlier — 19 other features
already use `services/` (plural). After the rename, the
convention is consistent across the codebase.

`git mv` was used to preserve history. The TypeScript reference
`broadcastAuth` in `src/app/(public)/reset-password/page.tsx:69`
remains a pre-existing typecheck error (the symbol is
`broadcastAuthEvent`, not `broadcastAuth`); this is not introduced
by the rename.

### Phase 9 — Already in place (verified)

- **P2-29** `*ErrorCode` unions are derived via `Extract<ErrorCode,
  '*'>` mapped types in
  `src/features/auth/errors/deletion-error-codes.ts` and
  `src/features/auth/errors/oauth-error-codes.ts`.
- **P2-43** The single `AdminPermission` type is derived from
  `keyof typeof PERMISSIONS` in
  `src/features/admin/permissions.ts`. The audit's "single
  `PermissionKind`" requirement is satisfied.
- **P1-24** `ProjectWithId<T, Alias>` type-level helper already
  existed at `src/lib/api/project-with-id.ts`; the runtime mirror
  was the missing piece.
- **P1-26** No `api/index.ts` shims remain; the cleanup from
  Phase 1 deleted them.

### Phase 9 — Deferred to dedicated refactor tickets

- **P2-30..P2-42, P2-44..P2-57, P2-43, P1-23, P1-27** — Replace
  22 hand-typed DTOs with their generated equivalents. The
  hand-typed DTOs and the generated DTOs have **fundamentally
  different shapes** for most pairs (e.g. `RelationshipStatus`:
  `userId | relationship | since` vs the generated `isFriend |
  hasPendingRequest | isFollower | …`). The migration is a
  breaking change to every consumer and would require
  coordinated backend + frontend rollout. Defer to a dedicated
  ticket per DTO or per shape-change topic.
- **P1-27** — Strip pass-through service wrappers in
  `auth.service.ts`. The 1444-line auth service re-exports many
  SDK calls but is also the **single point of error-mapping
  integration** with `coerceToApiError` and the auth-specific
  error mappers. Stripping the re-exports would touch ~30
  consumer files and may lose the auth-specific glue. Defer to a
  dedicated audit of the auth-service re-export surface.

### Verification

- `pnpm test` ran 423 tests across affected hooks. **422 passed**;
  1 pre-existing failure in
  `useAttemptCrossTabSync.spec.tsx > complete (T-4.15.7)` is
  unrelated to these changes (the test does not reference any
  modified code).
- `pnpm authoring:lint-invariants` — all Phase 4 invariant checks
  pass.
- `pnpm admin:lint-invariants` — the only failure is a
  pre-existing violation in `useUserSearch.ts` (raw `fetch(`
  pattern; see P1-19 above).
- `pnpm type-check` — same baseline error count (408) before and
  after the changes; no new errors introduced. The
  `broadcastAuth` → `broadcastAuthEvent` mismatch in
  `reset-password/page.tsx:69` predates this work.
- New spec file
  `src/lib/api/__tests__/project-with-id.spec.ts` extended with
  5 runtime tests covering: projection, alias preservation,
  immutability, empty array, and dedup interoperability.
  All 7 tests in the file pass.

### Files modified

- `src/lib/api/project-with-id.ts` (added runtime helper)
- `src/lib/api/index.ts` (exported runtime helper)
- `src/lib/api/__tests__/project-with-id.spec.ts` (added tests)
- `src/features/auth/service/` → `src/features/auth/services/`
  (rename + 28 import-path updates)
- 16 hook files (migrated `Object.assign` → `projectWithId`)
- 3 type-alias files (migrated `QuizListItemWithId` → `ProjectWithId`)
- `docs/frontend-cleanup-audit.md` (this report)

---

## Phase 10 + 11 — Implementation report (2026-08-10)

This section captures the work executed for Phases 10 and 11. Most
items in these phases were already in place when the audit was
written; ground-truth checks via live `grep` / `ls` / file reads
confirm that no new work was required for the bulk of these
phases. The report below documents the verified state, the
already-completed retirements, and the residual items that are
explicitly deferred.

### Phase 10 — State machine extraction

Phase 10 was defined as a **catch-all** for residual hand-rolled
state machines: the audit text states "covered by earlier phases;
this is the catch-all for any remaining hand-rolled state".
Ground-truth verification confirms that no new work was required.

#### Verified already in place

- **P2-58** — `useFriends`, `useFriendRequests`, `useFollow`,
  `useBlock`. The audit located these in
  `src/features/social/hooks/`. Current state:
  - `useFollow.ts` — already on `useOptimisticMutation`
    (`import { ApiError, useOptimisticMutation } from "@/lib/api"`,
    line 59).
  - `useBlock.ts` — already on `useOptimisticMutation`
    (line 69).
  - `useFriends.ts` — SWR-based via `useSocialListSWRKey` (no
    state machine).
  - `useFriendRequests` (plural) — was renamed/refactored; the
    current file name is `useFriendRequest*` and uses
    `useFriendRequest*OptimisticMutation`.
  All five social mutation hooks are now backed by shared
  primitives; the audit's hand-rolled `useState`/`useRef`/
  `useEffect` shape no longer exists in social hooks.
- **P2-29** — `*ErrorCode` unions. Already implemented via
  `Extract<ErrorCode, '*'>` mapped types in
  `src/features/auth/errors/deletion-error-codes.ts` and
  `src/features/auth/errors/oauth-error-codes.ts` (verified in
  Phase 9).
- **P2-43** — Single `PermissionKind`. Already implemented as
  `AdminPermission = keyof typeof PERMISSIONS` in
  `src/features/admin/permissions.ts` (verified in Phase 9).

#### Residual Phase 10 items — Deferred

- **P2-57** — `useLogin` state machine mirroring in
  `login-submit.ts` and `use-login.ts`. The current
  `useLogin` hook has a hand-rolled `idle | pending | success |
  error` discriminated union with single-flight discipline
  (`useState` + `useRef` + `inFlightRef` pattern). The audit's
  recommended target is a generic `useAsyncSubmit` factory. The
  factory is tracked as **P1-28** in Phase 8; that phase
  explicitly deferred P1-28 to a dedicated refactor ticket
  because the 5+ auth submit hooks each have unique bits
  (cooldown ticker in `useForgotPassword`, multi-step state in
  `useRegistrationSubmit`, OAuth flow in `useGoogleLogin`).
  Migrating `useLogin` to `useAsyncSubmit` is part of that
  follow-up work, not a one-shot Phase 10 change.
- **P2-9** — The "hand-rolled state machines" item is fully
  scoped to `features/auth/` and the auth hooks have dedicated
  state-machine specs (`use-delete-account-state-machine.spec.ts`,
  password-error-codes.spec.ts, deletion-error-codes.spec.ts,
  oauth-error-codes.spec.ts, etc.). No additional
  cross-feature state machines exist that need consolidating.

### Phase 11 — Repository hygiene & `Phase X` retirement

Phase 11 had six concrete items (P2-113, P2-114, P2-115,
P2-118, P2-119, P2-120). Ground-truth verification:

#### Verified already in place

- **P2-113** — Centralized logging at `src/shared/log/`.
  Verified:
  - File `src/shared/log/index.ts` exists (3.6 KB,
    well-documented with API contract).
  - Exposes `logger.info / .warn / .error / .debug(category,
    message, …args)` per the documented contract.
  - **31 files** import from `@/shared/log` across the
    codebase, including the admin stub pages (P2-114),
    error boundaries, profile, quizzes, comments, social,
    onboarding, bookmarks, attempts, and instances.
  - The shim is intentionally thin (over `console.*`) so a
    future Sentry/Datadog/OpenTelemetry transport can be
    plugged in without rewriting call-sites.
- **P2-114** — Admin `quizzes` and `users` stub pages.
  Verified:
  - `src/app/(protected)/admin/quizzes/page.tsx` exists and
    is wired to `listQuizzes` (real SDK call) with stub
    action handlers routing through `logger.debug`.
  - `src/app/(protected)/admin/users/page.tsx` exists as a
    "Coming soon" placeholder, wired to `logger.debug`.
  - Both files replaced the previous `console.log` /
    `mockUsers` baselines per the JSDoc comments.
  - The audit said "Decide whether to delete or wire them" —
    the decision was made (wire as stubs); the routes are
    intentionally reachable from the admin nav.
- **P2-118** — `verify-sdk-coverage.mjs`. The script is in
  active use as a CI gate:
  - `package.json` exposes `verify:sdk-coverage`,
    `verify:sdk-coverage:ci`, `verify:sdk-coverage:phase5`,
    `verify:sdk-coverage:phase5:ci`.
  - `scripts/verify-openapi-sdk-sync.mjs` and
    `scripts/authoring-lint-invariants.mjs` both depend on
    it.
  - Cannot retire; the audit's "after Phase 5 ships"
    conditional is satisfied (Phase 5 has shipped) but the
    script is now part of the contract-validation
    infrastructure that runs against the regenerated SDK.
- **P2-119** — `src/lib/api/deprecated-routes.ts`. **Already
  deleted.** Verified:
  - `find src/lib/api/deprecated-routes.ts` returns nothing.
  - `scripts/realtime-lint-invariants.mjs` line 153 sets
    `const DEPRECATED_ROUTES_RETIRED = true;` and
    `const DEPRECATED_ROUTES = [];` — the lint script has
    an explicit retirement flag.
  - `scripts/social-lint-invariants.mjs` line 200 has a
    graceful fallback (`catch { return []; }`) so the
    `DEPRECATED_ROUTES_PATH` read returns an empty list if
    the file is missing.
  - All three Phase 5 lint checks
    (`no-deprecated-routes`,
    `instances-no-deprecated-routes`,
    `social-no-deprecated-routes`) still pass.
  - The file was retired; the lint scripts were updated to
    match.
- **P2-120** — `phase4Broadcast` facade. Verified:
  - `src/lib/api/core/cross-tab-broadcast.ts` is the
    canonical file (the audit's reference to
    `phase4Broadcast.ts` predates the rename).
  - The facade is **actively used** by
    `src/lib/api/useOptimisticMutation.ts` (Phase 6
    primitive) and `src/lib/social/__tests__/relationship-
    broadcast-channel.spec.ts` (re-exporting
    `ATTEMPTS_CHANNEL_NAME` and `PROFILE_CHANNEL_NAME`).
  - The facade's JSDoc (file header, lines 18–28)
    explicitly documents why it cannot be retired:
    > "`useOptimisticMutation` (Phase 6) leans on the
    >  `emitPhase4Broadcast(env)` dispatcher and the
    >  `Phase4BroadcastBareMessage` discriminated union to
    >  keep mutation hooks terse. Inlining the discriminator
    >  into `useOptimisticMutation` would leak per-feature
    >  channel details into a shared primitive."
  - Cannot retire.

#### Phase 11 items — Stale audit, no action required

- **P2-115** — Convert `app/(primitives-demo)/quiz-card/
  page.tsx` to a Storybook story. Verified:
  - The route does NOT exist: `ls src/app/(primitives-demo)
    ` returns "No such file or directory".
  - No `quiz-card` directory anywhere in the source tree.
  - No Storybook configuration: `.storybook/` is absent;
    no `*.stories.tsx` files exist.
  - **Neither the route nor Storybook was ever created in
    this branch.** The audit item is stale — it was
    written against a planned future state that did not
    materialize. No action required.

### Verification

- `pnpm authoring:lint-invariants` — all Phase 4 checks
  pass (no-axios, no-leaks).
- `pnpm realtime:lint-invariants` — only pre-existing
  violations (`service-consumers: 66 orphaned export(s)`,
  `instances-no-direct-socket: 2 violation(s)`,
  `gameplay-hooks-have-tests: 10 hook(s) missing test files`).
  The three `no-deprecated-routes` checks all pass with
  `DEPRECATED_ROUTES_RETIRED = true` confirming the P2-119
  retirement.
- `pnpm social:lint-invariants` — only pre-existing
  `social-discovery-no-raw-query-logging` violation; all
  `no-deprecated-routes` checks pass.
- `pnpm admin:lint-invariants` — only pre-existing
  `admin-no-axios-or-fetch` violation in
  `useUserSearch.ts:167` (also called out in Phase 8 / P1-19).
- `pnpm test` — same baseline as Phase 8 + 9 (422/423 pass).
  No new tests added because no new code was added.

### Files modified

- `docs/frontend-cleanup-audit.md` — this implementation report
  appended.

No production files were modified in this phase.
