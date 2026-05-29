/**
 * Users wrapper — wraps API calls with the custom API client.
 */

import { customInstance } from '@/lib/api/core/custom-instance';
import type {
  UserMeResponseDto,
  UpdateMeDto,
  UpdateMeSettingsDto,
} from '@/features/users/types';

export async function getCurrentUser(): Promise<UserMeResponseDto> {
  const response = await customInstance.get<UserMeResponseDto>(
    '/users/me'
  );
  return response.data;
}

export async function updateMe(params: UpdateMeDto): Promise<UserMeResponseDto> {
  const response = await customInstance.patch<UserMeResponseDto>(
    '/users/me',
    params
  );
  return response.data;
}

export async function updateMySettings(
  params: UpdateMeSettingsDto
): Promise<UserMeResponseDto> {
  const response = await customInstance.patch<UserMeResponseDto>(
    '/users/me/settings',
    params
  );
  return response.data;
}
