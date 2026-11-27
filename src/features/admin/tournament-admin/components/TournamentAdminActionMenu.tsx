"use client";

import type React from "react";
import { memo, useCallback } from "react";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { usePermission } from "@/features/admin/hooks/usePermission";
import { PERMISSIONS } from "@/features/admin/permissions";
import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentDto } from "../admin-tournament-types";
import { isTournamentStartedForEdit } from "../tournament-id-validation";

export interface TournamentAdminActionMenuProps {
  tournament?: TournamentDto;

  onCreate?: () => void;

  onEdit?: (id: string) => void;

  onDelete?: (id: string) => void;

  className?: string;
}

type AdminItem = "create" | "edit" | "delete";

const ITEM_ICONS: Record<AdminItem, React.ComponentType<{ className?: string }>> = {
  create: Plus,
  edit: Pencil,
  delete: Trash2,
};

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
        if (item === "create") {
          onCreate?.();
          return;
        }
        if (tournament === undefined) return;
        if (item === "edit") onEdit?.(tournament.tournamentId);
        if (item === "delete") onDelete?.(tournament.tournamentId);
      },
      [tournament, onCreate, onEdit, onDelete],
    );

    const loading =
      createPermission.isLoading ||
      updatePermission.isLoading ||
      deletePermission.isLoading;

    const triggerLabel =
      tournament !== undefined
        ? `Actions for ${tournament.title}`
        : "Tournament actions";

    if (loading) {
      const testIdSuffix = tournament?.tournamentId ?? "header";
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 sm:h-9 sm:w-9 cursor-progress text-muted-foreground",
            className,
          )}
          aria-label="Loading actions"
          data-testid={`tournament-admin-action-trigger-${testIdSuffix}`}
          disabled
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      );
    }

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
              id: "create" as const,
              visible: canCreate,
              label: "New tournament",
            },
          ]
        : []),
      ...(tournament !== undefined
        ? [
            {
              id: "edit" as const,
              visible: canEdit,
              label: "Edit",
            },
            {
              id: "delete" as const,
              visible: canDelete,
              label: "Delete",
              hint: "This cannot be undone.",
              destructive: true,
            },
          ]
        : []),
    ];

    const visibleItems = items.filter((it) => it.visible);

    if (visibleItems.length === 0) {
      const testIdSuffix = tournament?.tournamentId ?? "header";
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 sm:h-9 sm:w-9 cursor-not-allowed text-muted-foreground/50",
            className,
          )}
          aria-label="No actions available"
          data-testid={`tournament-admin-action-empty-${testIdSuffix}`}
          disabled
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      );
    }

    const menuTestIdSuffix = tournament?.tournamentId ?? "header";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground",
              className,
            )}
            aria-label={triggerLabel}
            data-testid={`tournament-admin-action-trigger-${menuTestIdSuffix}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
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
            const Icon = ITEM_ICONS[item.id];
            return (
              <div key={item.id}>
                {showSeparator ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  onClick={handleSelect(item.id)}
                  className={cn(
                    "items-start gap-2.5 py-2",
                    item.destructive &&
                      "text-destructive focus:text-destructive focus:bg-destructive/10",
                  )}
                  data-testid={`tournament-admin-action-${item.id}-${menuTestIdSuffix}`}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      item.destructive
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm leading-snug">{item.label}</span>
                    {item.hint ? (
                      <span
                        className={cn(
                          "text-xs",
                          item.destructive
                            ? "text-destructive/80"
                            : "text-muted-foreground",
                        )}
                      >
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
