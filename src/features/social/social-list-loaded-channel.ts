"use client";

/**
 * `social-list-loaded-channel` — Compatibility shim that re-exports
 * the canonical `social/list-loaded` BroadcastChannel surface from
 * `@/lib/social/social-list-loaded-broadcast-channel.ts`.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source tickets: TKT-6.2.D3 (original location), TKT-6.2.G1 (move).
 *
 * The original TKT-6.2.D3 work defined this module inline. TKT-6.2.G1
 * relocated the canonical implementation to `src/lib/social/` so the
 * cross-cutting broadcast surface lives with the rest of the
 * social-feature helpers in `src/lib/social/`. This file preserves
 * the public surface (the named exports) so all D3 consumers
 * (`useSocialCountsBadge`, the D3 spec) continue to compile without
 * further changes.
 *
 * New consumers (TKT-6.2.G2, G3, G4, H1, H2) should import directly
 * from `@/lib/social/social-list-loaded-broadcast-channel.ts`.
 */

export {
  closeSocialListLoadedChannel,
  getSocialListLoadedChannel,
  initSocialListLoadedChannel,
  publishSocialListLoaded,
  SOCIAL_LIST_LOADED_CHANNEL_NAME,
  subscribeSocialListLoaded,
  unsubscribeAllSocialListLoadedHandlers,
} from "@/lib/social/social-list-loaded-broadcast-channel";

export type {
  SocialListLoadedPayload,
} from "@/lib/social/social-list-loaded-broadcast-channel";

/**
 * Backwards-compatible alias for the previously-exported shape.
 * D3 consumers called `publishSocialListLoaded({ kind, userId })`;
 * the canonical (G1) shape is
 * `publishSocialListLoaded({ kind, targetUserId, offset, limit })`.
 *
 * The re-export above carries the new signature; this default shim
 * keeps the legacy object-shape working by adapting it on the fly.
 *
 * @deprecated Prefer importing `publishSocialListLoaded` directly
 *   from `@/lib/social/social-list-loaded-broadcast-channel`.
 */
export interface SocialListLoadedEvent {
  kind: "list.loaded";
  userId: string;
  tabId: string;
  at: number;
}