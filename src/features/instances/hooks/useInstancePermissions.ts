"use client";

/**
 * `useInstancePermissions` — derive host/player permissions from the
 * server-provided role and instance status.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B3.
 *
 * ## What this hook owns
 *
 * - Derive the current user's permission set (`canJoin`, `canLeave`,
 *   `canStart`, `canCancel`, `canClose`) from the server-provided
 *   `currentUserRole` and `status` on `InstanceDetail`.
 * - The host role is additionally matched by `hostUserId` against the
 *   authenticated user id (read from `useAuthSession`); the match
 *   upgrades the derived role to `'host'` for hosts that the server
 *   has not yet exposed via `currentUserRole`.
 * - The strictest permission set is returned when the role is unknown
 *   (`null`) or the user is unauthenticated. The strictest set is
 *   "no action permitted" — components that misread the role cannot
 *   accidentally grant a permission.
 *
 * ## Server authority
 *
 * The server remains the source of truth for every permission. The hook
 * performs a UI-side hint only; a stale client-side role that disagrees
 * with the server is surfaced via the `INSTANCE_HOST_REQUIRED` and
 * `INSTANCE_INVALID_TRANSITION` error codes from the lifecycle mutation
 * hooks (TKT-5.7.B4).
 *
 * ## Status rules
 *
 *   - `status: 'open'` (lobby) — joins/leaves permitted; host can
 *     start the countdown (`canStart === true`) and cancel it
 *     (`canCancel === true`).
 *   - `status: 'countdown'` — joins still permitted (subject to
 *     `INSTANCE_FULL`); host can cancel the countdown and start
 *     the instance.
 *   - `status: 'running'` — joins closed; host can close the instance.
 *   - `status: 'closed'` or `status: 'finished'` — no actions; the
 *     lobby renders the `InstanceClosedState` primitive.
 */

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { useInstance } from "@/features/instances/hooks/useInstance";
import {
  type InstanceDetail,
  type InstancePermissions,
  type InstanceRole,
  type InstanceStatus,
} from "@/features/instances/types/instance.types";

// ─── Helpers ──────────────────────────────────────────────────────────────

const STRICTEST_PERMISSIONS: InstancePermissions = {
  canJoin: false,
  canLeave: false,
  canStart: false,
  canCancel: false,
  canClose: false,
  role: null,
  isAuthenticated: false,
};

/**
 * Derive the effective role from the server-provided role and the host
 * user id. The server-provided role is the primary source; the host
 * match is a fallback for detail responses that pre-date the
 * `currentUserRole` field.
 */
function deriveRole(
  detail: InstanceDetail | null,
  currentUserId: string | null,
): InstanceRole {
  if (detail === null) return null;
  if (detail.currentUserRole !== null) return detail.currentUserRole;

  // Fallback: match the host user id explicitly.
  if (currentUserId !== null && detail.hostUserId === currentUserId) {
    return "host";
  }

  // The roster match is performed by `useInstancePlayers` consumers;
  // we keep the strictest default here so the UI cannot grant a
  // permission based on local state alone.
  return null;
}

/**
 * Reverse a player-side membership into a role when the lobby
 * server response does not include `currentUserRole`.
 */
function deriveRoleFromMembership(
  baseRole: InstanceRole,
  isInRoster: boolean,
): InstanceRole {
  if (baseRole === "host") return "host";
  if (isInRoster) return "player";
  return baseRole;
}

/**
 * Pure permission resolver.
 *
 * Given the server-driven inputs (`status`, `role`, `isAuthenticated`),
 * compute the permission bitmask. The function is pure — it has no
 * side effects and does not read from React context.
 */
export function resolveInstancePermissions(args: {
  status: InstanceStatus | null;
  role: InstanceRole;
  isAuthenticated: boolean;
}): InstancePermissions {
  const { status, role, isAuthenticated } = args;

  if (!isAuthenticated || role === null || status === null) {
    return STRICTEST_PERMISSIONS;
  }

  // Terminal states — no actions permitted.
  if (status === "closed" || status === "finished") {
    return {
      canJoin: false,
      canLeave: false,
      canStart: false,
      canCancel: false,
      canClose: false,
      role,
      isAuthenticated,
    };
  }

  const isHost = role === "host";
  const isPlayer = role === "player";

  return {
    canJoin: isPlayer && (status === "open" || status === "countdown"),
    canLeave: isPlayer,
    canStart: isHost && (status === "countdown" || status === "open"),
    canCancel: isHost && status === "countdown",
    canClose: isHost && (status === "running" || status === "countdown"),
    role,
    isAuthenticated,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseInstancePermissionsOptions {
  /**
   * Optional override for the current user id. When omitted, the hook
   * reads from `useAuthSession`. Tests and the host-match fallback
   * path use the override.
   */
  currentUserId?: string | null;
  /**
   * Whether the current user is in the roster. Computed by the page
   * from `useInstancePlayers` items — the hook does not call
   * `useInstancePlayers` itself to keep the hook free of network
   * concerns.
   */
  isInRoster?: boolean;
}

export function useInstancePermissions(
  instanceId: string | null,
  options: UseInstancePermissionsOptions = {},
): InstancePermissions {
  const auth = useAuthSession();
  const overrideUserId = options.currentUserId ?? null;
  const currentUserId = overrideUserId ?? auth.currentUser?.userId ?? null;
  const isAuthenticated = auth.isAuthenticated && currentUserId !== null;

  const { instance } = useInstance(instanceId, currentUserId);

  return useMemo<InstancePermissions>(() => {
    if (instanceId === null) {
      return STRICTEST_PERMISSIONS;
    }

    const baseRole = deriveRole(instance, currentUserId);
    const isInRoster = options.isInRoster === true;
    const role = deriveRoleFromMembership(baseRole, isInRoster);

    return resolveInstancePermissions({
      status: instance?.status ?? null,
      role,
      isAuthenticated,
    });
  }, [instanceId, instance, currentUserId, isAuthenticated, options.isInRoster]);
}
