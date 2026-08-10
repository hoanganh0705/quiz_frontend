"use client";

/**
 * `useCloseInstance` — host-only close mutation hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B4 (close mutation).
 *
 * ## What this hook owns
 *
 * - Call `POST /api/v1/instances/:id/close` for the authenticated host
 *   via the service layer.
 * - Map close-specific error codes (`INSTANCE_HOST_REQUIRED`,
 *   `INSTANCE_INVALID_TRANSITION` (covers `INSTANCE_ALREADY_CLOSED`,
 *   `INSTANCE_ALREADY_FINISHED`), `INSTANCE_AUTH_REQUIRED`) to typed
 *   `ApiError` codes. The UI branches on `ApiError.code` via
 *   `getUserCopy` (Epic 5.1 D3) — never on HTTP status.
 * - Re-check `useInstancePermissions` and surface
 *   `INSTANCE_HOST_REQUIRED` when the local role is not `'host'`. The
 *   server remains authoritative; the local check is a UI hint.
 * - Revalidate the affected SWR keys (`detail`) on success so the
 *   lobby re-renders the closed status.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `close()` calls are a no-op.
 * - Feature-flag gating via `multiplayer_instances_live`.
 *
 * ## No blind retry
 *
 * Close failures are surfaced as typed errors. The CTA re-enables
 * after `state` returns to `'error'`. The user must act intentionally
 * to retry.
 *
 * ## Auth
 *
 * When unauthenticated, `close()` returns a rejected promise with
 * `INSTANCE_AUTH_REQUIRED` so the CTA can trigger the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";

import { closeInstance } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleErrorCode,
  type InstanceLifecycleMutationState,
  type InstancePermissions,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseCloseInstanceResult {
  close: () => Promise<void>;
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
    case "INSTANCE_HOST_REQUIRED":
    case "INSTANCE_NOT_HOST":
    case "HOST_REQUIRED":
      return "INSTANCE_HOST_REQUIRED";
    case "INSTANCE_INVALID_TRANSITION":
    case "INSTANCE_ALREADY_CLOSED":
    case "INSTANCE_ALREADY_FINISHED":
    case "INSTANCE_OPTIMISTIC_LOCK":
      return "INSTANCE_INVALID_TRANSITION";
    case "INSTANCE_FORBIDDEN":
      return "INSTANCE_FORBIDDEN";
    case "INSTANCE_NOT_FOUND":
      return "INSTANCE_NOT_FOUND";
    case "INSTANCE_NOT_JOINED":
      return "INSTANCE_NOT_JOINED";
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

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useCloseInstance(
  instanceId: string | null,
  permissions: InstancePermissions | null = null,
): UseCloseInstanceResult {
  const flagValue = getFeatureFlagValue("multiplayer_instances_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const [state, setState] = useState<InstanceLifecycleMutationState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef(false);

  const close = useCallback(async (): Promise<void> => {
    if (isFlagPlaceholder || instanceId === null) {
      return;
    }

    if (state === "pending" || inFlightRef.current) {
      return;
    }

    // Local role check — server is authoritative. The hook surfaces
    // `INSTANCE_HOST_REQUIRED` so the UI can disable the CTA on a
    // stale role without firing the REST call.
    if (permissions !== null && !permissions.canClose) {
      setState("error");
      setError(
        ApiError.fromInput({
          status: 403,
          code: "INSTANCE_HOST_REQUIRED",
          message: "Only the host can close this instance.",
        }),
      );
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await closeInstance(instanceId);

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
  }, [isFlagPlaceholder, instanceId, permissions, state]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    inFlightRef.current = false;
  }, []);

  return {
    close,
    state,
    error,
    reset,
  };
}
