/**
 * Project-wide feature-flags module.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.A2.
 *
 * ## What this module owns
 *
 * The first project-wide feature-flags surface. The module exposes a
 * typed `FeatureFlag` union, a per-flag value map, a synchronous
 * `getFeatureFlagValue` reader, and a boolean `isFeatureEnabled`
 * helper. Flags are read from a module-level constant table and may be
 * overridden at build time by the `NEXT_PUBLIC_*` env-var convention
 * used elsewhere in the codebase (see `src/lib/api/core/custom-instance.ts`
 * line 41 and `src/lib/api/core/auth-only-instance.ts` line 13).
 *
 * ## Directionality
 *
 * The module is one-way: features import the flag, the flag does not
 * import features. This is enforced by the design (no `import` from any
 * `src/features/**` directory) and is a cross-cutting invariant of
 * Phase 3 (see `PHASE_3_EPICS.md` line 66 — cross-story contract rules).
 *
 * ## SSR-safety
 *
 * The module is SSR-safe. It reads `process.env.NEXT_PUBLIC_*` at module
 * init time (build time in production); it does not access `window`,
 * `localStorage`, `document`, or any other browser-only API.
 *
 * ## Why the env-var override exists
 *
 * Per `EPIC_3_12_A1.md` §6.2, the daily-challenge page needs a way to
 * flip between the live and the placeholder surface without a code
 * change. The override is also the only path that lets a developer
 * verify the live branch against a future SDK that exposes a
 * daily-challenge operation, without a code edit.
 *
 * ## Adding a new flag
 *
 * 1. Add a string-literal entry to `FLAG_NAMES` (the const-typed
 *    runtime list) AND extend `FeatureFlag` (the union of names).
 * 2. Add the flag's per-flag value type to `FeatureFlagValueMap`.
 * 3. Add a default entry to `FLAG_DEFAULTS`.
 * 4. Add an env-var override entry to `FLAG_ENV_OVERRIDES`.
 * 5. Extend `isFlagValue` so the supported-value guard is exhaustive
 *    per flag (the type-narrowing helper).
 * 6. Add a test case in the co-located spec covering the default, the
 *    env-var override, and the unsupported-value fallback.
 *
 * ## Importable from two paths
 *
 *   - `@/lib/feature-flags` — the barrel at
 *     `src/lib/feature-flags/index.ts`. The canonical consumer path;
 *     mirrors the `@/lib/api` barrel convention.
 *   - `@/lib/feature-flags/feature-flags` — this implementation
 *     file. Used by the co-located spec and by future internal
 *     re-exports.
 *
 * Both paths must resolve to the same exports. The co-located spec
 * (TKT-3.12.A2 testing checklist item 5/6) locks this invariant.
 */

export type FeatureFlag =
  | 'dailyChallengePage'
  | 'phase4_authoring'
  | 'phase4_personal'
  | 'phase4_attempts'
  | 'phase5_realtime_infrastructure'
  | 'phase5_tournaments'
  | 'phase5_notifications'
  | 'phase5_instances'
  | 'phase5_instances_play'
  | 'phase5_rankings'
  | 'phase5_achievements'
  | 'phase5_search'
  | 'phase6_social'
  | 'phase6_social_relationship'
  | 'phase6_social_feed'
  | 'phase6_social_discovery'
  | 'phase6_social_notifications'
  | 'phase6_social_mutuals'
  | 'phase6_social_activity'
  | 'phase6_social_search'
  | 'phase6_social_follow_mutation'
  | 'phase6_social_block_mutation'
  | 'phase6_social_friend_request_mutation'
  | 'phase7_admin'
  | 'phase7_admin_review_moderation'
  | 'phase7_admin_comment_moderation'
  | 'phase7_admin_tag'
  | 'phase7_admin_category'
  | 'phase7_admin_ranking'
  | 'phase7_admin_achievement'
  | 'phase7_admin_tournament'
  | 'phase7_admin_user_role'

