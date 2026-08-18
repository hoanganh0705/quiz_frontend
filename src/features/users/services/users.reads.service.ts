

import { getUsers } from '@/lib/api';
import type { UserMeResponseDto } from '@/lib/api/generated/schemas';

export type {
UserControllerMeResult,
} from '@/lib/api/generated/users/users';

export async function getCurrentUser(): Promise<UserMeResponseDto> {
const sdk = getUsers();
const result = await sdk.userControllerMe();
if (!result || (result as { data?: unknown }).data === undefined) {
throw new Error('No data returned from /users/me');
  }
return (result as { data: UserMeResponseDto }).data;
}