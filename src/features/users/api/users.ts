import { apiClient } from '@/shared/lib/api/client'
import type {
  CurrentUserResponse,
  EditProfileRequest,
  EditSettingsRequest
} from '@/features/users/types'

export async function getCurrentUser() {
  const response = await apiClient.get<CurrentUserResponse>('/users/me')
  return response.data
}

export async function editProfile(payload: EditProfileRequest) {
  const response = await apiClient.patch<CurrentUserResponse>('/users/me', payload)
  return response.data
}

export async function editSettings(payload: EditSettingsRequest) {
  const response = await apiClient.patch<CurrentUserResponse>('/users/me/settings', payload)
  return response.data
}