export type FeatureFlagValueMap = {
  /**
   * Daily-challenge page rendering mode.
   *
   * - `'v1'` — live surface (requires the regenerated SDK to expose a
   *   daily-challenge operation; otherwise the wrapper reports
   *   `kind: 'missing-endpoint'` and the page falls through to the
   *   placeholder regardless of this value).
   * - `'placeholder'` — static "Coming soon" surface. The locked Phase 3
   *   default at this commit (see `EPIC_3_12_A1.md` §6.3).
   */
  dailyChallengePage: 'v1' | 'placeholder'
  /**
   * Phase 4 authoring lane gate.
   *
   * Source epic:   Epic 4.1.
   * Source ticket: TKT-4.1.B1.
   *
   * Gates the three writer-side write flows introduced in Phase 4:
   *
   *   - Create / edit / publish a quiz (quiz + version + question CRUD)
   *   - Comment write (vote/edit/hide/report/restore) on a published quiz
   *   - Review write on a completed attempt
   *   - Bookmark collection CRUD + bulk add/remove
   *
   * The lane is independent of `phase4_personal` (the read-side personal
   * area) and `phase4_attempts` (the attempt lifecycle). One lane can be
   * flipped to `'live'` in production without unblocking the others.
   *
   *   - `'live'`       — service wrappers used by the authoring surfaces
   *                      fire `orvalCustomInstance<>` calls. UI is the
   *                      live surface (e.g. real `<QuizForm>`,
   *                      `<ReviewForm>`, `<CommentEditor>`).
   *   - `'placeholder'`— the static "Coming soon" rendering used today;
   *                      default at this commit.
   */
  phase4_authoring: 'live' | 'placeholder'
  /**
   * Phase 4 personal-area gate.
   *
   * Source epic:   Epic 4.1.
   * Source ticket: TKT-4.1.B1.
   *
   * Gates the read-side personal-area surfaces:
   *
   *   - `/my-profile`, `/quiz-history`, `/settings`, `/bookmarks`,
   *     `/my-attempts`, `/my-reviews`, `/my-reported-reviews`,
   *     `/my-badges`, `/my-activity`, `/my-ranking`
   *   - All `users/me/*` reads and all per-user bookmark collections
   *     reads
   *
   * Independent of `phase4_authoring` (write-side) and `phase4_attempts`
   * (the attempt lifecycle).
   *
   *   - `'live'`       — wrappers fire real `orvalCustomInstance` calls;
   *                      UI is the live personal area.
   *   - `'placeholder'`— the static "Coming soon" rendering; default.
   */
  phase4_personal: 'live' | 'placeholder'
  /**
   * Phase 4 attempts lane gate.
   *
   * Source epic:   Epic 4.1.
   * Source ticket: TKT-4.1.B1.
   *
   * Gates the attempt lifecycle (start/submit/withdraw/abandon/complete)
   * and the per-attempt read-side surfaces (attempt analytics, attempt
   * review, my attempts list, my attempt stats).
   *
   * Independent of `phase4_authoring` and `phase4_personal`.
   *
   *   - `'live'`       — `<AttemptRunner />` orchestration wraps SDK
   *                      calls against `attemptControllerStartAttempt`,
   *                      `attemptControllerSubmitAnswer`,
   *                      `attemptControllerWithdrawAnswer`,
   *                      `attemptControllerAbandonAttempt`,
   *                      `attemptControllerCompleteAttempt`, plus the
   *                      subsequent reads.
   *   - `'placeholder'`— placeholder surface; default at this commit.
   */
  phase4_attempts: 'live' | 'placeholder'
  /**
   * Phase 5 shared realtime infrastructure gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Controls the foundational realtime primitives consumed by
   * `phase5_notifications` and `phase5_instances`:
   *
   *   - `useSocket(namespace, handshakeAuth)`
   *   - `useRealtimeEvent(socket, eventName, handler)`
   *   - `useRealtimeQuery(swrKey, fetcher, invalidateOn)`
   *   - `ConnectionRegistry` (singleton per namespace)
   *   - `SocketConnectionState` machine
   *   - `decodeWsError()` and `KNOWN_WS_ERROR_CODES`
   *
   * Independent of all per-feature flags.
   * Default: `'placeholder'` (Phase 5 realtime surfaces off in production).
   *
   *   - `'live'`       — realtime hooks are functional; namespace
   *                      connections can be established.
   *   - `'placeholder'`— realtime hooks return no-op stubs; no socket
   *                      connections are opened.
   */
  phase5_realtime_infrastructure: 'live' | 'placeholder'
  /**
   * Phase 5 tournaments surface gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Gates:
   *   - Tournament discovery (`/tournaments`) and detail (`/tournaments/[id]`)
   *   - Tournament registration and withdrawal
   *   - Participant list and tournament leaderboard reads
   *
   * Requires `phase5_realtime_infrastructure` for live participant
   * count updates (optional in v1).
   *
   *   - `'live'`       — tournament surfaces are functional.
   *   - `'placeholder'`— static "Coming soon" rendering.
   */
  phase5_tournaments: 'live' | 'placeholder'
  /**
   * Phase 5 notifications surface gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Gates:
   *   - Notification bell with unread count
   *   - Notification center page (`/notifications`)
   *   - Mark-read, mark-unread, delete, and preferences mutations
   *   - Live notification delivery over the `/notifications` Socket.IO
   *     namespace (requires `phase5_realtime_infrastructure: 'live'`)
   *
   *   - `'live'`       — notification surfaces are functional.
   *   - `'placeholder'`— static "Coming soon" rendering.
   */
  phase5_notifications: 'live' | 'placeholder'
  /**
   * Phase 5 multiplayer instances surface gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Gates:
   *   - Instance lobby and player roster
   *   - Host controls (start/close/cancel countdown)
   *   - Realtime question reveal, answer submission, and leaderboard
   *     updates over the `/instances` Socket.IO namespace
   *     (requires `phase5_realtime_infrastructure: 'live'`)
   *
   *   - `'live'`       — instance surfaces are functional.
   *   - `'placeholder'`— static "Coming soon" rendering.
   */
  phase5_instances: 'live' | 'placeholder'
  /**
   * Phase 5 multiplayer instance play surface gate (Story 5.8).
   *
   * Source epic:   Epic 5.1 / 5.7.
   * Source ticket: TKT-5.8.F1.
   *
   * Gates:
   *   - Question reveal, answer submission, and live leaderboard updates
   *     over the `/instances` Socket.IO namespace
   *   - Per-instance gameplay store, timer, reconnect reconciliation
   *   - Instance game page and /instances/[id]/play route
   *
   * Independent of `phase5_instances` — disabling play does not affect the
   * lobby. Requires `phase5_realtime_infrastructure: 'live'`.
   *
   *   - `'live'`       — play surfaces are functional.
   *   - `'placeholder'`— static "Coming soon" rendering.
   */
  phase5_instances_play: 'live' | 'placeholder'
  /**
   * Phase 5 rankings and leaderboard surface gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Gates:
   *   - Global leaderboard (`/leaderboard`)
   *   - Personal ranking summary, history, and milestones
   *   - Nearby ranks and percentile views
   *
   *   - `'live'`       — ranking surfaces are functional.
   *   - `'placeholder'`— static "Coming soon" rendering.
   */
  phase5_rankings: 'live' | 'placeholder'
  /**
   * Phase 5 achievements surface gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Gates:
   *   - Badge catalog and badge detail pages
   *   - Earned badges and achievement history
   *   - Badge progress tracking
   *
   *   - `'live'`       — achievement surfaces are functional.
   *   - `'placeholder'`— static "Coming soon" rendering.
   */
  phase5_achievements: 'live' | 'placeholder'
  /**
   * Phase 5 search surface gate.
   *
   * Source epic:   Epic 5.1.
   * Source ticket: TKT-5.1.B1.
   *
   * Gates the global search experience integrated with Phase 5 discovery.
   *
   *   - `'live'`       — search surface is functional.
   *   - `'placeholder'`— search is not yet integrated.
   */
  phase5_search: 'live' | 'placeholder'
  /**
   * Phase 6 social graph & discovery hub parent gate.
   *
   * Source epic:   Epic 6.1.
   * Source ticket: TKT-6.1.B1.
   *
   * Gates the entire Phase 6 surface: relationship management
   * (follow / unfollow / block / unblock / friend requests), the
   * social feed, the discovery hub (suggestions / search suggestions
   * / user search / trending), and the realtime social notifications
   * stream.
   *
   * The four sub-flags (`phase6_social_relationship`,
   * `phase6_social_feed`, `phase6_social_discovery`,
   * `phase6_social_notifications`) are intentionally independent:
   * operations can flip a single sub-lane on in production without
   * unblocking the others (per master plan Phase 6 Risks lines
   * 54–66).
   *
   *   - `'live'`       — the parent is on; sub-flags may still be
   *                      individually off if their lane has not yet
   *                      passed its exit criteria.
   *   - `'placeholder'`— every Phase 6 surface is off; the static
   *                      "Coming soon" rendering is used everywhere.
   *                      Default at this commit.
   */
  phase6_social: 'live' | 'placeholder'
  /**
   * Phase 6 relationship mutations lane gate.
   *
   * Source epic:   Epic 6.1.
   * Source ticket: TKT-6.1.B1.
   *
   * Gates the mutation endpoints for follow / unfollow / block /
   * unblock / friend request send / friend request accept / friend
   * request decline / friend request cancel / remove friend, plus
   * the `<RelationshipActions />` surface that exposes them.
   *
   * Requires `phase6_social: 'live'` (the parent gate).
   *
   *   - `'live'`       — relationship mutations are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase6_social_relationship: 'live' | 'placeholder'
  /**
   * Phase 6 social feed lane gate.
   *
   * Source epic:   Epic 6.1.
   * Source ticket: TKT-6.1.B1.
   *
   * Gates the unified social activity feed (`/api/v1/social/feed`)
   * and the `<SocialFeed />` / `<SocialFeedItem />` rendering.
   *
   * Requires `phase6_social: 'live'`.
   *
   *   - `'live'`       — feed rendering is wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase6_social_feed: 'live' | 'placeholder'
  /**
   * Phase 6 discovery hub lane gate.
   *
   * Source epic:   Epic 6.1.
   * Source ticket: TKT-6.1.B1.
   *
   * Gates the discovery surfaces: search suggestions (`/social/search/suggestions`),
   * user search (`/social/users/search`), social suggestions
   * (`/social/suggestions`), and trending users
   * (`/social/users/trending`), plus the `<DiscoveryHub />`,
   * `<UserSearchBar />`, and `<TrendingUsers />` components.
   *
   * Requires `phase6_social: 'live'`.
   *
   *   - `'live'`       — discovery surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase6_social_discovery: 'live' | 'placeholder'
  /**
   * Phase 6 realtime social notifications lane gate.
   *
   * Source epic:   Epic 6.1.
   * Source ticket: TKT-6.1.B1.
   *
   * Gates the realtime social events delivered over the Phase 5
   * `/notifications` Socket.IO namespace: friend-request received,
   * friend-request accepted, follow, mention, and other
   * relationship-changed notifications.
   *
   * Requires `phase6_social: 'live'` and
   * `phase5_realtime_infrastructure: 'live'` (the notifications
   * socket is built on Phase 5's realtime infra).
   *
   *   - `'live'`       — realtime social notifications are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase6_social_notifications: 'live' | 'placeholder'
  /**
   * Phase 6 mutual-friends / mutual-followers surface gate.
   *
   * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
   *                User Activity Stream.
   * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
   *                Story 6.4 (lines 222–259).
   * Source ticket: TKT-6.4.A2 (sub-flag introduction; gate extension).
   *
   * Gates the mutual-friends / mutual-followers surfaces
   * (`/social/users/:id/mutual-friends`,
   * `/social/users/:id/mutual-followers`), the
   * `MutualFriendsPreview` / `MutualFollowersPreview` profile-sidebar
   * components, and the `MutualFriendsList` / `MutualFollowersList`
   * full-list pages.
   *
   * Independent of `phase6_social_activity` (Story 6.4's other
   * sub-lane) and of the other Phase 6 sub-flags. Requires
   * `phase6_social: 'live'` (the parent gate).
   *
   *   - `'live'`       — mutual surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering; default.
   */
  phase6_social_mutuals: 'live' | 'placeholder'
  /**
   * Phase 6 per-user activity stream surface gate.
   *
   * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
   *                User Activity Stream.
   * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
   *                Story 6.4 (lines 222–259).
   * Source ticket: TKT-6.4.A2 (sub-flag introduction; gate extension).
   *
   * Gates the per-user activity stream
   * (`/social/users/:id/activity`) and the `UserActivityStream`
   * page. The `ActivityItem` type-discriminated renderer is
   * reused by other activity surfaces (the future social feed
   * surface, Story 6.9) but the live gating of the renderer
   * itself rides on this flag.
   *
   * Independent of `phase6_social_mutuals`. Requires
   * `phase6_social: 'live'`.
   *
   *   - `'live'`       — activity stream is wired.
   *   - `'placeholder'`— the static "Coming soon" rendering; default.
   */
  phase6_social_activity: 'live' | 'placeholder'
  /**
   * Phase 6 social user-search surface gate.
   *
   * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
   *                Suggestions, User Search, Trending.
   * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
   *                Story 6.5 (lines 261–301).
   * Source ticket: TKT-6.5.A1 (sub-flag introduction).
   *
   * Gates the social user-search page (`/social/users/search`) and the
   * social search group inside the global search bar.
   *
   * Independent of `phase6_social_discovery`. Requires
   * `phase6_social: 'live'`.
   *
   *   - `'live'`       — search surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering; default.
   */
  phase6_social_search: 'live' | 'placeholder'
  /**
   * Phase 6 follow / unfollow mutation surface gate.
   *
   * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
   * Source ticket: TKT-6.6.B1.
   *
   * Gates the follow / unfollow mutation surfaces: the
   * `<FollowButton />` component, the `<UnfollowConfirmDialog />`
   * component, the `useFollow` / `useUnfollow` mutation hooks, and
   * the shared confirm-dialog vocabulary for non-idempotent DELETE
   * behavior.
   *
   * Requires `phase6_social: 'live'` (the parent gate).
   *
   *   - `'live'`       — follow / unfollow mutation surfaces are wired.
   *   - `'placeholder'`— the mutation surfaces are not rendered; hooks
   *                      return safe no-op fallbacks. Default at this
   *                      commit.
   */
  phase6_social_follow_mutation: 'live' | 'placeholder'
  /**
   * Phase 6 block / unblock mutation surface gate.
   *
   * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional
   *                Side Effects.
   * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
   *                Story 6.7 (lines 344–384).
   * Source ticket: TKT-6.7.B1.
   *
   * Gates the block / unblock mutation surfaces: the `<BlockButton />`
   * component, the `<BlockConfirmDialog />` and
   * `<UnblockConfirmDialog />` components, the `useBlock` /
   * `useUnblock` mutation hooks, the shared `BLOCK` / `UNBLOCK`
   * confirm-dialog vocabulary entries, and the `BlockErrorBanner`
   * / `block-error-copy` registry.
   *
   * Requires `phase6_social: 'live'` (the parent gate).
   *
   *   - `'live'`       — block / unblock mutation surfaces are wired;
   *                      the confirm dialogs surface the
   *                      bidirectionality warning and the non-idempotent
   *                      DELETE note; `useUnblock` treats
   *                      `SOCIAL_USER_NOT_BLOCKED` as a successful
   *                      terminal state.
   *   - `'placeholder'`— the mutation surfaces are not rendered; hooks
   *                      return safe no-op fallbacks. Default at this
   *                      commit.
   *
   * Story 6.7 acceptance criteria (phase plan lines 377–383):
   *   1. Block and unblock succeed against the live backend with
   *      bidirectional visibility confirmed in dev.
   *   2. Confirm dialog copy explicitly warns about bidirectional
   *      side effects and side-effect cleanup (silent follow removal).
   *   3. Blocked list and relationship state refresh after mutations.
   *   4. Self-block controls are hidden server-side and client-side.
   *   5. `BlockedContentGate` hides any cached content owned by a
   *      blocked user after revalidation.
   *   6. Two tabs reflect the same block state through the socket
   *      without manual refresh (Epic 6.10 socket invalidation).
   */
  phase6_social_block_mutation: 'live' | 'placeholder'
  /**
   * Phase 6 friend-request lifecycle mutation surface gate.
   *
   * Source epic:   Epic 6.8 — Friend Request Lifecycle.
   * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
   *                Story 6.8 (lines 386–428).
   * Source ticket: TKT-6.8.B1.
   *
   * Gates the friend-request mutation surfaces: the `<FriendRequestCta />`
   * component, the `<FriendRequestRespondActions />` in-place popover,
   * the `<FriendRequestCancelDialog />` and `<UnfriendConfirmDialog />`
   * confirm dialogs, the `useSendFriendRequest` /
   * `useRespondFriendRequest` / `useCancelFriendRequest` / `useUnfriend`
   * mutation hooks, the shared `UNFRIEND` / `CANCEL_FRIEND_REQUEST`
   * confirm-dialog vocabulary entries, the `FriendRequestStateMachine`
   * rendering helper, the `friend-request-error-copy` registry, and the
   * `FriendRequestErrorBanner` component.
   *
   * Requires `phase6_social: 'live'` (the parent gate).
   *
   *   - `'live'`       — friend-request mutation surfaces are wired; the
   *                      CTA reflects the viewer's relationship state
   *                      (`none` → "Send Friend Request", `outgoing` →
   *                      "Outgoing Request", `incoming` →
   *                      "Accept / Decline", `friend` → "Friends" with
   *                      Unfriend affordance); the confirm dialogs
   *                      surface the non-idempotent DELETE note and the
   *                      friend-request lifecycle side effects;
   *                      `useCancelFriendRequest` treats
   *                      `SOCIAL_FRIEND_REQUEST_NOT_FOUND` as a
   *                      successful terminal state; `useUnfriend` treats
   *                      `SOCIAL_FRIENDSHIP_NOT_FOUND` as a successful
   *                      terminal state.
   *   - `'placeholder'`— the mutation surfaces are not rendered; hooks
   *                      return safe no-op fallbacks. Default at this
   *                      commit.
   *
   * Read-only incoming / outgoing friend-request surfaces that already
   * exist from Epic 6.1 (`useIncomingRequests`, `useOutgoingRequests`)
   * remain gated by `phase6_social_relationship` (Epic 6.1); this flag
   * only gates mutation affordances.
   *
   * Story 6.8 acceptance criteria (phase plan lines 420–427):
   *   1. Authenticated users can send, accept, decline, and cancel
   *      friend requests with state-machine-driven UI.
   *   2. Incoming and outgoing lists render with loading, empty, error,
   *      and stale states.
   *   3. Unfriend requires an explicit confirm with non-idempotent
   *      copy.
   *   4. Self-friend-request controls are hidden server-side and
   *      client-side.
   *   5. Unstable `friendshipId` is never persisted in URLs or
   *      localStorage.
   *   6. Two tabs reflect the same friend-request state through the
   *      socket without manual refresh (Epic 6.10 socket
   *      invalidation).
   */
  phase6_social_friend_request_mutation: 'live' | 'placeholder'
  /**
   * Phase 7 admin surfaces parent gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates every Phase 7 admin surface (review moderation, comment
   * moderation, tag/category admin, ranking admin, achievement
   * admin, tournament admin, user-role grant). The eight sub-flags
   * remain independently gated; this parent acts as a global "Phase 7
   * admin off-switch" for production rollouts.
   *
   *   - `'live'`       — admin surfaces are reachable; sub-flags may
   *                      still be individually off if their lane has
   *                      not yet passed its exit criteria.
   *   - `'placeholder'`— every admin surface is gated off; the static
   *                      "Admin coming soon" rendering is used.
   *                      Default at this commit.
   */
  phase7_admin: 'live' | 'placeholder'
  /**
   * Phase 7 review-moderation lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: review reports listing (`GET /reviews/reports`) and status
   * mutation (`PATCH /reviews/reports/:reportId`). Requires
   * `phase7_admin: 'live'`.
   *
   *   - `'live'`       — review-moderation surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_review_moderation: 'live' | 'placeholder'
  /**
   * Phase 7 comment-moderation lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: comment reports listing, status mutation,
   * `POST /comments/:commentId/hide`, and
   * `POST /comments/:commentId/restore`. Requires
   * `phase7_admin: 'live'`.
   *
   *   - `'live'`       — comment-moderation surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_comment_moderation: 'live' | 'placeholder'
  /**
   * Phase 7 tag-admin lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: tag create/update/delete/restore. Requires
   * `phase7_admin: 'live'`.
   *
   *   - `'live'`       — tag-admin surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_tag: 'live' | 'placeholder'
  /**
   * Phase 7 category-admin lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: category create/update/delete/restore. Requires
   * `phase7_admin: 'live'`.
   *
   *   - `'live'`       — category-admin surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_category: 'live' | 'placeholder'
  /**
   * Phase 7 ranking-admin lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: ranking recalculate, period reset, and consistency check.
   * Requires `phase7_admin: 'live'`.
   *
   *   - `'live'`       — ranking-admin surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_ranking: 'live' | 'placeholder'
  /**
   * Phase 7 achievement-admin lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: badge re-evaluate (`POST /achievements/admin/users/:userId/reevaluate`)
   * and badge revoke. Requires `phase7_admin: 'live'`.
   *
   *   - `'live'`       — achievement-admin surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_achievement: 'live' | 'placeholder'
  /**
   * Phase 7 tournament-admin lane gate.
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: tournament create/update/delete. Requires
   * `phase7_admin: 'live'`.
   *
   *   - `'live'`       — tournament-admin surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_tournament: 'live' | 'placeholder'
  /**
   * Phase 7 user-role-grant lane gate (Story 7.10).
   *
   * Source epic:   Epic 7.1.
   * Source ticket: TKT-7.1.B1.
   *
   * Gates: `POST /admin/users/:userId/roles` and the corresponding
   * revoke path. This lane is privileged — granting admin/role
   * escalation surfaces the documented `USER_GRANT_ROLE` audit
   * warning to the Sentry breadcrumb stream. Requires
   * `phase7_admin: 'live'`.
   *
   *   - `'live'`       — role-grant surfaces are wired.
   *   - `'placeholder'`— the static "Coming soon" rendering.
   */
  phase7_admin_user_role: 'live' | 'placeholder'
}

