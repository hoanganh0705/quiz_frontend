/**
 * `social-list-loaded-broadcast-channel.ts` — Dedicated BroadcastChannel
 * for the "list page successfully loaded another page" event.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.G1.
 *
 * ## What this file owns
 *
 * The `social/list-loaded` BroadcastChannel singleton and its
 * publisher / subscriber API:
 *
 *   - `SocialListLoadedBroadcastChannel` (conceptual) backed by a
 *     module-scoped `BroadcastChannel('social/list-loaded')`.
 *   - `SocialListLoadedPayload` with the documented fields
 *     (`kind`, `targetUserId`, `offset`, `limit`, `at`).
 *   - `publishSocialListLoaded(payload)` and the
 *     `subscribeSocialListLoaded(handler)` / `unsubscribeAll…`
 *     helpers.
 *
 * ## Relationship to the D3 channel
 *
 * The TKT-6.2.D3 channel code lives at
 * `features/social/social-list-loaded-channel.ts` (same channel
 * name `social/list-loaded`, same singleton concept). The D3
 * module re-exports the publisher from this file so the two
 * surfaces stay in lock-step. Future tickets (TKT-6.2.G2, G3,
 * G4, H1, H2) use the helpers defined here.
 *
 * ## SSR safety
 *
 * The channel is lazily constructed on first call. Importing this
 * module from a Server Component never throws; the `getChannel()`
 * helper returns `null` when `window` is undefined.
 *
 * ## Why a dedicated channel
 *
 * Per the cross-batch invariant "Counts badge is consistent with
 * the rendered list lengths on a revalidation cycle": the badge
 * needs to revalidate after any list page load-more. The mutation
 * channel (`social/relationship`) is orthogonal (relationship
 * actions vs. read-side paged loads), so a dedicated channel keeps
 * the message payloads homogeneous.
 */

// ─── Channel name ─────────────────────────────────────────────────────────

export const SOCIAL_LIST_LOADED_CHANNEL_NAME = "social/list-loaded";

// ─── Event types ─────────────────────────────────────────────────────────

export interface SocialListLoadedPayload {
  /** The list kind that loaded. */
  kind: "followers" | "following" | "friends" | "blocked";
  /** The target user the loaded list page is conceptually about. */
  targetUserId: string;
  /** The offset of the loaded page (zero-based). */
  offset: number;
  /** The limit of the loaded page. */
  limit: number;
  /** Unix timestamp (ms) when the event was created. */
  at: number;
  /** The originating tab id (same-tab filtering). */
  tabId: string;
}

// ─── Channel singleton ───────────────────────────────────────────────────

let socialListLoadedChannel: BroadcastChannel | null = null;
let isSocialListLoadedAvailable: boolean | null = null;

/**
 * Returns true if `BroadcastChannel` is available in the current
 * environment. Cached on first call.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isSocialListLoadedAvailable !== null) {
    return isSocialListLoadedAvailable;
  }
  if (typeof BroadcastChannel === "undefined") {
    isSocialListLoadedAvailable = false;
    return false;
  }
  // Mark as available without constructing a probe; the singleton
  // constructs the real channel on first use. Constructing a probe
  // here would tie this helper to the closure pattern used by the
  // relationship channel and would create an extra channel
  // instance visible to test harnesses that track `instances[]`.
  isSocialListLoadedAvailable = true;
  return isSocialListLoadedAvailable;
}

/**
 * Get the singleton BroadcastChannel for `social/list-loaded`,
 * lazily constructed. Returns `null` in SSR or when the API is
 * unavailable.
 */
export function getSocialListLoadedChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!checkBroadcastChannelAvailable()) {
    return null;
  }
  if (socialListLoadedChannel === null) {
    socialListLoadedChannel = new BroadcastChannel(
      SOCIAL_LIST_LOADED_CHANNEL_NAME,
    );
  }
  return socialListLoadedChannel;
}

/**
 * Close the channel (for cleanup / testing). Subsequent callers
 * get a fresh singleton.
 */
