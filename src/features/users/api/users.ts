/**
 * Users API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { getCurrentUser, updateMe, updateMySettings } from '@/features/users/wrappers/user.wrapper'
 */

import {
  getCurrentUser,
  updateMe,
  updateMySettings,
} from '@/features/users/wrappers/user.wrapper';
import type {
  CurrentUserResponse,
  EditProfileRequest,
  EditSettingsRequest,
} from '@/features/users/types';

export { getCurrentUser, updateMe, updateMySettings };
export type { CurrentUserResponse, EditProfileRequest, EditSettingsRequest };

// Backward-compatible aliases
export async function editProfile(payload: EditProfileRequest): Promise<CurrentUserResponse> {
  return updateMe(payload);
}

export async function editSettings(payload: EditSettingsRequest): Promise<CurrentUserResponse> {
  return updateMySettings(payload);
}
