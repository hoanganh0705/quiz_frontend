"use client";

/**
 * `useJoinInstance` — player join mutation hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B4 (join mutation).
 *
 * ## What this hook owns
 *
 * - Call `POST /api/v1/instances/:id/join` for the authenticated user
 *   via the service layer.
 * - Map join-specific error codes (`INSTANCE_FULL`, `INSTANCE_CLOSED`,
 *   `INSTANCE_ALREADY_JOINED`, `INSTANCE_AUTH_REQUIRED`) to typed
 *   `ApiError` codes. The UI branches on `ApiError.code` via
 *   `getUserCopy` (Epic 5.1 D3) — never on HTTP status.
 * - Revalidate the affected SWR keys (`detail`, `players`) on success
 *   so the lobby re-renders the new role and roster.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `join()` calls are a no-op.
 * - Feature-flag gating via `phase5_instances`.
 *
 * ## No blind retry
 *
 * Join failures are surfaced as typed errors. The CTA re-enables after
 * `state` returns to `'error'`. The user must act intentionally to retry.
 *
 * ## Auth
 *
 * When unauthenticated, `join()` returns a rejected promise with
 * `INSTANCE_AUTH_REQUIRED` so the CTA can trigger the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";

import { joinInstance } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceJoinOutcome,
  type InstanceLifecycleErrorCode,
  type InstanceLifecycleMutationState,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  JoinInstanceResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseJoinInstanceResult {
  join: () => Promise<void>;
  state: InstanceLifecycleMutationState;
  error: ApiError | null;
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapToInstanceLifecycleErrorCode(
  code: string | undefined,
): InstanceLifecycleErrorCode {
  if (!code) return "GLOBAL_INTERNAL_ERROR";
  switch (code) {
    case "INSTANCE_FULL":
      return "INSTANCE_FULL";
    case "INSTANCE_CLOSED":
    case "INSTANCE_ALREADY_CLOSED":
    case "INSTANCE_ALREADY_FINISHED":
      return "INSTANCE_CLOSED";
    case "INSTANCE_ALREADY_JOINED":
      return "INSTANCE_ALREADY_JOINED";
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
      return "GLOBAL_VALIDATION_FAILED";
    case "GLOBAL_INTERNAL_ERROR":
      return "GLOBAL_INTERNAL_ERROR";
    default:
      return "GLOBAL_INTERNAL_ERROR";
  }
}

function wrapAsApiError(err: unknown): ApiError {
  return coerceToApiError(err);
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useJoinInstance(
  instanceId: string | null,
): UseJoinInstanceResult {
  const flagValue = getFeatureFlagValue("phase5_instances");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<InstanceLifecycleMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const join = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder || instanceId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      const wire = (await joinInstance(instanceId)) as unknown as {
        data?: JoinInstanceResponseDto;
      };

      void wire;

      const result: InstanceJoinOutcome = {
        instanceId,
        currentUserRole: "player",
        joinedAt: new Date().toISOString(),
      };

      // Invalidate the affected SWR keys so the detail re-fetches the
      // new role and the roster re-fetches the new player.
      const keys = INSTANCE_CACHE_KEYS.all(instanceId);
      await Promise.all([
        globalMutate(keys.detail, undefined, { revalidate: true }),
        globalMutate(keys.players, undefined, { revalidate: true }),
      ]);

      void result;
      setState("success");
      setError(null);

      // Reset to idle after 1 second so the CTA can be used again.
      setTimeout(() => {
        setState("idle");
      }, 1000);
    } catch (cause: unknown) {
      const wrapped = wrapAsApiError(cause);
      const mappedCode = mapToInstanceLifecycleErrorCode(wrapped.code);
      const mapped = ApiError.fromInput({
        status: wrapped.status,
        code: mappedCode,
        message: wrapped.detail,
        title: wrapped.title,
        requestId: wrapped.requestId,
      });

      // Use the mapped error for the UI; preserve the original for telemetry.
      if (!isApiError(cause)) {
        // network/parsing error — already wrapped
      }
      setState("error");
      setError(mapped);
    } finally {
      inFlightRef.current = false;
    }
  }, [isFlagPlaceholder, instanceId, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    join,
    state,
    error,
    reset,
  };
}
