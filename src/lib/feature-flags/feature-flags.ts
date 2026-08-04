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
  | 'phase5_rankings'
  | 'phase5_achievements'
  | 'phase5_search'

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
  'phase5_rankings',
  'phase5_achievements',
  'phase5_search',
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
  phase5_rankings: 'placeholder',
  phase5_achievements: 'placeholder',
  phase5_search: 'placeholder',
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
  phase5_rankings: process.env.NEXT_PUBLIC_PHASE5_RANKINGS,
  phase5_achievements: process.env.NEXT_PUBLIC_PHASE5_ACHIEVEMENTS,
  phase5_search: process.env.NEXT_PUBLIC_PHASE5_SEARCH,
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
    flag === 'phase5_rankings' ||
    flag === 'phase5_achievements' ||
    flag === 'phase5_search'
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
