/**
 * `instances.service.ts` — Live quiz instances service.
 *
 * Source epic:   Story 3.x — Live quiz instances.
 * Source ticket: TKT-4.1.G-prep.
 *
 * Replaces `features/instances/wrappers/instance.wrapper.ts`.
 * One-for-one migration of the legacy surface.
 *
 * ## SDK naming (TKT-4.1.G-prep drift)
 *
 * The backend's `InstanceController` causes orval to strip the
 * `Controller` suffix from the operation names — the SDK exposes
 * `createInstance`, `listInstances`, `getInstanceById`, `joinInstance`,
 * `startInstance`, `closeInstance`, `getInstanceLeaderboard` (bare
 * verbs, no `instanceController*` prefix). The wrapper preserves the
 * planning-intent verbs (`createInstance`, `getInstance`, `joinInstance`,
 * `startInstance`, `closeInstance`, `getInstanceLeaderboard`).
 */

import { getInstances } from '@/lib/api';

import type { CreateInstanceDto } from '@/lib/api/generated/schemas';

export async function createInstance(params: CreateInstanceDto) {
  const sdk = getInstances();
  return sdk.createInstance(params);
}

export async function getInstance(id: string) {
  const sdk = getInstances();
  return sdk.getInstanceById(id);
}

export async function joinInstance(id: string) {
  const sdk = getInstances();
  return sdk.joinInstance(id);
}

export async function startInstance(id: string) {
  const sdk = getInstances();
  return sdk.startInstance(id);
}

export async function closeInstance(id: string) {
  const sdk = getInstances();
  return sdk.closeInstance(id);
}

export async function getInstanceLeaderboard(id: string) {
  const sdk = getInstances();
  return sdk.getInstanceLeaderboard(id);
}