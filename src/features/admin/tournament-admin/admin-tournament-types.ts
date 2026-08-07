/**
 * `admin-tournament-types.ts` — Local type surface for Story 7.7.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.B1.
 *
 * ## Purpose
 *
 * Single source of truth for the tournament-admin DTO surface. This
 * module **only re-exports** the canonical SDK and service types —
 * it does not redefine fields. The re-exports are pinned by the
 * generated SDK's schema (TKT-7.1.E7 wraps the SDK; the SDK is
 * regenerated against the backend's OpenAPI spec).
 *
 * ## Why aliases
 *
 * The regenerated SDK exports `CreateTournamentDto` and
 * `UpdateTournamentDto` (the backend's `CreateTournamentDto` and
 * `UpdateTournamentDto` stripped of the `Controller` suffix). Story 7.7
 * documents the input DTOs under the **admin-namespace** names
 * (`TournamentCreateDto`, `TournamentUpdateDto`) so the type names read
 * naturally at every admin call site. The aliases here let the admin
 * code use the documented names without a second re-export ceremony at
 * the call site.
 *
 * ## Cascade DTO
 *
 * `TournamentCascadeDto` is the local-only cascade shape for the
 * destructive delete confirmation. All three counts are **nullable**
 * because the backend has not yet confirmed whether
 * `TOURNAMENT_HAS_PARTICIPANTS` carries an embedded cascade payload
 * (TKT-7.7.A1 §2.4 verdict). The downstream hook (TKT-7.7.C6) handles
 * either shape.
 *
 * ## Filters
 *
 * `TournamentAdminFilters` is the documented admin-list filter shape.
 * The status union is aligned with the backend enum recorded in A1:
 * `upcoming | registration | ongoing | finished | cancelled`.
 *
 * ## Pagination
 *
 * The list uses **cursor-based** pagination (TKT-7.7.A1 §2.9 verdict),
 * inherited from Phase 5 (`TournamentListPage`). `TOURNAMENT_ADMIN_PAGE_SIZE`
 * is the per-page limit used by the admin list hook (TKT-7.7.C1).
 */

import type {
  CreateTournamentDto,
  TournamentControllerListTournaments200,
  UpdateTournamentDto,
} from '@/lib/api/generated/schemas';

// ─── Re-exports (typed aliases, not redefinitions) ──────────────────────────

/**
 * Re-export the canonical tournament DTO returned by every read /
 * write function. The actual type is owned by the service layer
 * (`TournamentDto = TournamentResponseDto`) so consumers can import
 * from this module without reaching into the service internals.
 */
export type { TournamentDto } from '@/features/admin/services/tournament-admin.service';

/**
 * Documented admin-namespace alias for the SDK's `CreateTournamentDto`.
 * The input shape for the create form (TKT-7.7.D1) and the create hook
 * (TKT-7.7.E1).
 */
export type TournamentCreateDto = CreateTournamentDto;

/**
 * Documented admin-namespace alias for the SDK's `UpdateTournamentDto`.
 * The input shape for the edit form (TKT-7.7.D2) and the update hook
 * (TKT-7.7.E2).
 */
export type TournamentUpdateDto = UpdateTournamentDto;

/**
 * The list response returned by `GET /tournaments` (Phase 5 wrapper).
 * The shape is `{ data: TournamentResponseDto[], meta: { pagination: PaginationMetaDto } }`
 * — the standard `WrappedPaginatedDto` envelope with the standard cursor
 * pagination metadata.
 */
export type TournamentListDto = TournamentControllerListTournaments200;

// ─── Cascade DTO (local) ────────────────────────────────────────────────────

/**
 * The cascade payload used by the destructive delete confirmation.
 *
 * All three counts are **nullable** because the backend has not yet
 * confirmed whether the delete response embeds the cascade scope
 * (TKT-7.7.A1 §2.4). The downstream hook (TKT-7.7.C6) handles either
 * shape (embedded, partial, or absent).
 *
 * When the backend confirms the embedded shape, the type narrows to
 * `Required<TournamentCascadeDto>` in TKT-7.7.H1 (the integration spec).
 */
export interface TournamentCascadeDto {
  /** Number of registered participants; `null` if not embedded. */
  participants: number | null;
  /** Number of rounds attached to the tournament; `null` if not embedded. */
  rounds: number | null;
  /** Number of leaderboard rows for the tournament; `null` if not embedded. */
  leaderboards: number | null;
  /**
   * `true` when the participant count has been truncated by an
   * upper-bound (e.g. the backend returns only the first 100). The
   * dialog renders "100+ participants" when this is `true`. Defaults
   * to `false` when not supplied.
   */
  hasMoreParticipants?: boolean;
}

// ─── Page size constant ────────────────────────────────────────────────────

/**
 * Default per-page limit used by the admin list hook (TKT-7.7.C1).
 * Pinned to 20 to match Phase 5's `TournamentParticipantsFilters.limit`
 * default and the documented "loading affordance budget" (so the SWR
 * cache key does not collide with the public list's defaults).
 */
export const TOURNAMENT_ADMIN_PAGE_SIZE = 20 as const;

// ─── Filter shape ──────────────────────────────────────────────────────────

/**
 * URL-syncable filter state for the admin tournament list.
 *
 * Mirrors Phase 5's `TournamentListFilters` shape so the admin list
 * can share the cursor-pagination contract with the public list. The
 * `cursor` field is preserved through filter changes so back/forward
 * navigation lands on the same page.
 */
export interface TournamentAdminFilters {
  /**
   * Status filter. The union is aligned with the documented
   * `TournamentStatus` values (A1 §2.2):
   * `upcoming | registration | ongoing | finished | cancelled`.
   * `undefined` means "all statuses".
   */
  status?:
    | 'upcoming'
    | 'registration'
    | 'ongoing'
    | 'finished'
    | 'cancelled';
  /** Free-text search. Empty string means no search filter. */
  search: string;
  /** Opaque pagination cursor. `undefined` means "first page". */
  cursor?: string;
  /** Optional per-page limit. Defaults to `TOURNAMENT_ADMIN_PAGE_SIZE`. */
  limit?: number;
}

/**
 * Default filter state for the admin tournament list page.
 *
 * Centralised so the URL-sync hook (TKT-7.7.C4), the page, and the
 * URL initializer agree on the empty filter shape.
 */
export const DEFAULT_TOURNAMENT_ADMIN_FILTERS: TournamentAdminFilters = {
  status: undefined,
  search: '',
  cursor: undefined,
  limit: TOURNAMENT_ADMIN_PAGE_SIZE,
} as const;

// ─── Re-export TournamentDto type alias for downstream hooks ────────────────
//
// The canonical type is re-exported at the top of this file. This
// trailing comment pins the export contract for downstream code
// (`features/admin/tournament-admin/{hooks,components}/**`) so the
// import surface is `from '@/features/admin/tournament-admin/admin-tournament-types'`
// only.