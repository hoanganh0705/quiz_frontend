/**
 * Users wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 *
 * SDK access goes through `@/lib/api` (the barrel from TKT-1.2.1.1).
 * This file is itself inside the Epic 1.2 exempt glob (it's a wrapper,
 * not a feature), but it follows the barrel convention anyway for
 * consistency with the rest of the codebase.
 */

import { getUsers } from '@/lib/api';
import type {
  UpdateMeDto,
  UpdateMeSettingsDto,
} from '@/lib/api/generated/schemas';

export type {
  UserControllerMeResult,
  UserControllerUpdateMeResult,
  UserControllerUpdateMeSettingsResult,
} from '@/lib/api/generated/users/users';

export async function getCurrentUser() {
  const sdk = getUsers();
  return sdk.userControllerMe();
}

export async function updateMe(params: UpdateMeDto) {
  const sdk = getUsers();
  return sdk.userControllerUpdateMe(params);
}

export async function updateMySettings(params: UpdateMeSettingsDto) {
  const sdk = getUsers();
  return sdk.userControllerUpdateMeSettings(params);
}