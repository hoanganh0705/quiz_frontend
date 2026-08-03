/**
 * `users.service.ts` — Phase 4 me-write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F6.
 *
 * ## Scope: write paths only
 *
 * Per TKT-4.1.F6 acceptance criterion 2: read endpoints are NOT
 * duplicated in this file. They already live in
 * `features/users/wrappers/user.wrapper.ts` (Phase 2 — `getCurrentUser`).
 * This service exports only the two Phase 4 write endpoints:
 *
 *   - `PATCH /api/v1/users/me`        — `updateMyProfile`
 *   - `PATCH /api/v1/users/me/settings` — `updateMySettings`
 *
 * Plus the profile-scoped broadcast emitter (`emitProfileUpdated`)
 * used by the cross-tab invalidation surface.
 *
 * ## Cross-tab broadcasts
 *
 * Profile mutations emit `profile/updated` on the `profile` broadcast
 * channel (TKT-4.1.B2). The hook layer (TKT-4.1.E2) calls
 * `broadcastProfileUpdated` on success; this service is a typed
 * pass-through.
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see profile-broadcast-channel — the cross-tab channel.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
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

export async function updateMyProfile(payload: UpdateMeDto) {
  const sdk = getUsers();
  return sdk.userControllerUpdateMe(payload);
}

export async function updateMySettings(payload: UpdateMeSettingsDto) {
  const sdk = getUsers();
  return sdk.userControllerUpdateMeSettings(payload);
}