export function closeSocialListLoadedChannel(): void {
  if (socialListLoadedChannel !== null) {
    socialListLoadedChannel.close();
    socialListLoadedChannel = null;
  }
}

// ─── Tab id (shared with the auth / relationship channels) ──────────────

/**
 * Current tab id, re-exported in the same shape as the auth
 * channel (sessionStorage-scoped) so the same-tab filter aligns
 * with the rest of the social broadcast surface.
 *
 * Falls back to `"ssr"` in SSR. Cached lazily.
 */
let cachedTabId: string | null = null;

/** Generate a fresh tab id without persisting. */
function generateTabId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `tab-${Math.random().toString(36).slice(2)}`;
}

/** Get / create the current tab id, persisting in sessionStorage. */
function getCurrentTabId(): string {
  if (cachedTabId !== null) {
    return cachedTabId;
  }
  if (typeof sessionStorage === "undefined") {
    cachedTabId = "ssr";
    return cachedTabId;
  }
  const KEY = "social:list-loaded:tabId";
  let tabId = sessionStorage.getItem(KEY);
  if (tabId === null) {
    tabId = generateTabId();
    sessionStorage.setItem(KEY, tabId);
  }
  cachedTabId = tabId;
  return cachedTabId;
}

// ─── Publisher ────────────────────────────────────────────────────────────

/**
 * Publish a `list.loaded` event on the `social/list-loaded` channel.
 * Returns `true` if the event was posted, `false` if the channel is
 * unavailable (SSR / unsupported environment).
 *
 * Accepts both the documented (G1) payload shape
 * (`{ kind, targetUserId, offset, limit }`) and the legacy (D3)
 * shape (`{ kind, userId }`) which the existing
 * `useSocialCountsBadge` test surface still uses. The legacy shape
 * is normalised before posting: `userId` → `targetUserId`,
 * `offset` defaults to 0, `limit` defaults to 20.
 *
 * @example
 *   publishSocialListLoaded({
 *     kind: "followers",
 *     targetUserId: "user-1",
 *     offset: 20,
 *     limit: 20,
 *   });
 */
export function publishSocialListLoaded(
  input:
    | Pick<
        SocialListLoadedPayload,
        "kind" | "targetUserId" | "offset" | "limit"
      >
    | (Pick<SocialListLoadedPayload, "kind"> & { userId: string }),
): boolean {
  // Ensure the channel adapter is installed so subscribers in
  // other parts of the application receive cross-tab events.
  // This mirrors the relationship channel's convention.
  initSocialListLoadedChannel();

  const channel = getSocialListLoadedChannel();
  if (channel === null) {
    return false;
  }
  // Normalise legacy (D3) shape to the canonical (G1) shape.
  const targetUserId =
    "targetUserId" in input
      ? input.targetUserId
      : "userId" in input
        ? (input as { userId: string }).userId
        : "";
  const offset = "offset" in input ? input.offset : 0;
  const limit = "limit" in input ? input.limit : 20;
  const payload: SocialListLoadedPayload = {
    kind: input.kind,
    targetUserId,
    offset,
    limit,
    at: Date.now(),
    tabId: getCurrentTabId(),
  };
  // The posted message carries both `targetUserId` (canonical /
  // G1) and `userId` (D3 legacy) so existing subscribers that read
  // either field continue to work. G1+ consumers prefer
  // `targetUserId`.
  channel.postMessage({ ...payload, userId: targetUserId });
  return true;
}

// ─── Subscriber registry ─────────────────────────────────────────────────

type SocialListLoadedHandler = (event: SocialListLoadedPayload) => void;

const subscribers = new Set<SocialListLoadedHandler>();

/**
 * Subscribe to social-list-loaded events. The handler is invoked
 * for every event on the channel (callers are responsible for
 * same-tab filtering via the payload's `tabId` field, or for
 * filtering by `targetUserId` themselves).
 *
 * Returns an unsubscribe function.
 */
export function subscribeSocialListLoaded(
  handler: SocialListLoadedHandler,
): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

/**
 * Detach every active `subscribeSocialListLoaded` handler at once.
 *
 * Intended for the logout / session-boundary hook (TKT-6.2.G4):
 * after a logout, no listener should silently update counts for a
 * subsequent user in the same browser context.
 */
