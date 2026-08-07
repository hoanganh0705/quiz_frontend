"use client";

/**
 * `useLeaveInstance` — player leave mutation hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B4 (leave mutation).
 *
 * ## What this hook owns
 *
 * - Emit the `leave_instance` socket event for the authenticated user
 *   via the `useInstanceSocket` hook (TKT-5.7.B5). The master plan
 *   does not expose a REST `leaveInstance` endpoint — leave is a
 *   socket-only event in Story 5.7.
 * - Map leave-specific error codes (`INSTANCE_NOT_JOINED`,
 *   `INSTANCE_CLOSED`, `INSTANCE_AUTH_REQUIRED`) to typed `ApiError`
 *   codes. The UI branches on `ApiError.code` via `getUserCopy`
 *   (Epic 5.1 D3) — never on HTTP status.
 * - Revalidate the affected SWR keys (`detail`, `players`) on success
 *   so the lobby re-renders after the player leaves.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `leave()` calls are a no-op.
 * - Feature-flag gating via `phase5_instances`.
 *
 * ## No blind retry
 *
 * Leave failures are surfaced as typed errors. The CTA re-enables after
 * `state` returns to `'error'`. The user must act intentionally to retry.
 *
 * ## Auth
 *
 * When unauthenticated, `leave()` returns a rejected promise with
 * `INSTANCE_AUTH_REQUIRED` so the CTA can trigger the sign-in flow.
 *
 * ## Caller wiring
 *
 * The hook accepts an `emitLeave` function from the socket hook so
 * the hook itself stays free of socket concerns. The page composition
 * (Batch F) wires the two together via `useInstanceSocket`.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";

import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleErrorCode,
  type InstanceLifecycleMutationState,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ─────────────────────────────────────────────────────────

export type EmitLeaveFn = () => Promise<void>;

export interface UseLeaveInstanceOptions {
  /**
   * Emit function provided by `useInstanceSocket` (TKT-5.7.B5). When
   * omitted, the hook treats the call as a no-op (placeholder branch).
   */
  emitLeave?: EmitLeaveFn | null;
}

export interface UseLeaveInstanceResult {
  leave: () => Promise<void>;
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
    case "INSTANCE_NOT_JOINED":
      return "INSTANCE_NOT_JOINED";
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

export function useLeaveInstance(
  instanceId: string | null,
  options: UseLeaveInstanceOptions = {},
): UseLeaveInstanceResult {
  const flagValue = getFeatureFlagValue("phase5_instances");
  const isFlagPlaceholder = flagValue === "placeholder";

  const { emitLeave = null } = options;

  const [state, setState] = useState<InstanceLifecycleMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const leave = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder || instanceId === null || emitLeave === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await emitLeave();

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
      const wrapped = wrapAsApiError(cause);
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
  }, [isFlagPlaceholder, instanceId, emitLeave, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    leave,
    state,
    error,
    reset,
  };
}
