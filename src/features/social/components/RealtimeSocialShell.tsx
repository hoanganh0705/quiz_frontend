/**
 * `RealtimeSocialShell` — integration shell for the social realtime layer.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.G1.
 *
 * ## Purpose
 *
 * The integration shell that wires every social realtime listener hook
 * and UI primitive into a single provider tree. The shell:
 *
 *   1. Instantiates the `EventDeduplicator` and `EventSequenceGuard`
 *      singletons exactly once per mount and provides them via
 *      React context (`EventDeduplicatorContext`,
 *      `EventSequenceGuardContext`).
 *   2. Mounts the listener hooks that own the lifetime of a tab —
 *      `useFriendRequestInvalidation`, `useFollowInvalidation`,
 *      `useBlockInvalidation`, `useSocialFeedInvalidation`, and
 *      `useNotificationEventRouter`. These hooks register their own
 *      socket subscriptions; the shell does not enumerate them.
 *   3. Mounts `useReconnectReconciliation` for the post-reconnect
 *      re-hydration cycle.
 *   4. Renders the three UI primitives:
 *      - `BadgeSyncLayer` (TKT-6.10.E8)
 *      - `ConnectionStatusBadge` (TKT-6.10.E9)
 *      - `RealtimeWsErrorToast` (TKT-6.10.F1)
 *   5. When the feature flag `phase6_social_notifications` is
 *      `'placeholder'`, renders `children` and still mounts the
 *      UI primitives (which themselves short-circuit on the flag)
 *      but does NOT instantiate any listener hooks. This keeps the
 *      layout stable across flag flips.
 *   6. On unmount, the context providers unmount and the singletons
 *      are garbage-collected with the provider.
 *
 * ## Per-page `useRelationshipInvalidation(targetUserId)`
 *
 * The per-page `useRelationshipInvalidation(targetUserId)` hook
 * (TKT-6.10.E1) is intentionally NOT mounted by the shell — each
 * social page knows its own active target user ids and mounts the
 * hook at the appropriate scope. The shell provides the dedup /
 * sequence-guard singletons so the per-page instances share the
 * same budget.
 *
 * ## Why a shell and not page-by-page mounting
 *
 * Mounting all listeners on every social page would create multiple
 * socket subscriptions per event (one per page), defeating the
 * dedup budget. The shell mounts the tab-scoped listeners once;
 * per-page hooks add their own scoped listeners for the page's
 * target user ids.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The shell does NOT carry `friendshipId` or `followId` in any
 * telemetry. The breadcrumb helpers
 * (`phase6_6_10_sentry.ts`) sanitise the payload; the lint script
 * (`scripts/phase6-lint-invariants.mjs`, TKT-6.10.G3) fails the
 * build if any realtime module under `features/social/realtime/`
 * writes either identifier.
 *
 * ## SSR
 *
 * The shell is a `"use client"` component. SSR renders `children`
 * only; the listener hooks and the context providers never register
 * server-side.
 */

"use client";

import { useMemo, type ReactElement, type ReactNode } from "react";

import { useFriendRequestInvalidation } from "@/features/social/hooks/useFriendRequestInvalidation";
import { useFollowInvalidation } from "@/features/social/hooks/useFollowInvalidation";
import { useBlockInvalidation } from "@/features/social/hooks/useBlockInvalidation";
import { useSocialFeedInvalidation } from "@/features/social/hooks/useSocialFeedInvalidation";
import { useNotificationEventRouter } from "@/features/social/hooks/useNotificationEventRouter";
import { useReconnectReconciliation } from "@/features/social/hooks/useReconnectReconciliation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { BadgeSyncLayer } from "./BadgeSyncLayer";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { RealtimeWsErrorToast } from "./RealtimeWsErrorToast";

import {
  EventDeduplicator,
  EventDeduplicatorContext,
} from "@/features/social/realtime/event-deduplicator";
import {
  EventSequenceGuard,
  EventSequenceGuardContext,
} from "@/features/social/realtime/event-sequence-guard";

import { getFeatureFlagValue } from "@/lib/feature-flags/feature-flags";

/**
 * Props for `RealtimeSocialShell`.
 */
