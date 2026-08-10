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

/**
 * Fetch the current user profile from `GET /users/me`.
 * Returns the `UserMeResponseDto` directly.
 *
 * ## Envelope contract
 *
 * The Axios response interceptor in `lib/api/core/custom-instance.ts`
 * does NOT unwrap the backend's `{ data, meta }` envelope — the
 * generated SDK types (`UserControllerMe200 = WrappedDto & { data?:
 * UserMeResponseDto }`) and every other read-side call site that
 * reads `result.data` directly expect the wrapped shape, so the
 * interceptor passes the wire response through unmodified. The
 * generated SDK therefore returns the wrapped envelope; this
 * function unwraps it by reading `.data` (and throws if the
 * envelope is missing the inner payload, which would indicate a
 * backend contract change).
 *
 * Mirrors `fetchCurrentUserIdentity()` in
 * `features/auth/hooks/use-auth.ts`, which is the canonical pattern
 * for wrapped-SDK consumers.
 *
 * @see features/auth/hooks/use-auth.ts — same shape.
 */
export async function getCurrentUser(): Promise<UserMeResponseDto> {
  const sdk = getUsers();
  const result = await sdk.userControllerMe();
  if (!result || (result as { data?: unknown }).data === undefined) {
    throw new Error('No data returned from /users/me');
  }
  return (result as { data: UserMeResponseDto }).data;
}