/**
 * TODO: Hand-edited — regenerate via `pnpm orval` once the backend is
 * running with the Phase 3/4 decorators present.
 *
 * Migration scope (Phase 5/6): the legacy `avatarUrl` field is
 * removed; `avatarPublicId` is the new source of truth for the
 * user's avatar. The backend's `UserApplicationService.updateProfile`
 * rejects cross-user `avatarPublicId` patches with 403
 * `ASSET_NOT_OWNED`.
 */

export interface UpdateMeDto {
  displayName?: string | null;
  bio?: string | null;
  avatarPublicId?: string | null;
}
