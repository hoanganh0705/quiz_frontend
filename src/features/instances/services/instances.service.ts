import * as Sentry from "@sentry/nextjs";

import { getInstances, unwrapEnvelope } from "@/lib/api";
import { orvalCustomInstance } from "@/lib/api/core/custom-instance";

import type {
  CancelCountdownResult,
  CloseInstanceResult,
  CreateInstanceResult,
  GetInstanceByIdResult,
  GetInstanceLeaderboardResult,
  JoinInstanceResult,
  ListInstancePlayersResult,
  ListInstancesResult,
  StartCountdownResult,
  StartInstanceResult,
} from "@/lib/api/generated/instances/instances";
import type {
  CreateInstanceDto,
  ListInstancePlayersParams,
  ListInstancesParams,
  StartCountdownDto,
} from "@/lib/api/generated/schemas";

export async function listInstances(
  params?: ListInstancesParams,
): Promise<ListInstancesResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: "instances.listInstances",
  });
  const response = await getInstances().listInstances(params);
  return unwrapEnvelope(
    response,
    "List instances response missing data envelope",
  );
}

export async function getInstance(
  id: string,
): Promise<GetInstanceByIdResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.getInstance(${id})`,
  });
  const response = await getInstances().getInstanceById(id);
  const instance = unwrapEnvelope(
    response,
    "Get instance response missing data envelope",
  );
  const serverTimestamp = (
    response as unknown as { meta?: { timestamp?: string } }
  ).meta?.timestamp;
  return serverTimestamp
    ? ({ ...instance, serverTimestamp } as GetInstanceByIdResult["data"])
    : instance;
}

export async function getInstanceLeaderboard(
  id: string,
): Promise<GetInstanceLeaderboardResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.getInstanceLeaderboard(${id})`,
  });
  const response = await getInstances().getInstanceLeaderboard(id);
  return unwrapEnvelope(
    response,
    "Instance leaderboard response missing data envelope",
  );
}

export async function listInstancePlayers(
  id: string,
  params?: ListInstancePlayersParams,
): Promise<ListInstancePlayersResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.listInstancePlayers(${id})`,
  });
  const response = await getInstances().listInstancePlayers(id, params);
  return unwrapEnvelope(
    response,
    "List instance players response missing data envelope",
  );
}

export async function createInstance(
  params: CreateInstanceDto,
): Promise<CreateInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: "instances.createInstance",
  });
  const response = await getInstances().createInstance(params);
  return unwrapEnvelope(
    response,
    "Create instance response missing data envelope",
  );
}

export async function joinInstance(
  id: string,
): Promise<JoinInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.joinInstance(${id})`,
  });
  const response = await getInstances().joinInstance(id);
  return unwrapEnvelope(
    response,
    "Join instance response missing data envelope",
  );
}

export async function startInstance(
  id: string,
): Promise<StartInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.startInstance(${id})`,
  });
  const response = await getInstances().startInstance(id);
  return unwrapEnvelope(
    response,
    "Start instance response missing data envelope",
  );
}

export async function closeInstance(
  id: string,
): Promise<CloseInstanceResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.closeInstance(${id})`,
  });
  const response = await getInstances().closeInstance(id);
  return unwrapEnvelope(
    response,
    "Close instance response missing data envelope",
  );
}

export async function startCountdown(
  id: string,
  params: StartCountdownDto,
): Promise<StartCountdownResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.startCountdown(${id})`,
  });
  const response = await getInstances().startCountdown(id, params);
  return unwrapEnvelope(
    response,
    "Start countdown response missing data envelope",
  );
}

export async function cancelCountdown(
  id: string,
): Promise<CancelCountdownResult["data"]> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.cancelCountdown(${id})`,
  });
  const response = await getInstances().cancelCountdown(id);
  return unwrapEnvelope(
    response,
    "Cancel countdown response missing data envelope",
  );
}

export async function leaveInstance(
  id: string,
): Promise<{ message: string }> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.leaveInstance(${id})`,
  });
  const wire = await orvalCustomInstance<{
    data?: { message: string };
  }>({
    url: `/api/v1/instances/${id}/leave`,
    method: "POST",
  });
  return wire?.data ?? { message: "Left instance successfully" };
}

export async function finishInstancePlayer(
  id: string,
  attemptId?: string | null,
): Promise<{ marked: boolean; allFinished: boolean; status: string }> {
  Sentry.addBreadcrumb({
    category: "instances:service",
    message: `instances.finishInstancePlayer(${id})`,
  });
  const wire = await orvalCustomInstance<{
    data?: { marked: boolean; allFinished: boolean; status: string };
  }>({
    url: `/api/v1/instances/${id}/finish-player`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: attemptId ? { attemptId } : {},
  });
  return (
    wire?.data ?? { marked: true, allFinished: false, status: "running" }
  );
}
