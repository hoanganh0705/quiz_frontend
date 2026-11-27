"use client";

import type React from "react";

import { Plus, SearchX, Trophy } from "lucide-react";

import { Button } from "@/components/ui/Button";

import type { TournamentAdminFilters } from "../admin-tournament-types";

export interface TournamentAdminEmptyStateProps {
  filter: Pick<TournamentAdminFilters, "status" | "search">;

  onClearFilter?: () => void;

  onCreate?: () => void;
}

function isFiltered(
  filter: Pick<TournamentAdminFilters, "status" | "search">,
): boolean {
  return (filter.status?.length ?? 0) > 0 || filter.search.trim().length > 0;
}

export function TournamentAdminEmptyState({
  filter,
  onClearFilter,
  onCreate,
}: TournamentAdminEmptyStateProps): React.ReactElement {
  if (isFiltered(filter)) {
    return (
      <div
        className="flex flex-col items-center justify-center px-6 py-14 text-center"
        data-testid="tournament-admin-empty-filtered"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <SearchX className="h-5 w-5" aria-hidden="true" />
        </div>
        <p
          className="mb-1 text-sm font-medium text-foreground"
          data-testid="tournament-admin-empty-filtered-title"
        >
          No tournaments match your filter
        </p>
        <p
          className="mb-4 text-xs text-muted-foreground"
          data-testid="tournament-admin-empty-filtered-body"
        >
          Try adjusting your search or status filter.
        </p>
        {onClearFilter ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-9"
            onClick={onClearFilter}
            data-testid="tournament-admin-empty-filtered-clear"
          >
            Clear filter
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
      data-testid="tournament-admin-empty"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Trophy className="h-5 w-5" aria-hidden="true" />
      </div>
      <p
        className="mb-1 text-sm font-medium text-foreground"
        data-testid="tournament-admin-empty-title"
      >
        No tournaments yet
      </p>
      <p
        className="mb-4 text-xs text-muted-foreground"
        data-testid="tournament-admin-empty-body"
      >
        Create your first tournament to get started.
      </p>
      {onCreate ? (
        <Button
          type="button"
          className="h-10 sm:h-9 gap-2"
          onClick={onCreate}
          data-testid="tournament-admin-empty-create"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New tournament
        </Button>
      ) : null}
    </div>
  );
}
