"use client";

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import { useInstance } from "@/features/instances/hooks/useInstance";
import {
  selectInstanceRealtimeStatus,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import {
  type InstanceDetail,
  type InstancePermissions,
  type InstanceRole,
  type InstanceStatus,
} from "@/features/instances/types/instance.types";

const STRICTEST_PERMISSIONS: InstancePermissions = {
  canJoin: false,
  canLeave: false,
  canStart: false,
  canCancel: false,
  canClose: false,
  role: null,
  isAuthenticated: false,
};

function deriveRole(
  detail: InstanceDetail | null,
  currentUserId: string | null,
): InstanceRole {
  if (detail === null) return null;
  if (detail.currentUserRole !== null) return detail.currentUserRole;

  if (currentUserId !== null && detail.hostUserId === currentUserId) {
    return "host";
  }

  return null;
}

function deriveRoleFromMembership(
  baseRole: InstanceRole,
  isInRoster: boolean,
): InstanceRole {
  if (baseRole === "host") return "host";
  if (isInRoster) return "player";
  return baseRole;
}

export function resolveInstancePermissions(args: {
  status: InstanceStatus | null;
  role: InstanceRole;
  isAuthenticated: boolean;
}): InstancePermissions {
  const { status, role, isAuthenticated } = args;

  if (!isAuthenticated || status === null) {
    return STRICTEST_PERMISSIONS;
  }

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
    canJoin: !isHost && !isPlayer && status === "open",
    canLeave: isPlayer,
    canStart: isHost && (status === "countdown" || status === "open"),
    canCancel: isHost && status === "countdown",
    canClose:
      isHost &&
      (status === "running" || status === "countdown" || status === "open"),
    role,
    isAuthenticated,
  };
}

export interface UseInstancePermissionsOptions {
  currentUserId?: string | null;
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

  const realtimeStatus = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeStatus(state, instanceId),
  );

  const effectiveStatus = realtimeStatus ?? instance?.status ?? null;

  return useMemo<InstancePermissions>(() => {
    if (instanceId === null) {
      return STRICTEST_PERMISSIONS;
    }

    const baseRole = deriveRole(instance, currentUserId);
    const isInRoster = options.isInRoster === true;
    const role = deriveRoleFromMembership(baseRole, isInRoster);

    return resolveInstancePermissions({
      status: effectiveStatus,
      role,
      isAuthenticated,
    });
  }, [
    instanceId,
    instance,
    currentUserId,
    isAuthenticated,
    options.isInRoster,
    effectiveStatus,
  ]);
}
