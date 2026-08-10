/**
 * `instances.service.ts` — Live quiz instances service.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.F2.
 *
 * ## SDK naming
 *
 * The backend's `InstanceController` causes orval to strip the
 * `Controller` suffix from operation names — the SDK exposes
 * `createInstance`, `listInstances`, `getInstanceById`, `joinInstance`,
 * `startInstance`, `closeInstance`, `getInstanceLeaderboard` (bare
 * verbs, no `instanceController*` prefix). The wrapper preserves
 * the planning-intent verbs.
 *
 * ## Pattern
 *
 * Thin SDK pass-throughs with Sentry breadcrumbs and `data` envelope
 * unwrapping. Follows the same discipline as `tournaments.service.ts`:
 *
 *   - Pure forwarders — no side-effects, no cache mutations.
 *   - `ApiError` is propagated unchanged so callers can read `apiError.code`.
 *   - One Sentry breadcrumb per call.
 *   - If the SDK response is missing `data` (malformed), throw a
 *     `GLOBAL_INTERNAL_ERROR`.
 */

import * as Sentry from "@sentry/nextjs";

import { getInstances } from "@/lib/api";

import { ApiError } from "@/lib/api/core/ApiError";

import type {
  CreateInstanceDto,
  StartCountdownDto,
} from "@/lib/api/generated/schemas";

import type {
  ListInstancesResult,
  ListInstancePlayersResult,
  GetInstanceByIdResult,
  JoinInstanceResult,
  StartInstanceResult,
  CloseInstanceResult,
  StartCountdownResult,
  CancelCountdownResult,
  GetInstanceLeaderboardResult,
} from "@/lib/api/generated/instances/instances";

// ─── Reads ─────────────────────────────────────────────────────────────────

/**
 * `GET /api/v1/instances`
 *
 * Returns a paginated list of quiz instances.
 */
export async function listInstances(): Promise<ListInstancesResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "instances.listInstances",
  });
  const data = await getInstances().listInstances();
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "List instances response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/instances/:id`
 */
export async function getInstance(
  id: string,
): Promise<GetInstanceByIdResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.getInstance(${id})`,
  });
  const data = await getInstances().getInstanceById(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Get instance response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/instances/:id/leaderboard`
 */
export async function getInstanceLeaderboard(
  id: string,
): Promise<GetInstanceLeaderboardResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.getInstanceLeaderboard(${id})`,
  });
  const data = await getInstances().getInstanceLeaderboard(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Instance leaderboard response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `GET /api/v1/instances/:id/players`
 *
 * Returns the current players in an instance.
 */
export async function listInstancePlayers(
  id: string,
): Promise<ListInstancePlayersResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.listInstancePlayers(${id})`,
  });
  const data = await getInstances().listInstancePlayers(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "List instance players response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * `POST /api/v1/instances`
 */
export async function createInstance(
  params: CreateInstanceDto,
): Promise<import("@/lib/api/generated/instances/instances").CreateInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: "instances.createInstance",
  });
  const data = await getInstances().createInstance(params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Create instance response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/instances/:id/join`
 */
export async function joinInstance(
  id: string,
): Promise<JoinInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.joinInstance(${id})`,
  });
  const data = await getInstances().joinInstance(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Join instance response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/instances/:id/start`
 */
export async function startInstance(
  id: string,
): Promise<StartInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.startInstance(${id})`,
  });
  const data = await getInstances().startInstance(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Start instance response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/instances/:id/close`
 */
export async function closeInstance(
  id: string,
): Promise<CloseInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.closeInstance(${id})`,
  });
  const data = await getInstances().closeInstance(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Close instance response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/instances/:id/countdown`
 *
 * Starts the countdown timer before an instance begins.
 */
export async function startCountdown(
  id: string,
  params: StartCountdownDto,
): Promise<StartCountdownResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.startCountdown(${id})`,
  });
  const data = await getInstances().startCountdown(id, params);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Start countdown response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}

/**
 * `POST /api/v1/instances/:id/countdown/cancel`
 *
 * Cancels the countdown timer.
 */
export async function cancelCountdown(
  id: string,
): Promise<CancelCountdownResult["data"]> {
  Sentry.addBreadcrumb({
    category: "phase5:service",
    message: `instances.cancelCountdown(${id})`,
  });
  const data = await getInstances().cancelCountdown(id);
  if (!data.data) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Cancel countdown response missing data envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return data.data;
}
