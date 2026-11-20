"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";
import { createInstance } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleMutationState,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import type {
  CreateInstanceDto,
  CreateInstanceResponseDto,
} from "@/lib/api/generated/schemas";

export interface UseCreateInstanceResult {
  create: (
    params: CreateInstanceDto,
  ) => Promise<CreateInstanceResponseDto | null>;
  state: InstanceLifecycleMutationState;
  isCreating: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useCreateInstance(): UseCreateInstanceResult {
  const flagValue = getFeatureFlagValue("multiplayer_instances_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<InstanceLifecycleMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  const create = useCallback(
    async (
      params: CreateInstanceDto,
    ): Promise<CreateInstanceResponseDto | null> => {
      if (isFlagPlaceholder) {
        return null;
      }

      if (state === "pending" || inFlightRef.current) {
        return null;
      }

      inFlightRef.current = true;
      setState("pending");
      setError(null);

      try {
        const wire = await createInstance(params);
        setState("success");
        try {
          void getQueryClient().invalidateQueries({
            queryKey: INSTANCE_CACHE_KEYS.list(),
          });
        } catch {
          // ignore
        }
        return wire as CreateInstanceResponseDto;
      } catch (err: unknown) {
        setState("error");
        const normalized = isApiError(err) ? err : coerceToApiError(err);
        setError(normalized);
        throw normalized;
      } finally {
        inFlightRef.current = false;
      }
    },
    [isFlagPlaceholder, state],
  );

  return {
    create,
    state,
    isCreating: state === "pending",
    error,
    reset,
  };
}
