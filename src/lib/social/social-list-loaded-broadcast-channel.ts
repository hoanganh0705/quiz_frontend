/**
 * `social-list-loaded-broadcast-channel.ts` — Dedicated BroadcastChannel
 * for the "list page successfully loaded another page" event.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.G1.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event shape,
 *   publisher / subscriber API, and the logout-reset hook are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
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
 * module from a Server Component never throws; the factory's
 * `getChannel()` helper returns `null` when `window` is undefined.
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

import { createBroadcastChannel } from "@/lib/broadcast";

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

const SOCIAL_LIST_LOADED_VALID_KINDS = new Set<SocialListLoadedPayload["kind"]>(
  ["followers", "following", "friends", "blocked"],
);

// ─── Per-tab identity ────────────────────────────────────────────────────

let cachedSocialListLoadedTabId: string | null = null;

/**
 * Returns (and caches) a per-tab id used for same-tab filtering on
 * the social-list-loaded channel. Stored in `sessionStorage` under
 * the legacy `social:list-loaded:tabId` key so existing test
 * fixtures (and any downstream consumer reading the id from
 * sessionStorage) keep working unchanged.
 *
 * Phase 4 (TKT-Phase-4.A1): the social-list-loaded channel uses
 * its own sessionStorage key — NOT the auth channel's
 * `auth_tab_id` — because the badge's cross-tab contract was
 * documented against this key and the test suite probes it
 * directly. We therefore pass this getter into the factory rather
 * than relying on the default `getCurrentTabId`.
 */
function getSocialListLoadedTabId(): string {
  if (cachedSocialListLoadedTabId !== null) return cachedSocialListLoadedTabId;
  if (typeof sessionStorage === "undefined") {
    cachedSocialListLoadedTabId = "ssr";
    return cachedSocialListLoadedTabId;
  }
  const KEY = "social:list-loaded:tabId";
  let tabId = sessionStorage.getItem(KEY);
  if (tabId === null) {
    tabId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, tabId);
  }
  cachedSocialListLoadedTabId = tabId;
  return cachedSocialListLoadedTabId;
}

// ─── Factory-backed channel ───────────────────────────────────────────────

/**
 * Singleton factory instance for the `social/list-loaded` channel.
 * The factory validates incoming messages before delivering to
 * subscribers; the publisher in this module posts a normalised
 * (canonical) shape and the factory stamps `tabId` + `at`.
 *
 * Note: this channel keeps a public `unsubscribeAll…` helper and a
 * `installSocialListLoadedLogoutReset` hook that are not in the
 * generic factory. They live in this module because the social
 * list-loaded badge is the only consumer that needs the logout
 * reset today; other channels can grow the same hook when needed.
 */
const socialListLoadedChannel = createBroadcastChannel<SocialListLoadedPayload>(
  SOCIAL_LIST_LOADED_CHANNEL_NAME,
  {
    validate: (data): SocialListLoadedPayload | null => {
      if (typeof data !== "object" || data === null) return null;
      const d = data as Partial<SocialListLoadedPayload>;
      if (
        typeof d.kind !== "string" ||
        !SOCIAL_LIST_LOADED_VALID_KINDS.has(
          d.kind as SocialListLoadedPayload["kind"],
        )
      ) {
        return null;
      }
      if (typeof d.targetUserId !== "string") return null;
      if (typeof d.offset !== "number") return null;
      if (typeof d.limit !== "number") return null;
      if (typeof d.at !== "number") return null;
      if (typeof d.tabId !== "string") return null;
      return d as SocialListLoadedPayload;
    },
    timestampField: "at",
    getCurrentTabId: getSocialListLoadedTabId,
  },
);

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Back-compat accessor for the singleton channel. Returns the
 * underlying `BroadcastChannel` instance.
 */
export function getSocialListLoadedChannel(): BroadcastChannel | null {
  return socialListLoadedChannel.getChannel();
}

/**
 * Close the social list-loaded channel (for cleanup/testing).
 * After calling this, the factory closes the channel and the next
 * `subscribe` call recreates a fresh channel.
 */
export function closeSocialListLoadedChannel(): void {
  socialListLoadedChannel.closeChannel();
}

/**
 * Back-compat initializer. The factory installs the listener on
 * first `subscribe` call, so explicit init is rarely needed.
 */
export function initSocialListLoadedChannel(): boolean {
  return socialListLoadedChannel.isAvailable();
}

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
  // Normalise legacy (D3) shape to the canonical (G1) shape.
  const targetUserId =
    "targetUserId" in input
      ? input.targetUserId
      : "userId" in input
        ? (input as { userId: string }).userId
        : "";
  const offset = "offset" in input ? input.offset : 0;
  const limit = "limit" in input ? input.limit : 20;

  // The factory returns silently when the channel is unavailable;
  // we want a `boolean` for the legacy D3 callers, so probe first.
  if (!socialListLoadedChannel.isAvailable()) return false;
  // Phase 4 (TKT-Phase-4.A1): we post directly (rather than via
  // `socialListLoadedChannel.publish`) so a single postMessage
  // carries BOTH the canonical `targetUserId` AND the legacy D3
  // `userId` alias. The factory's `publish` is single-purpose
  // (stamps `tabId` + `at`); the D3 callers expect the two
  // identifiers on the wire message so existing test fixtures
  // and downstream subscribers keep working unchanged.
  const ch = socialListLoadedChannel.getChannel();
  if (ch === null) return false;
  ch.postMessage({
    kind: input.kind,
    targetUserId,
    userId: targetUserId,
    offset,
    limit,
    tabId: getSocialListLoadedTabId(),
    at: Date.now(),
  });
  return true;
}

// ─── Subscriber registry ─────────────────────────────────────────────────

/**
 * Subscribe to social-list-loaded events. The handler is invoked
 * for every event on the channel (the factory's same-tab filter
 * drops events from this tab).
 *
 * Returns an unsubscribe function.
 */
export function subscribeSocialListLoaded(
  handler: (event: SocialListLoadedPayload) => void,
): () => void {
  return socialListLoadedChannel.subscribe(handler);
}

/**
 * Detach every active `subscribeSocialListLoaded` handler at once.
 *
 * Intended for the logout / session-boundary hook (TKT-6.2.G4):
 * after a logout, no listener should silently update counts for a
 * subsequent user in the same browser context.
 *
 * Phase 4 (TKT-Phase-4.A1): the factory backs the subscriber
 * registry; the helper uses the factory's `unsubscribeAll` to
 * clear the registered handlers WITHOUT closing the underlying
 * `BroadcastChannel` instance. The legacy implementation only
 * cleared the in-memory `Set<Handler>` (never closed the channel),
 * so this preserves the original behavior — the channel instance
 * stays open so test harnesses can probe it via
 * `MockBroadcastChannel.instances[0]`.
 */
export function unsubscribeAllSocialListLoadedHandlers(): void {
  socialListLoadedChannel.unsubscribeAll();
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
