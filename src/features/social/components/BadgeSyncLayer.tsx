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
 * social notification router so the badge count and the related
 * friend-request / follow / block lists stay in lockstep with the
 * server-emitted `notification:sent` stream.
 *
 * The component:
 *   1. Renders nothing visually (it is a side-effect-only shell).
 *   2. Mounts `useNotificationEventRouter` (TKT-6.10.E6) which
 *      re-routes `notification:sent` events whose `data.kind` is one
 *      of `friend_request` / `follow` / `block` to the matching
 *      social SWR cache key.
 *   3. Mounts `useUnreadNotificationCount` (Phase 5 / TKT-5.4.B2)
 *      which optimistically increments the unread-count badge for
 *      every accepted `notification:sent` (Phase 5 owns this).
 *   4. Returns `null` when the `social_realtime_notifications_live` feature
 *      flag is `'placeholder'`, so disabled environments render no
 *      extra nodes in the tree.
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
 * both hooks short-circuit (Phase 5 `useSocket` SSR-guard and
 * `useNotificationEventRouter` flag-gate).
 */

"use client";

import { useNotificationEventRouter } from "@/features/social/hooks/useNotificationEventRouter";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useUnreadNotificationCount";

/**
 * Mount-point for the social-aware badge listeners.
 *
 * Returns `null` regardless of whether the underlying hooks mounted
 * anything (they are side-effect-only). The component itself is a
 * pure JSX node with no props.
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
  // Mount the social-key re-router. When the flag is `'placeholder'`
  // the hook short-circuits and never opens a socket.
  useNotificationEventRouter();

  // Mount the unread-count badge listener. Phase 5 owns this hook;
  // it handles the optimistic increment + revalidation and respects
  // its own `notifications_live` flag gate.
  useUnreadNotificationCount();

  return null;
}