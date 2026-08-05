"use client";

/**
 * `InstanceRoomPage` — page composition for `/instances/[id]`.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.F1.
 *
 * ## Purpose
 *
 * Compose the instance room page from the existing hooks and
 * components (no direct service / store / axios / fetch imports):
 *
 *   - `useInstance`          (TKT-5.7.B1) — REST detail
 *   - `useInstanceSocket`    (TKT-5.7.B5) — Socket.IO /instances
 *   - `useInstancesFeatureFlag` (TKT-5.7.E1) — placeholder gate
 *   - `InstanceSkeleton`     (TKT-5.7.C1) — initial skeleton
 *   - `InstanceLobby`        (TKT-5.7.D5) — composed lobby layout
 *   - `ConnectionBanner`     (TKT-5.7.D5) — socket connection state
 *   - `InstanceClosedState`  (TKT-5.7.C1) — terminal state
 *   - `InstanceErrorState`   (TKT-5.7.C1) — typed-code error copy
 *   - `InstancePlaceholder`  (TKT-5.7.E1) — feature-flag placeholder
 *
 * ## State machine
 *
 *   - `isPlaceholder === true` → render `<InstancePlaceholder />`.
 *   - `isLoading === true`     → render `<InstanceSkeleton />`.
 *   - Error with a known lifecycle code → render `<InstanceErrorState />`.
 *   - Detail resolved with terminal status → render the closed state.
 *   - Detail resolved otherwise → render `<InstanceLobby />`.
 *
 * ## Server authority
 *
 * The page never decides the user's role, the status, or the
 * realtime connection state. All branching is driven by the typed
 * `InstanceLifecycleErrorCode`, the server-provided status string,
 * and the `useInstanceSocket().connectionState` value.
 */

import { useMemo } from "react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstancesFeatureFlag } from "@/features/instances/hooks/useInstancesFeatureFlag";
import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import type { InstanceLifecycleErrorCode } from "@/features/instances/types/instance.types";

import {
  ConnectionBanner,
  InstanceClosedState,
  InstanceErrorState,
  InstanceLobby,
  InstanceLobbySkeleton,
  InstancePlaceholder,
} from "../components";

export interface InstanceRoomPageProps {
  /** Instance id; the page renders nothing when `null`. */
  instanceId: string | null;
  /** Optional class name for the page root. */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Lifecycle error codes the page renders an explicit `ErrorState`
 * for. Codes outside this set fall through to the lobby (or to a
 * generic inline banner).
 */
const PAGE_ERROR_CODES: ReadonlySet<InstanceLifecycleErrorCode> = new Set([
  "INSTANCE_NOT_FOUND",
  "INSTANCE_AUTH_REQUIRED",
  "INSTANCE_FORBIDDEN",
  "GLOBAL_UNAUTHENTICATED",
  "GLOBAL_FORBIDDEN",
  "GLOBAL_NOT_FOUND",
]);

function shouldShowClosedStatus(
  status: ReturnType<typeof useInstance>["instance"] extends infer T
    ? T extends { status: infer S }
      ? S
      : never
    : never,
): boolean {
  return status === "closed" || status === "finished";
}

// ─── Component ────────────────────────────────────────────────────────────

export function InstanceRoomPage({
  instanceId,
  className,
}: InstanceRoomPageProps) {
  const { isPlaceholder } = useInstancesFeatureFlag();
  const { currentUser } = useAuthBootstrap();
  const currentUserId = currentUser?.userId ?? null;

  // `useInstanceSocket` mounts on render. When `instanceId === null`
  // the hook returns the placeholder/idle state and never opens a
  // connection; on logout the hook tears down.
  useInstanceSocket(instanceId);

  const { instance, isLoading, error, refresh } = useInstance(
    instanceId,
    currentUserId,
  );

  const pageErrorCode: InstanceLifecycleErrorCode | null = useMemo(() => {
    if (error === null) return null;
    return error.code as InstanceLifecycleErrorCode;
  }, [error]);

  // ─── Feature-flag placeholder ─────────────────────────────────────────

  if (isPlaceholder) {
    return (
      <div className={className} data-testid="instance-room-page" data-state="placeholder">
        <InstancePlaceholder />
      </div>
    );
  }

  // ─── No instance id ──────────────────────────────────────────────────

  if (instanceId === null) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="no-id"
      >
        <InstanceErrorState error={null} />
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────────────────

  if (isLoading && instance === null) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="loading"
      >
        <InstanceLobbySkeleton />
      </div>
    );
  }

  // ─── Page-level error state ──────────────────────────────────────────

  if (
    pageErrorCode !== null &&
    PAGE_ERROR_CODES.has(pageErrorCode) &&
    instance === null
  ) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state="error"
      >
        <InstanceErrorState
          error={error}
          onRetry={() => {
            void refresh();
          }}
        />
      </div>
    );
  }

  // ─── Closed / finished ───────────────────────────────────────────────

  if (instance !== null && shouldShowClosedStatus(instance.status)) {
    return (
      <div
        className={className}
        data-testid="instance-room-page"
        data-state={instance.status}
      >
        <div className="space-y-6">
          <InstanceClosedState status={instance.status} />
          <ConnectionBanner instanceId={instanceId} />
        </div>
      </div>
    );
  }

  // ─── Live lobby ──────────────────────────────────────────────────────

  return (
    <div
      className={className}
      data-testid="instance-room-page"
      data-state="live"
    >
      <InstanceLobby
        instanceId={instanceId}
        currentUserId={currentUserId}
      />
    </div>
  );
}