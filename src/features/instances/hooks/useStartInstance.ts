"use client";

/**
 * `useStartInstance` — host-only start mutation hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B4 (start mutation).
 *
 * ## What this hook owns
 *
 * - Call `POST /api/v1/instances/:id/start` for the authenticated host
 *   via the service layer.
 * - Map start-specific error codes (`INSTANCE_HOST_REQUIRED`,
 *   `INSTANCE_INVALID_TRANSITION` (covers `INSTANCE_ALREADY_STARTED`,
 *   `INSTANCE_NOT_IN_COUNTDOWN`, `INSTANCE_OPTIMISTIC_LOCK`),
 *   `INSTANCE_AUTH_REQUIRED`) to typed `ApiError` codes. The UI
 *   branches on `ApiError.code` via `getUserCopy` (Epic 5.1 D3) —
 *   never on HTTP status.
 * - Re-check `useInstancePermissions` and surface
 *   `INSTANCE_HOST_REQUIRED` when the local role is not `'host'`. The
 *   server remains authoritative; the local check is a UI hint.
 * - Revalidate the affected SWR keys (`detail`) on success so the
 *   lobby re-renders the new status.
 * - Double-click prevention: while `state === 'pending'`, subsequent
 *   `start()` calls are a no-op.
 * - Feature-flag gating via `phase5_instances`.
 *
 * ## No blind retry
 *
 * Start failures are surfaced as typed errors. The CTA re-enables
 * after `state` returns to `'error'`. The user must act intentionally
 * to retry.
 *
 * ## Auth
 *
 * When unauthenticated, `start()` returns a rejected promise with
 * `INSTANCE_AUTH_REQUIRED` so the CTA can trigger the sign-in flow.
 */

import { useCallback, useRef, useState } from "react";
import { mutate as globalMutate } from "swr";

import { ApiError } from "@/lib/api";

import { startInstance } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceLifecycleErrorCode,
  type InstanceLifecycleMutationState,
  type InstancePermissions,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseStartInstanceResult {
  start: () => Promise<void>;
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

function wrapAsApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError(
    err as unknown as ConstructorParameters<typeof ApiError>[0],
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useStartInstance(
  instanceId: string | null,
  permissions: InstancePermissions | null = null,
): UseStartInstanceResult {
  const flagValue = getFeatureFlagValue("phase5_instances");
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

    // Local role check — server is authoritative. The hook surfaces
    // `INSTANCE_HOST_REQUIRED` so the UI can disable the CTA on a
    // stale role without firing the REST call.
    if (permissions !== null && !permissions.canStart) {
      setState("error");
      setError(
        new ApiError({
          status: 403,
          code: "INSTANCE_HOST_REQUIRED",
          message: "Only the host can start this instance.",
        } as unknown as ConstructorParameters<typeof ApiError>[0]),
      );
      return;
    }

    inFlightRef.current = true;
    setState("pending");
    setError(null);

    try {
      await startInstance(instanceId);

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
      const mapped = new ApiError({
        ...(wrapped as unknown as object),
        code: mappedCode,
      } as unknown as ConstructorParameters<typeof ApiError>[0]);

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
    start,
    state,
    error,
    reset,
  };
}
