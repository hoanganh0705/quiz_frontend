/**
 * Instances wrapper — wraps API calls for live quiz instances.
 * Uses the generated SDK from orval.
 */

import { getInstances } from '@/lib/api/generated/instances/instances';
import type {
  CreateInstanceDto,
} from '@/lib/api/generated/schemas';

export type {
  InstanceControllerCreateInstanceResult,
  InstanceControllerGetInstanceByIdResult,
  InstanceControllerJoinInstanceResult,
  InstanceControllerStartInstanceResult,
  InstanceControllerCloseInstanceResult,
  InstanceControllerGetLeaderboardResult,
} from '@/lib/api/generated/instances/instances';

export async function createInstance(params: CreateInstanceDto) {
  const sdk = getInstances();
  return sdk.instanceControllerCreateInstance(params);
}

export async function getInstance(id: string) {
  const sdk = getInstances();
  return sdk.instanceControllerGetInstanceById(id);
}

export async function joinInstance(id: string) {
  const sdk = getInstances();
  return sdk.instanceControllerJoinInstance(id);
}

export async function startInstance(id: string) {
  const sdk = getInstances();
  return sdk.instanceControllerStartInstance(id);
}

export async function closeInstance(id: string) {
  const sdk = getInstances();
  return sdk.instanceControllerCloseInstance(id);
}

export async function getInstanceLeaderboard(id: string) {
  const sdk = getInstances();
  return sdk.instanceControllerGetLeaderboard(id);
}
