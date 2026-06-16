/**
 * Users wrapper — wraps API calls with the custom API client.
 * Uses the generated SDK from orval.
 */

import { getUsers } from '@/lib/api/generated/users/users';
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