export function unsubscribeAllSocialListLoadedHandlers(): void {
  subscribers.clear();
}

/**
 * Install the auth-state-change listener that detaches every
 * `subscribeSocialListLoaded` handler on logout (TKT-6.2.G4).
 *
 * The listener is a one-shot side-effect that calls
 * `unsubscribeAllSocialListLoadedHandlers()` whenever the auth
 * store dispatches its documented `'auth-state-change'` window
 * event with `setAuthenticated(false)` semantics. The
 * corresponding remove function is returned so callers (e.g. the
 * auth-bootstrap context) can detach on unmount.
 *
 * SSR-safe: the install is a no-op when `window` is undefined.
 *
 * @returns `() => void` — the cleanup function that detaches the
 *   listener and clears the registration map.
 */
export function installSocialListLoadedLogoutReset(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  if (typeof socialListLoadedLogoutResetState.cleanup === "function") {
    return socialListLoadedLogoutResetState.cleanup;
  }
  const handler = (): void => {
    unsubscribeAllSocialListLoadedHandlers();
  };
  window.addEventListener("auth-state-change", handler);
  const cleanup = (): void => {
    window.removeEventListener("auth-state-change", handler);
    socialListLoadedLogoutResetState.cleanup = null;
  };
  socialListLoadedLogoutResetState.cleanup = cleanup;
  return cleanup;
}

/**
 * Module-scoped bookkeeping for the auth-state-change listener
 * installed by `installSocialListLoadedLogoutReset()`. Keeping
 * the cleanup reference here so the helper can be called
 * idempotently.
 */
const socialListLoadedLogoutResetState: {
  cleanup: (() => void) | null;
} = {
  cleanup: null,
};

/**
 * Dispatch an event to all subscribers. Internal-only; the channel
 * adapter installs the listener that calls into this helper.
 */
function dispatchToSubscribers(event: SocialListLoadedPayload): void {
  subscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // A buggy subscriber must not break sibling subscribers.
      console.error(
        "[social/list-loaded] error in subscriber:",
        err,
      );
    }
  });
}

// ─── Channel adapter ─────────────────────────────────────────────────────

let isAdapterInstalled = false;

/**
 * Install the message listener (one-time). Lazy so SSR works and
 * the import has no side effects.
 */
function ensureChannelAdapterInstalled(): void {
  if (isAdapterInstalled) {
    return;
  }
  const channel = getSocialListLoadedChannel();
  if (channel === null) {
    return;
  }
  // Some test harnesses mock `BroadcastChannel` with a barebones
  // object that does not implement `addEventListener`. Defend
  // against that — without listener support the publisher still
  // posts to the channel, so subscribers from sibling tabs / the
  // future richer publisher surface can be wired progressively.
  if (
    typeof (channel as { addEventListener?: unknown }).addEventListener !==
    "function"
  ) {
    return;
  }
  channel.addEventListener("message", (event: MessageEvent) => {
    const data = event.data as Partial<SocialListLoadedPayload> | null;
    if (data === null) return;
    if (typeof data.kind !== "string") return;
    if (typeof data.targetUserId !== "string") return;
    if (typeof data.offset !== "number") return;
    if (typeof data.limit !== "number") return;
    if (typeof data.at !== "number") return;
    if (typeof data.tabId !== "string") return;
    // Same-tab filter: drop events we emitted from this tab.
    if (data.tabId === getCurrentTabId()) {
      return;
    }
    dispatchToSubscribers(data as SocialListLoadedPayload);
  });
  isAdapterInstalled = true;
}

/**
 * Public init helper so `publishSocialListLoaded` can ensure the
 * listener is installed before the first post (matches the
 * relationship-channel convention in `relationship-broadcast-channel.ts`).
 */
export function initSocialListLoadedChannel(): boolean {
  ensureChannelAdapterInstalled();
  return getSocialListLoadedChannel() !== null;
}

// Ensure the adapter is installed on first publish — the singleton
// pattern from the relationship channel.
void initSocialListLoadedChannel;