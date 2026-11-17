"use client";

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, coerceToApiError } from "@/lib/api";

import {
  startCountdown,
  startInstance,
} from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleErrorCode,
  type InstanceLifecycleMutationState,
  type InstancePermissions,
  type InstanceStatus,
} from "@/features/instances/types/instance.types";
import { useInstanceRealtimeStore } from "@/features/instances/stores/useInstanceRealtimeStore";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseStartInstanceOptions {
  status?: InstanceStatus | null;
}

export interface UseStartInstanceResult {
  start: () => Promise<void>;
  state: InstanceLifecycleMutationState;
  error: ApiError | null;
  reset: () => void;
}

function mapToInstanceLifecycleErrorCode(
  code: string | undefined,
): InstanceLifecycleErrorCode {
  if (!code) return "GLOBAL_INTERNAL_ERROR";
  switch (code) {
    case "INSTANCE_HOST_REQUIRED":
    case "INSTANCE_NOT_HOST":
    case "HOST_REQUIRED":
      return "INSTANCE_HOST_REQUIRED";
    case "INSTANCE_INVALID_TRANSITION":
    case "INSTANCE_ALREADY_STARTED":
    case "INSTANCE_NOT_IN_COUNTDOWN":
    case "INSTANCE_OPTIMISTIC_LOCK":
      return "INSTANCE_INVALID_TRANSITION";
    case "INSTANCE_CLOSED":
    case "INSTANCE_ALREADY_CLOSED":
    case "INSTANCE_ALREADY_FINISHED":
      return "INSTANCE_CLOSED";
    case "INSTANCE_FORBIDDEN":
      return "INSTANCE_FORBIDDEN";
    case "INSTANCE_NOT_FOUND":
      return "INSTANCE_NOT_FOUND";
    case "GLOBAL_UNAUTHENTICATED":
    case "AUTH_TOKEN_EXPIRED":
    case "AUTH_INVALID_TOKEN":
      return "INSTANCE_AUTH_REQUIRED";
    case "GLOBAL_FORBIDDEN":
    case "FORBIDDEN":
      return "GLOBAL_FORBIDDEN";
    case "GLOBAL_NOT_FOUND":
      return "GLOBAL_NOT_FOUND";
    case "GLOBAL_VALIDATION_FAILED":
    case "MIN_PLAYERS_NOT_MET":
      return "GLOBAL_VALIDATION_FAILED";
    case "GLOBAL_INTERNAL_ERROR":
      return "GLOBAL_INTERNAL_ERROR";
    default:
      return "GLOBAL_INTERNAL_ERROR";
  }
}

export function useStartInstance(
  instanceId: string | null,
  permissions: InstancePermissions | null = null,
  options?: UseStartInstanceOptions,
): UseStartInstanceResult {
  const flagValue = getFeatureFlagValue("multiplayer_instances_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<InstanceLifecycleMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const start = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder || instanceId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    if (permissions !== null && !permissions.canStart) {
      setState("error");
      setError(
        ApiError.fromInput({
          status: 403,
          code: "INSTANCE_HOST_REQUIRED",
          message: "Only the host can start this instance.",
        }),
      );
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      if (options?.status === "open") {
        const result = await startCountdown(instanceId, {});
        useInstanceRealtimeStore.getState().applyLifecycleEvent({
          type: "countdown_started",
          instanceId,
          at: result?.countdownStartedAt ?? new Date().toISOString(),
          eventSequence: Date.now(),
          status: "countdown",
          countdownStartedAt: result?.countdownStartedAt ?? new Date().toISOString(),
        });
      } else {
        try {
          await startInstance(instanceId);
          useInstanceRealtimeStore.getState().applyLifecycleEvent({
            type: "instance_started",
            instanceId,
            at: new Date().toISOString(),
            eventSequence: Date.now(),
            status: "running",
          });
        } catch (innerCause: unknown) {
          const innerError = coerceToApiError(innerCause);
          if (innerError.code === "INSTANCE_NOT_IN_COUNTDOWN") {
            const result = await startCountdown(instanceId, {});
            useInstanceRealtimeStore.getState().applyLifecycleEvent({
              type: "countdown_started",
              instanceId,
              at: result?.countdownStartedAt ?? new Date().toISOString(),
              eventSequence: Date.now(),
              status: "countdown",
              countdownStartedAt: result?.countdownStartedAt ?? new Date().toISOString(),
            });
          } else if (innerError.code === "INSTANCE_ALREADY_STARTED") {
            useInstanceRealtimeStore.getState().applyLifecycleEvent({
              type: "instance_started",
              instanceId,
              at: new Date().toISOString(),
              eventSequence: Date.now(),
              status: "running",
            });
          } else {
            throw innerCause;
          }
        }
      }

      const keys = INSTANCE_CACHE_KEYS.all(instanceId);
      await Promise.all([
        globalMutate(keys.detail, undefined, { revalidate: true }),
        globalMutate(keys.players, undefined, { revalidate: true }),
      ]);

      setState("success");
      setError(null);

      setTimeout(() => {
        setState("idle");
      }, 1000);
    } catch (cause: unknown) {
      const wrapped = coerceToApiError(cause);
      const mappedCode = mapToInstanceLifecycleErrorCode(wrapped.code);
      const mapped = ApiError.fromInput({
        status: wrapped.status,
        code: mappedCode,
        message: wrapped.detail,
        title: wrapped.title,
        requestId: wrapped.requestId,
      });

      setState("error");
      setError(mapped);
    } finally {
      inFlightRef.current = false;
    }
  }, [isFlagPlaceholder, instanceId, permissions, options?.status, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    start,
    state,
    error,
    reset,
  };
}
