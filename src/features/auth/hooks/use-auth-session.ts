"use client";

import { useCallback } from "react";

import { useQuery } from "@tanstack/react-query";

import { getAuth, unwrapEnvelope } from "@/lib/api";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { AUTH_KEYS } from "@/features/auth/query-keys";
import {
  useIsUserLoading,
  useUser,
  useUserError,
} from "@/features/users/store/user-store";

import type { CurrentUserResponseDto } from "@/features/auth/types";

export type AuthSessionBootstrapState =
  | "unauthenticated"
  | "bootstrapping"
  | "authenticated";

export interface AuthSessionValue {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isDegraded: boolean;
  bootstrapState: AuthSessionBootstrapState;
  currentUserId: string | null;
  user: ReturnType<typeof useUser>;
  currentUser: ReturnType<typeof useUser>;
}

export interface AuthIdentityValue {
  currentUser: CurrentUserResponseDto | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAuthSession(): AuthSessionValue {
  const { isAuthenticated } = useAuthState();
  const isBootstrapping = useIsUserLoading();
  const user = useUser();
  const error = useUserError();

  const currentUserId = user?.userId ?? null;
  const isDegraded =
    isAuthenticated && !isBootstrapping && user === null && error !== null;

  const bootstrapState: AuthSessionBootstrapState = !isAuthenticated
    ? "unauthenticated"
    : user !== null || isDegraded
      ? "authenticated"
      : "bootstrapping";

  return {
    isAuthenticated,
    isBootstrapping,
    isDegraded,
    bootstrapState,
    currentUserId,
    user,
    currentUser: user,
  };
}

/**
 * Server-verified `/auth/me` identity hook (includes `role` for RBAC and
 * `ProtectedShell` session verification), owned by TanStack Query under
 * `AUTH_KEYS.me()`. Immediately clears to `null` when `isAuthenticated` flips
 * false on logout.
 */
export function useAuthIdentity(): AuthIdentityValue {
  const { isAuthenticated } = useAuthState();

  const query = useQuery<CurrentUserResponseDto, Error>({
    queryKey: AUTH_KEYS.me(),
    queryFn: async () => {
      const response = await getAuth().authControllerGetCurrentUser();
      return unwrapEnvelope(
        response as { data?: CurrentUserResponseDto },
        "No data returned from /auth/me",
      );
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });

  const refetch = useCallback(async () => {
    if (!isAuthenticated) return;
    await query.refetch();
  }, [isAuthenticated, query]);

  if (!isAuthenticated) {
    return {
      currentUser: null,
      isLoading: false,
      error: null,
      refetch,
    };
  }

  return {
    currentUser: query.data ?? null,
    isLoading: query.isPending,
    error: query.error ?? null,
    refetch,
  };
}