export const FEATURE_FLAGS: readonly FeatureFlag[] = [
  'dailyChallengePage',
  'phase4_authoring',
  'phase4_personal',
  'phase4_attempts',
  'phase5_realtime_infrastructure',
  'phase5_tournaments',
  'phase5_notifications',
  'phase5_instances',
  'phase5_instances_play',
  'phase5_rankings',
  'phase5_achievements',
  'phase5_search',
  'phase6_social',
  'phase6_social_relationship',
  'phase6_social_feed',
  'phase6_social_discovery',
  'phase6_social_notifications',
  'phase6_social_mutuals',
  'phase6_social_activity',
  'phase6_social_search',
  'phase6_social_follow_mutation',
  'phase6_social_block_mutation',
  'phase6_social_friend_request_mutation',
  'phase7_admin',
  'phase7_admin_review_moderation',
  'phase7_admin_comment_moderation',
  'phase7_admin_tag',
  'phase7_admin_category',
  'phase7_admin_ranking',
  'phase7_admin_achievement',
  'phase7_admin_tournament',
  'phase7_admin_user_role',
]

const FLAG_DEFAULTS: FeatureFlagValueMap = {
  dailyChallengePage: 'placeholder',
  phase4_authoring: 'placeholder',
  phase4_personal: 'placeholder',
  phase4_attempts: 'placeholder',
  phase5_realtime_infrastructure: 'placeholder',
  phase5_tournaments: 'placeholder',
  phase5_notifications: 'placeholder',
  phase5_instances: 'placeholder',
  phase5_instances_play: 'placeholder',
  phase5_rankings: 'placeholder',
  phase5_achievements: 'placeholder',
  phase5_search: 'placeholder',
  phase6_social: 'placeholder',
  phase6_social_relationship: 'placeholder',
  phase6_social_feed: 'placeholder',
  phase6_social_discovery: 'placeholder',
  phase6_social_notifications: 'placeholder',
  phase6_social_mutuals: 'placeholder',
  phase6_social_activity: 'placeholder',
  phase6_social_search: 'placeholder',
  phase6_social_follow_mutation: 'placeholder',
  phase6_social_block_mutation: 'placeholder',
  phase6_social_friend_request_mutation: 'placeholder',
  phase7_admin: 'placeholder',
  phase7_admin_review_moderation: 'placeholder',
  phase7_admin_comment_moderation: 'placeholder',
  phase7_admin_tag: 'placeholder',
  phase7_admin_category: 'placeholder',
  phase7_admin_ranking: 'placeholder',
  phase7_admin_achievement: 'placeholder',
  phase7_admin_tournament: 'placeholder',
  phase7_admin_user_role: 'placeholder',
}

