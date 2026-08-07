/**
 * `TournamentAdminActionMenu` — the action menu rendered from
 * `TournamentAdminItem` (per-row) and the page header (page-level
 * "New tournament" affordance).
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D1.
 *
 * ## What this component renders
 *
 * A single trigger (three-dot button) that opens a dropdown of the
 * documented per-admin actions:
 *
 *   - **New tournament** (create) — page-header usage only.
 *   - **Edit** — per-row usage, gated on `tournament_update` AND
 *     `!isTournamentStartedForEdit(tournament)`.
 *   - **Delete** — per-row usage, gated on `tournament_delete`.
 *
 * When the corresponding permission is denied, the affected item
 * is hidden. When no item is allowed, the trigger renders a
 * disabled affordance (a stable, inert `<button>`) so the page
 * layout stays consistent regardless of the admin's role.
 *
 * When the supplied tournament's `status` is one of the
 * **edit-blocking** values (`ongoing | finished | cancelled` per
 * TKT-7.7.A1 §2.2), the **Edit** item is hidden even when
 * `tournament_update` is allowed — the destructive UI surface
 * (TKT-7.7.D3 / D4) renders the documented "cannot edit a
 * tournament that has started" notice on the rare race where the
 * form is opened against a now-started tournament.
 *
 * ## Gates (in evaluation order)
 *
 * 1. **Permission gate** — `usePermission('tournament_create' /
 *    'tournament_update' / 'tournament_delete')`. Items whose
 *    permission is denied are hidden.
 * 2. **Started-status gate** — for the **Edit** item only;
 *    hidden when `isTournamentStartedForEdit(tournament)` returns
 *    `true`.
 *
 * ## Cross-batch invariants
 *
 * - The menu never calls services, fetches data, or invokes hooks
 *   that fetch data. It is pure presentational; mutations live in
 *   the create / update / delete hooks (TKT-7.7.C2 / C3 / C4).
 * - The `onCreate` / `onEdit` / `onDelete` callbacks receive the
 *   tournament id when applicable and no arguments otherwise; the
 *   parent row decides whether to open the form or the dialog.
 * - Reversible / irreversible distinction drives a hint label on
 *   the destructive item; it does **not** open the typed-confirm
 *   dialog directly. Confirm-dialog selection is owned by the
 *   parent row (D4 consumer).
 */

'use client';

