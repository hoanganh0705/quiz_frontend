

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

export async function updateMyProfile(payload: UpdateMeDto) {
const sdk = getUsers();
return sdk.userControllerUpdateMe(payload);
}

export async function updateMySettings(payload: UpdateMeSettingsDto) {
const sdk = getUsers();
return sdk.userControllerUpdateMeSettings(payload);
}