const FLAG_ENV_OVERRIDES: Record<FeatureFlag, string | undefined> = {
  dailyChallengePage: process.env.NEXT_PUBLIC_DAILY_CHALLENGE_PAGE,
  phase4_authoring: process.env.NEXT_PUBLIC_PHASE4_AUTHORING,
  phase4_personal: process.env.NEXT_PUBLIC_PHASE4_PERSONAL,
  phase4_attempts: process.env.NEXT_PUBLIC_PHASE4_ATTEMPTS,
  phase5_realtime_infrastructure: process.env.NEXT_PUBLIC_PHASE5_REALTIME_INFRASTRUCTURE,
  phase5_tournaments: process.env.NEXT_PUBLIC_PHASE5_TOURNAMENTS,
  phase5_notifications: process.env.NEXT_PUBLIC_PHASE5_NOTIFICATIONS,
  phase5_instances: process.env.NEXT_PUBLIC_PHASE5_INSTANCES,
  phase5_instances_play: process.env.NEXT_PUBLIC_PHASE5_INSTANCES_PLAY,
  phase5_rankings: process.env.NEXT_PUBLIC_PHASE5_RANKINGS,
  phase5_achievements: process.env.NEXT_PUBLIC_PHASE5_ACHIEVEMENTS,
  phase5_search: process.env.NEXT_PUBLIC_PHASE5_SEARCH,
  phase6_social: process.env.NEXT_PUBLIC_PHASE6_SOCIAL,
  phase6_social_relationship: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_RELATIONSHIP,
  phase6_social_feed: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_FEED,
  phase6_social_discovery: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_DISCOVERY,
  phase6_social_notifications: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_NOTIFICATIONS,
  phase6_social_mutuals: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_MUTUALS,
  phase6_social_activity: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_ACTIVITY,
  phase6_social_search: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_SEARCH,
  phase6_social_follow_mutation: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_FOLLOW_MUTATION,
  phase6_social_block_mutation: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_BLOCK_MUTATION,
  phase6_social_friend_request_mutation: process.env.NEXT_PUBLIC_PHASE6_SOCIAL_FRIEND_REQUEST_MUTATION,
  phase7_admin: process.env.NEXT_PUBLIC_PHASE7_ADMIN,
  phase7_admin_review_moderation: process.env.NEXT_PUBLIC_PHASE7_ADMIN_REVIEW_MODERATION,
  phase7_admin_comment_moderation: process.env.NEXT_PUBLIC_PHASE7_ADMIN_COMMENT_MODERATION,
  phase7_admin_tag: process.env.NEXT_PUBLIC_PHASE7_ADMIN_TAG,
  phase7_admin_category: process.env.NEXT_PUBLIC_PHASE7_ADMIN_CATEGORY,
  phase7_admin_ranking: process.env.NEXT_PUBLIC_PHASE7_ADMIN_RANKING,
  phase7_admin_achievement: process.env.NEXT_PUBLIC_PHASE7_ADMIN_ACHIEVEMENT,
  phase7_admin_tournament: process.env.NEXT_PUBLIC_PHASE7_ADMIN_TOURNAMENT,
  phase7_admin_user_role: process.env.NEXT_PUBLIC_PHASE7_ADMIN_USER_ROLE,
}