export interface RealtimeSocialShellProps {
  /**
   * The page subtree. The shell always renders `children`; the flag
   * gate controls whether the listener hooks mount, not whether the
   * children render.
   */
  children: ReactNode;
}

// ─── Internal mount-point helpers ────────────────────────────────────────────

/**
 * Mount the tab-scoped listener hooks. Each hook owns its own
 * feature-flag gate and short-circuits when the flag is
 * `'placeholder'`. The shell deliberately does not gate these hooks
 * itself so the hooks remain independently usable in tests.
 */
function TabScopedListeners(): null {
  useFriendRequestInvalidation();
  useFollowInvalidation();
  useBlockInvalidation();
  useSocialFeedInvalidation();
  useNotificationEventRouter();
  useReconnectReconciliation();
  return null;
}

/**
 * Mount the UI primitives. Each primitive owns its own feature-flag
 * gate and short-circuits when the flag is `'placeholder'`.
 */
function UiPrimitives(): ReactElement {
  return (
    <>
      <BadgeSyncLayer />
      <ConnectionStatusBadge />
      <RealtimeWsErrorToast />
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * The social realtime integration shell.
 *
 * Mount the shell once per social surface (typically in
 * `SocialLayout`). The shell provides:
 *
 *   - The `EventDeduplicator` and `EventSequenceGuard` singletons via
 *     context (consumed by `useSocialRealtimeEvent` from every
 *     listener hook).
 *   - The five tab-scoped listener hooks plus the reconciliation hook.
 *   - The three UI primitives.
 *
 * The shell ALWAYS renders `children`. The flag gate controls the
 * listener/primitive behaviour, not the layout.
 *
 * @example
 * ```tsx
 * // app/social/layout.tsx
 * <RealtimeSocialShell>{children}</RealtimeSocialShell>
 * ```
 */
export function RealtimeSocialShell({
  children,
}: RealtimeSocialShellProps): ReactElement {
  // ── Flag gate ────────────────────────────────────────────────────────
  // The listener hooks and UI primitives each short-circuit on the
  // flag individually, so the shell does not need to gate them
  // itself. Reading the flag here is informational — used only to
  // avoid mounting the listener hooks at all when the flag is
  // `'placeholder'`. The UI primitives are always mounted so the
  // connection-status and WS-error toast can still surface
  // (otherwise the badge would silently disappear).
  const flagValue = getFeatureFlagValue("phase6_social_notifications");

  // ── Auth bootstrap ───────────────────────────────────────────────────
  // The shell is only meaningful for an authenticated user. While the
  // bootstrap is in flight (or for an unauthenticated viewer) the
  // socket is never opened (Phase 5 `useSocket` no-ops). Reading
  // `currentUser` here is informational; we use it only to decide
  // whether to instantiate the singletons.
  const auth = useAuthSession();
  const isAuthenticated = auth.currentUser !== null;

  // ── Singletons ───────────────────────────────────────────────────────
  // The dedup and sequence-guard singletons are tab-scoped and live
  // for the lifetime of the provider. `useMemo` keys on the flag
  // value so a flag flip creates a fresh pair (the old pair is
  // garbage-collected when the provider unmounts).
  const dedup = useMemo(
    () => (flagValue === "live" && isAuthenticated ? new EventDeduplicator() : null),
    [flagValue, isAuthenticated],
  );
  const sequenceGuard = useMemo(
    () =>
      flagValue === "live" && isAuthenticated ? new EventSequenceGuard() : null,
    [flagValue, isAuthenticated],
  );

  // When the flag is `'placeholder'` (or the user is unauthenticated)
  // we still need to render `children` but with `null` provider
  // values — this triggers the "must be inside a provider" error in
  // the listener hooks, which is the desired behaviour: the hooks
  // MUST NOT run outside a live, authenticated shell. The UI
  // primitives and `useNotificationEventRouter` short-circuit on the
  // flag themselves before reaching the provider.
  return (
    <EventDeduplicatorContext.Provider value={dedup}>
      <EventSequenceGuardContext.Provider value={sequenceGuard}>
        {flagValue === "live" && isAuthenticated ? <TabScopedListeners /> : null}
        <UiPrimitives />
        {children}
      </EventSequenceGuardContext.Provider>
    </EventDeduplicatorContext.Provider>
  );
}