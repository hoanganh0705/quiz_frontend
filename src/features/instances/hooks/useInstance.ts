"use client";

import { useCallback, useMemo } from "react";

import { ApiError, coerceToApiError, useSingleWithRetry } from "@/lib/api";

import { getInstance } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceDetail,
  type InstanceLifecycleErrorCode,
  type InstanceRole,
} from "@/features/instances/types/instance.types";

import type { InstanceDetailResponseDto } from "@/lib/api/generated/schemas";

export interface UseInstanceResult {
  instance: InstanceDetail | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

type GetInstanceWireResponse = {
  data?: InstanceDetailResponseDto;
  meta?: unknown;
};

function mapToInstanceLifecycleErrorCode(
  code: string | undefined,
): InstanceLifecycleErrorCode {
  if (!code) return "GLOBAL_INTERNAL_ERROR";

  switch (code) {
    case "INSTANCE_NOT_FOUND":
      return "INSTANCE_NOT_FOUND";
    case "INSTANCE_CLOSED":
    case "INSTANCE_ALREADY_CLOSED":
    case "INSTANCE_ALREADY_FINISHED":
      return "INSTANCE_CLOSED";
    case "INSTANCE_FULL":
      return "INSTANCE_FULL";
    case "INSTANCE_ALREADY_JOINED":
      return "INSTANCE_ALREADY_JOINED";
    case "INSTANCE_NOT_JOINED":
      return "INSTANCE_NOT_JOINED";
    case "INSTANCE_NOT_HOST":
    case "HOST_REQUIRED":
      return "INSTANCE_HOST_REQUIRED";
    case "INSTANCE_FORBIDDEN":
      return "INSTANCE_FORBIDDEN";
    case "INSTANCE_ALREADY_STARTED":
    case "INSTANCE_NOT_IN_COUNTDOWN":
    case "INSTANCE_OPTIMISTIC_LOCK":
      return "INSTANCE_INVALID_TRANSITION";
    case "GLOBAL_UNAUTHENTICATED":
    case "AUTH_TOKEN_EXPIRED":
    case "AUTH_INVALID_TOKEN":
    case "AUTH_REQUIRED":
      return "INSTANCE_AUTH_REQUIRED";
    case "GLOBAL_NOT_FOUND":
      return "GLOBAL_NOT_FOUND";
    case "GLOBAL_FORBIDDEN":
    case "FORBIDDEN":
      return "GLOBAL_FORBIDDEN";
    case "GLOBAL_VALIDATION_FAILED":
      return "GLOBAL_VALIDATION_FAILED";
    case "GLOBAL_INTERNAL_ERROR":
      return "GLOBAL_INTERNAL_ERROR";
    default:
      return "GLOBAL_INTERNAL_ERROR";
  }
}

function wrapAsInstanceApiError(err: unknown): ApiError {
  return coerceToApiError(err);
}

function deriveRole(
  detail: InstanceDetailResponseDto,
  currentUserId: string | null,
): InstanceRole {
  if (!currentUserId) return null;
  if (detail.hostUserId === currentUserId) return "host";
  if (
    Array.isArray(detail.players) &&
    detail.players.some((p) => p.userId === currentUserId)
  ) {
    return "player";
  }
  return null;
}

export function useInstance(
  instanceId: string | null,
  currentUserId: string | null = null,
): UseInstanceResult {
  const key = useMemo(
    () =>
      instanceId === null
        ? null
        : INSTANCE_CACHE_KEYS.detail(instanceId),
    [instanceId],
  );

  const fetcher = useCallback(async (): Promise<InstanceDetailResponseDto | null> => {
    if (instanceId === null) {
      return null;
    }

    try {
      const wire = (await getInstance(instanceId)) as unknown as
        GetInstanceWireResponse | InstanceDetailResponseDto;

      const detail =
        wire &&
        typeof wire === "object" &&
        "data" in wire &&
        (wire as GetInstanceWireResponse).data
          ? (wire as GetInstanceWireResponse).data!
          : (wire as InstanceDetailResponseDto);

      if (!detail || !detail.instanceId) {
        return null;
      }

      return detail;
    } catch (err) {
      throw wrapAsInstanceApiError(err);
    }
  }, [instanceId]);

  const result = useSingleWithRetry<InstanceDetailResponseDto | null>({
    key,
    fetcher,
  });

  const instance = useMemo<InstanceDetail | null>(() => {
    const detail = result.data ?? null;
    if (!detail) return null;
    return {
      ...detail,
      id: detail.instanceId,
      currentUserRole: deriveRole(detail, currentUserId),
    } as InstanceDetail;
  }, [result.data, currentUserId]);

  const refresh = useCallback(async () => {
    await result.retry();
  }, [result]);

  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    const mappedCode = mapToInstanceLifecycleErrorCode(result.error.code);
    return result.error.withCode(mappedCode);
  }, [result.error]);

  return {
    instance,
    isLoading: result.isLoading,
    isStale: false,
    error: mappedError,
    refresh,
  };
}