function isFlagValue<K extends FeatureFlag>(
  flag: K,
  candidate: string,
): candidate is FeatureFlagValueMap[K] {
  if (flag === 'dailyChallengePage') {
    return candidate === 'v1' || candidate === 'placeholder'
  }
  if (
    flag === 'phase4_authoring' ||
    flag === 'phase4_personal' ||
    flag === 'phase4_attempts' ||
    flag === 'phase5_realtime_infrastructure' ||
    flag === 'phase5_tournaments' ||
    flag === 'phase5_notifications' ||
    flag === 'phase5_instances' ||
    flag === 'phase5_instances_play' ||
    flag === 'phase5_rankings' ||
    flag === 'phase5_achievements' ||
    flag === 'phase5_search' ||
    flag === 'phase6_social' ||
    flag === 'phase6_social_relationship' ||
    flag === 'phase6_social_feed' ||
    flag === 'phase6_social_discovery' ||
    flag === 'phase6_social_notifications' ||
    flag === 'phase6_social_mutuals' ||
    flag === 'phase6_social_activity' ||
    flag === 'phase6_social_search' ||
    flag === 'phase6_social_follow_mutation' ||
    flag === 'phase6_social_block_mutation' ||
    flag === 'phase6_social_friend_request_mutation' ||
    flag === 'phase7_admin' ||
    flag === 'phase7_admin_review_moderation' ||
    flag === 'phase7_admin_comment_moderation' ||
    flag === 'phase7_admin_tag' ||
    flag === 'phase7_admin_category' ||
    flag === 'phase7_admin_ranking' ||
    flag === 'phase7_admin_achievement' ||
    flag === 'phase7_admin_tournament' ||
    flag === 'phase7_admin_user_role'
  ) {
    return candidate === 'live' || candidate === 'placeholder'
  }
  return false
}