import { memo, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

import { usePermission } from '@/features/admin/hooks/usePermission';
import { PERMISSIONS } from '@/features/admin/permissions';

import { isTournamentStartedForEdit } from '../tournament-id-validation';
import type { TournamentDto } from '../admin-tournament-types';

// ─── Component props ────────────────────────────────────────────────────────

export interface TournamentAdminActionMenuProps {
  /**
   * The tournament row whose actions to surface. When `undefined`,
   * the menu renders in **page-header** mode and only offers
   * **New tournament** (gated on `tournament_create`).
   */
  tournament?: TournamentDto;
  /** Invoked when **New tournament** is selected (page-header mode). */
  onCreate?: () => void;
  /** Invoked when **Edit** is selected (per-row mode). */
  onEdit?: (id: string) => void;
  /** Invoked when **Delete** is selected (per-row mode). */
  onDelete?: (id: string) => void;
  /**
   * Optional className forwarded to the trigger button. Used by
   * the parent row to align the trigger inside a flex layout.
   */
  className?: string;
}

/**
 * The type-narrowed internal "menu item" vocabulary. Keeping this
 * local (not re-exported) means future Epic 7.7 additions don't
 * break consumers in the rest of the codebase.
 */
type AdminItem = 'create' | 'edit' | 'delete';

// ─── Component ──────────────────────────────────────────────────────────────

export const TournamentAdminActionMenu = memo(
  function TournamentAdminActionMenu({
    tournament,
    onCreate,
    onEdit,
    onDelete,
    className,
  }: TournamentAdminActionMenuProps): React.ReactElement {
    const createPermission = usePermission(PERMISSIONS.tournament_create);
    const updatePermission = usePermission(PERMISSIONS.tournament_update);
    const deletePermission = usePermission(PERMISSIONS.tournament_delete);

    // Page-header mode: no `tournament` row supplied.
    const isHeaderMode = tournament === undefined;

    const canCreate =
      !createPermission.isLoading && createPermission.hasPermission;
    const canEdit =
      !updatePermission.isLoading &&
      updatePermission.hasPermission &&
      tournament !== undefined &&
      !isTournamentStartedForEdit(tournament);
    const canDelete =
      !deletePermission.isLoading &&
      deletePermission.hasPermission &&
      tournament !== undefined;

    const handleSelect = useCallback(
      (item: AdminItem) => () => {
        if (item === 'create') {
          onCreate?.();
          return;
        }
        if (tournament === undefined) return;
        if (item === 'edit') onEdit?.(tournament.tournamentId);
        if (item === 'delete') onDelete?.(tournament.tournamentId);
      },
      [tournament, onCreate, onEdit, onDelete],
    );

    // ─── Loading state ──────────────────────────────────────────────
    const loading =
      createPermission.isLoading ||
      updatePermission.isLoading ||
      deletePermission.isLoading;

    if (loading) {
      const testIdSuffix =
        tournament?.tournamentId ?? 'header';
      return (
        <button
          type="button"
          className={[
            'flex h-8 w-8 cursor-progress items-center justify-center',
            'rounded-md text-muted-foreground',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Loading actions"
          data-testid={`tournament-admin-action-trigger-${testIdSuffix}`}
          disabled
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      );
    }

    // ─── Build the items list (declaration order matters for tests) ─
    const items: ReadonlyArray<{
      readonly id: AdminItem;
      readonly visible: boolean;
      readonly label: string;
      readonly hint?: string;
      readonly destructive?: boolean;
    }> = [
      ...(isHeaderMode
        ? [
            {
              id: 'create' as const,
              visible: canCreate,
              label: 'New tournament',
            },
          ]
        : []),
      ...(tournament !== undefined
        ? [
            {
              id: 'edit' as const,
              visible: canEdit,
              label: 'Edit',
            },
            {
              id: 'delete' as const,
              visible: canDelete,
              label: 'Delete',
              hint: 'This cannot be undone.',
              destructive: true,
            },
          ]
        : []),
    ];

    const visibleItems = items.filter((it) => it.visible);

    // ─── Permission denied: no items available ──────────────────────
    if (visibleItems.length === 0) {
      const testIdSuffix =
        tournament?.tournamentId ?? 'header';
      return (
        <button
          type="button"
          className={[
            'flex h-8 w-8 cursor-not-allowed items-center justify-center',
            'rounded-md text-muted-foreground/50',
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="No actions available"
          data-testid={`tournament-admin-action-empty-${testIdSuffix}`}
          disabled
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      );
    }

    // ─── Default: full action menu ─────────────────────────────────
    const menuTestIdSuffix = tournament?.tournamentId ?? 'header';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={[
              'flex h-8 w-8 items-center justify-center rounded-md',
              'text-muted-foreground transition-colors',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
              className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="Tournament actions"
            data-testid={`tournament-admin-action-trigger-${menuTestIdSuffix}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56"
          data-testid={`tournament-admin-action-menu-${menuTestIdSuffix}`}
        >
          {visibleItems.map((item, index) => {
            const previous = index > 0 ? visibleItems[index - 1] : null;
            const showSeparator =
              previous !== null &&
              (previous.destructive ?? false) !== (item.destructive ?? false);
            return (
              <div key={item.id}>
                {showSeparator ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  onClick={handleSelect(item.id)}
                  data-testid={`tournament-admin-action-${item.id}-${menuTestIdSuffix}`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm">{item.label}</span>
                    {item.hint ? (
                      <span className="text-[11px] text-muted-foreground">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);