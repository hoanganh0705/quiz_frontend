/**
 * `BadgeSyncLayer` — side-effect-only shell that mounts the
 * social-aware badge listeners.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E8.
 *
 * ## Purpose
 *
 * `BadgeSyncLayer` is a renderless React component that mounts the
 * social notification router so the related friend-request / follow /
 * block lists stay in lockstep with the server-emitted `notification:sent`
 * stream.
 *
 * The component:
 *   1. Renders nothing visually (it is a side-effect-only shell).
 *   2. Mounts `useNotificationEventRouter` (TKT-6.10.E6) which
 *      re-routes `notification:sent` events whose `data.kind` is one
 *      of `friend_request` / `follow` / `block` to the matching
 *      social SWR cache key.
 *   3. Returns `null` when the `social_realtime_notifications_live`
 *      feature flag is `'placeholder'`, so disabled environments render
 *      no extra nodes in the tree.
 *
 * ## Unread-count ownership
 *
 * The bell badge's `useUnreadNotificationCount` is mounted by the
 * global `NotificationBell` in `AppHeader`. This layer does NOT mount
 * a second instance — doing so would double-register the
 * `notification:sent` listener on the shared socket and double-bump
 * the cached count on every realtime event.
 *
 * ## Re-routing responsibility
 *
 * The re-routing contract per `data.kind` lives in
 * `useNotificationEventRouter`. This component is a thin shell that
 * simply mounts the hook; consumers (e.g. `RealtimeSocialShell`,
 * TKT-6.10.G1) drop the layer in their tree once to wire the
 * behaviour.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The component does NOT carry `friendshipId` or `followId` in any
 * breadcrumb. All telemetry is delegated to the underlying hook,
 * whose helper (`social-realtime-sentry.ts`) sanitises the payload.
 *
 * ## SSR
 *
 * The component is a `"use client"` shell. When rendered during SSR
 * the hook short-circuits (the underlying `useSocket` SSR-guard and
 * `useNotificationEventRouter` flag-gate).
 */

"use client";

import { useNotificationEventRouter } from "@/features/social/hooks/useNotificationEventRouter";
import { getFeatureFlagValue } from "@/lib/feature-flags";

/**
 * Mount-point for the social-aware badge listeners.
 *
 * Returns `null` regardless of whether the underlying hook mounted
 * anything (it is side-effect-only). The component itself is a pure
 * JSX node with no props.
 *
 * @example
 * ```tsx
 * function RealtimeSocialShell({ children }) {
 *   return (
 *     <RealtimeSocialShellProvider>
 *       <BadgeSyncLayer />
 *       {children}
 *     </RealtimeSocialShellProvider>
 *   );
 * }
 * ```
 */
export function BadgeSyncLayer(): null {
  // Gate the social-key re-router on the social-specific flag so that
  // a `'placeholder'` environment renders no extra nodes in the tree
  // (the hook itself short-circuits, but the early return keeps the
  // intent explicit and avoids accidental work in the future).
  const flagValue = getFeatureFlagValue("social_realtime_notifications_live");
  if (flagValue === "placeholder") {
    return null;
  }

  // Mount the social-key re-router. The hook short-circuits when the
  // flag is `'placeholder'` and never opens a socket.
  useNotificationEventRouter();

  return null;
}