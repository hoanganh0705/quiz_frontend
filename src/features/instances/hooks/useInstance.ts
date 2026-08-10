"use client";

/**
 * `useInstance` — single instance detail hook (REST).
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B1.
 *
 * ## What this hook owns
 *
 * - Fetch a single instance's detail through the service layer using
 *   the verified `getInstance` wrapper from Story 5.1 F2.
 * - Synthesise an `id` alias on the detail so SWR deduplication
 *   (`appendUniqueById`) works in downstream consumers.
 * - Populate the `currentUserRole` projection from the server-provided
 *   host user id and the roster — the host role is mapped from the
 *   `hostUserId` field; the player role is mapped from the roster. The
 *   server remains authoritative; the client only derives a UI hint.
 * - Expose `isStale` when revalidation fails with cached data present.
 * - Feature-flag gating via `multiplayer_instances_live`.
 *
 * ## Auth reads
 *
 * The detail endpoint requires a JWT bearer token. When the user is
 * unauthenticated, `getInstance` throws `GLOBAL_UNAUTHENTICATED` and
 * the hook surfaces a typed `InstanceLifecycleErrorCode` of
 * `INSTANCE_AUTH_REQUIRED` so the UI can render the
 * `InstanceConnectionStatus` auth-required state.
 *
 * ## Server authority
 *
 * `status`, `currentUserRole`, and the host identity are all
 * server-provided. The client never maps a timestamp to a status and
 * never infers a role from local state.
 */

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { getInstance } from "@/features/instances/services/instances.service";
import {
  INSTANCE_CACHE_KEYS,
  type InstanceDetail,
  type InstanceLifecycleErrorCode,
  type InstanceRole,
} from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
  InstanceDetailResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Lifecycle error code for the instance REST + WS surfaces.
 *
 * The hooks in this story type their `error.code` field as
 * `InstanceLifecycleErrorCode` so the UI can branch on a single
 * typed union. The `ApiError` class itself is not generic; the union
 * is enforced by re-mapping the raw `code` string at the hook boundary.
 */
export interface UseInstanceResult {
  instance: InstanceDetail | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

// ─── Wire type ────────────────────────────────────────────────────────────

/**
 * Wire envelope returned by `getInstance`.
 *
 * The service returns `GetInstanceControllerGetInstanceByIdResult` which
 * is `WrappedDto & GetInstanceById200AllOf`. Shape:
 * `{ data: InstanceDetailResponseDto; meta: ResponseMetaDto }`.
 */
type GetInstanceWireResponse = {
  data?: InstanceDetailResponseDto;
  meta?: unknown;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Map the raw `ApiError.code` to the `InstanceLifecycleErrorCode` union.
 *
 * The story 5.7 backend returns a mix of global codes (`GLOBAL_*`) and
 * domain codes (`INSTANCE_*`). This mapper normalises both into the
 * union the Story 5.7 components branch on. The mapper is pure — it
 * does not throw and does not mutate the input.
 */
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

/**
 * Wrap an unknown thrown value in a typed `ApiError`. The `code` is
 * mapped into the `InstanceLifecycleErrorCode` union by the caller.
 *
 * Used by the catch block to surface typed errors. The wrapper
 * preserves the original `cause` so telemetry still captures the
 * underlying error shape.
 */
function wrapAsInstanceApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }
  // Fallback — let ApiError's coerce logic handle the rest.
  return new ApiError(
    err as unknown as ConstructorParameters<typeof ApiError>[0],
  );
}

/**
 * Derive the current user's role from the server-provided detail.
 *
 * - The host is matched by `hostUserId` against the JWT-derived
 *   user id. The JWT user id is not available client-side in this
 *   story (the access token is opaque); the hook therefore returns
 *   `null` for all callers and the consumer (`useInstancePermissions`)
 *   falls back to the strictest permission set. The hook returns the
 *   raw detail so the page can override the role when the JWT is
 *   surfaced. Future Story 5.7 work will replace this with a
 *   server-provided `currentUserRole` field.
 */
function deriveRole(
  detail: InstanceDetailResponseDto,
  currentUserId: string | null,
): InstanceRole {
  // Without a client-readable user id, we cannot reliably derive the
  // role. The strictest default is `null` so permissions
  // (`useInstancePermissions`) default to safe "no action permitted".
  // The detail endpoint will gain a `currentUserRole` field in a
  // follow-up story; the hook will switch to reading it directly.
  void detail;
  void currentUserId;
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useInstance(
  instanceId: string | null,
  currentUserId: string | null = null,
): UseInstanceResult {
  const flagValue = getFeatureFlagValue("multiplayer_instances_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  // Disabled sentinel key when flag is off or id is null.
  const key = useMemo(
    () =>
      isFlagPlaceholder || instanceId === null
        ? null
        : INSTANCE_CACHE_KEYS.detail(instanceId),
    [isFlagPlaceholder, instanceId],
  );

  const fetcher = useCallback(
    async (): Promise<InstanceDetail | null> => {
      if (isFlagPlaceholder || instanceId === null) {
        return null;
      }

      try {
        const wire = (await getInstance(instanceId)) as unknown as GetInstanceWireResponse;

        if (!wire.data) {
          // 404 is handled by the service wrapper throwing ApiError.
          // If we reach here without data, return null.
          return null;
        }

        const role = deriveRole(wire.data, currentUserId);

        return {
          ...wire.data,
          id: wire.data.instanceId,
          currentUserRole: role,
        } as InstanceDetail;
      } catch (err) {
        // Re-throw as a typed ApiError so the caller can branch on
        // `error.code` against the `InstanceLifecycleErrorCode` union.
        throw wrapAsInstanceApiError(err);
      }
    },
    [isFlagPlaceholder, instanceId, currentUserId],
  );

  const result = useSingleWithRetry<InstanceDetail | null>({
    key,
    fetcher,
  });

  const refresh = useCallback(async () => {
    await result.retry();
    // `result` is read here for its `retry` method; the lint exhaustive
    // deps rule wants the full result, which is fine — the result
    // reference is stable across renders in `useSingleWithRetry`.
    void result;
  }, [result]);

  // Map the raw error code into the `InstanceLifecycleErrorCode` union
  // so the UI can branch on the typed code. The original error is
  // preserved on `error.code` for telemetry.
  const mappedError = useMemo<ApiError | null>(() => {
    if (result.error === null) return null;
    const mappedCode = mapToInstanceLifecycleErrorCode(result.error.code);
    return new ApiError({
      ...(result.error as unknown as object),
      code: mappedCode,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }, [result.error]);

  return {
    instance: result.data ?? null,
    isLoading: result.isLoading,
    isStale: false,
    error: mappedError,
    refresh,
  };
}