function resolveFlagValue<K extends FeatureFlag>(
  flag: K,
  override: string | undefined,
): FeatureFlagValueMap[K] {
  const allowed = FLAG_DEFAULTS[flag]
  if (typeof override === 'string' && isFlagValue(flag, override)) {
    return override
  }
  return allowed
}

/**
 * Read the current value of a feature flag.
 *
 * Synchronous, SSR-safe. Reads from the module-level defaults table and
 * the `process.env.NEXT_PUBLIC_*` override at module init time.
 *
 * @example
 *   const value = getFeatureFlagValue('dailyChallengePage')
 *   // value: 'v1' | 'placeholder'
 */
export function getFeatureFlagValue<K extends FeatureFlag>(
  flag: K,
): FeatureFlagValueMap[K] {
  return resolveFlagValue(flag, FLAG_ENV_OVERRIDES[flag])
}

/**
 * Boolean helper. Returns `true` when the flag's current value matches
 * the supplied candidate value.
 *
 * When `value` is omitted, the helper returns `true` when the flag is
 * not at its default — i.e. it has been explicitly overridden. This is
 * the inverse of "is the flag still at its default value" and is the
 * canonical "did the env-var override take effect" check.
 *
 * @example
 *   isFeatureEnabled('dailyChallengePage', 'v1') // true if flag is 'v1'
 *   isFeatureEnabled('dailyChallengePage', 'placeholder') // inverse
 *   isFeatureEnabled('dailyChallengePage') // true if env-var override is active
 */
export function isFeatureEnabled<K extends FeatureFlag>(
  flag: K,
  value?: FeatureFlagValueMap[K],
): boolean {
  const current = getFeatureFlagValue(flag)
  if (value === undefined) {
    return current !== FLAG_DEFAULTS[flag]
  }
  return current === value
}
