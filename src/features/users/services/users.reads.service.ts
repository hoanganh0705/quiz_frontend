/**
 * `users.reads.service.ts` — User read-side service.
 *
 * Source epic:   Phase 2 — user store reads.
 * Source ticket: TKT-4.1.G-prep.
 *
 * Read endpoints for the users module. The write side lives in
 * `features/users/services/users.service.ts` (TKT-4.1.F6) and is
 * intentionally separate so the write-side service stays
 * scope-locked per F6 acceptance criterion 2 ("Read endpoints are
 * NOT duplicated").
 *
 * This file replaces `features/users/wrappers/user.wrapper.ts` for
 * the read path (`getCurrentUser`). The legacy wrapper also exported
 * `updateMe` / `updateMySettings`; those have been moved to
 * `users.service.ts` and re-exported from the legacy wrapper as
 * `@deprecated` shims (TKT-4.1.G1).
 */

import { getUsers } from '@/lib/api';
import type { UserMeResponseDto } from '@/lib/api/generated/schemas';

export type {
  UserControllerMeResult,
} from '@/lib/api/generated/users/users';

export async function getCurrentUser(): Promise<UserMeResponseDto> {
  const sdk = getUsers();
  const response = await sdk.userControllerMe();
  if (!response.data) {
    throw new Error('User not found');
  }
  return response.data;
}