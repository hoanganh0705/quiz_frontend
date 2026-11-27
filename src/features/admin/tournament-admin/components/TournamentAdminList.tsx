"use client";

import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

import { CheckCircle2, Loader2, RefreshCw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { ApiError } from "@/lib/api/core/ApiError";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  TournamentAdminFilters,
  TournamentDto,
} from "../admin-tournament-types";
import {
  TOURNAMENT_ADMIN_STATUS_VALUES,
  useTournamentAdminList,
} from "../hooks/useTournamentAdminList";
import { TournamentAdminEmptyState } from "./TournamentAdminEmptyState";
import type { TournamentAdminEmptyStateProps } from "./TournamentAdminEmptyState";
import { TournamentAdminErrorState } from "./TournamentAdminErrorState";
import type { TournamentAdminErrorStateProps } from "./TournamentAdminErrorState";
import {
  TOURNAMENT_TABLE_GRID_CLASS,
  TournamentAdminItem,
} from "./TournamentAdminItem";
import { TournamentAdminSkeleton } from "./TournamentAdminSkeleton";
import { TournamentCreateForm } from "./TournamentCreateForm";
import { TournamentDeleteDialog } from "./TournamentDeleteDialog";
import { TournamentEditForm } from "./TournamentEditForm";

const STATUS_LABELS: Record<string, string> = {
  "": "All statuses",
  upcoming: "Upcoming",
  registration: "Registration",
  ongoing: "Active",
  finished: "Finished",
  cancelled: "Cancelled",
};

interface StatusNotice {
  tone: "success" | "warning";
  message: string;
}

export interface TournamentAdminListHandle {
  requestCreate: () => void;
}

export interface TournamentAdminListProps {
  canCreate?: boolean;

  useList?: () => ReturnType<typeof useTournamentAdminList>;

  ItemComponent?: React.ComponentType<{
    tournament: TournamentDto;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }>;

  EmptyComponent?: React.ComponentType<TournamentAdminEmptyStateProps>;

  ErrorComponent?: React.ComponentType<TournamentAdminErrorStateProps>;

  SkeletonComponent?: React.ComponentType<Record<string, never>>;
}

export const TournamentAdminList = forwardRef<
  TournamentAdminListHandle,
  TournamentAdminListProps
>(function TournamentAdminList(
  {
    canCreate = false,
    useList = useTournamentAdminList,
    ItemComponent = TournamentAdminItem,
    EmptyComponent = TournamentAdminEmptyState,
    ErrorComponent = TournamentAdminErrorState,
    SkeletonComponent = TournamentAdminSkeleton,
  },
  ref,
): React.ReactElement {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    mutate,
    loadMore,
    filter,
    setFilter,
  } = useList();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTournamentId, setEditTournamentId] = useState<string | null>(null);
  const [deleteTournament, setDeleteTournament] =
    useState<TournamentDto | null>(null);
  const [notice, setNotice] = useState<StatusNotice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateOpen = useCallback(() => {
    setNotice(null);
    setCreateOpen(true);
  }, []);

  const handleCreateSuccess = useCallback(
    (created: TournamentDto) => {
      setCreateOpen(false);
      setNotice({
        tone: "success",
        message: `Created "${created.title}".`,
      });
      void mutate();
    },
    [mutate],
  );

  useImperativeHandle(
    ref,
    () => ({
      requestCreate: handleCreateOpen,
    }),
    [handleCreateOpen],
  );

  const handleEdit = useCallback((id: string) => {
    setNotice(null);
    setEditTournamentId(id);
    setDeleteTournament(null);
  }, []);

  const handleEditSuccess = useCallback(
    (updated: TournamentDto) => {
      setEditTournamentId(null);
      setNotice({
        tone: "success",
        message: `Saved changes to "${updated.title}".`,
      });
      void mutate();
    },
    [mutate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const tournament = items.find((t) => t.tournamentId === id) ?? null;
      setNotice(null);
      setDeleteTournament(tournament);
      setEditTournamentId(null);
    },
    [items],
  );

  const handleDeleteClose = useCallback(() => {
    setDeleteTournament(null);
    void mutate();
  }, [mutate]);

  const handleDeleteAlreadyStarted = useCallback(() => {
    setDeleteTournament(null);
    setNotice({
      tone: "warning",
      message:
        "This tournament has already started and can no longer be deleted.",
    });
    void mutate();
  }, [mutate]);

  const handleDeleteNotFound = useCallback(() => {
    setDeleteTournament(null);
    setNotice({
      tone: "warning",
      message:
        "This tournament was already removed. The list has been refreshed.",
    });
    void mutate();
  }, [mutate]);

  const handleClearFilter = useCallback(() => {
    setFilter({ status: undefined, search: "" });
  }, [setFilter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  }, [mutate]);

  const handleRetry = useCallback(() => {
    void mutate();
  }, [mutate]);

  const isFiltered =
    (filter.status?.length ?? 0) > 0 || filter.search.trim().length > 0;

  return (
    <div className="space-y-4" data-testid="tournament-admin-list">
      {notice !== null ? (
        <div
          role="status"
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            notice.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
          )}
          data-testid="tournament-admin-notice"
        >
          <span className="flex items-center gap-2 min-w-0">
            {notice.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : null}
            <span className="truncate">{notice.message}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 sm:h-8 sm:w-8 shrink-0 text-current",
              notice.tone === "success"
                ? "hover:bg-emerald-500/20"
                : "hover:bg-amber-500/20",
            )}
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {/* Create tournament modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New tournament</DialogTitle>
            <DialogDescription>
              Schedule a new tournament window, difficulty level, and optional
              participant cap.
            </DialogDescription>
          </DialogHeader>
          {createOpen ? (
            <TournamentCreateForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setCreateOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit tournament modal */}
      <Dialog
        open={editTournamentId !== null}
        onOpenChange={(open) => {
          if (!open) setEditTournamentId(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit tournament</DialogTitle>
            <DialogDescription>
              Update tournament details before the event starts.
            </DialogDescription>
          </DialogHeader>
          {editTournamentId !== null ? (
            <TournamentEditForm
              tournamentId={editTournamentId}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditTournamentId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete tournament modal */}
      {deleteTournament !== null ? (
        <TournamentDeleteDialog
          open
          tournament={deleteTournament}
          onClose={handleDeleteClose}
          onAlreadyStarted={handleDeleteAlreadyStarted}
          onNotFound={handleDeleteNotFound}
        />
      ) : null}

      {/* Unified toolbar + desktop column headers + list surface */}
      <section
        aria-label="Tournaments"
        className="rounded-xl border border-border bg-card overflow-hidden shadow-xs"
      >
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          itemCount={items.length}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          isFiltered={isFiltered}
          onClearFilter={handleClearFilter}
          onRefresh={() => {
            void handleRefresh();
          }}
        />

        {!isLoading && error === null && items.length > 0 ? (
          <div
            className={cn(
              "hidden border-b border-border bg-muted/10 px-4 py-2 text-xs font-medium text-muted-foreground",
              TOURNAMENT_TABLE_GRID_CLASS,
            )}
            aria-hidden="true"
          >
            <span>Tournament</span>
            <span>Schedule</span>
            <span>Difficulty</span>
            <span>Cap</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
        ) : null}

        <ListBody
          items={items}
          isLoading={isLoading}
          error={error}
          filter={filter}
          onClearFilter={handleClearFilter}
          onCreate={canCreate ? handleCreateOpen : undefined}
          onRetry={handleRetry}
          onEdit={handleEdit}
          onDelete={handleDelete}
          ItemComponent={ItemComponent}
          EmptyComponent={EmptyComponent}
          ErrorComponent={ErrorComponent}
          SkeletonComponent={SkeletonComponent}
        />

        {!isLoading && error === null && hasNextPage ? (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/10 px-4 py-3">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              Showing {items.length}{" "}
              {items.length === 1 ? "tournament" : "tournaments"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 sm:h-9 gap-2"
              onClick={loadMore}
              disabled={isLoadingMore}
              data-testid="tournament-admin-load-more"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading…
                </>
              ) : (
                "Load more tournaments"
              )}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
});

interface FilterBarProps {
  filter: Pick<TournamentAdminFilters, "status" | "search">;
  onFilterChange: (
    next: Pick<TournamentAdminFilters, "status" | "search">,
  ) => void;
  itemCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isFiltered: boolean;
  onClearFilter: () => void;
  onRefresh: () => void;
}

function FilterBar({
  filter,
  onFilterChange,
  itemCount,
  isLoading,
  isRefreshing,
  isFiltered,
  onClearFilter,
  onRefresh,
}: FilterBarProps): React.ReactElement {
  const statusValue = filter.status ?? "__all__";
  const [searchInput, setSearchInput] = useState(filter.search);
  const [prevFilterSearch, setPrevFilterSearch] = useState(filter.search);

  if (filter.search !== prevFilterSearch) {
    setPrevFilterSearch(filter.search);
    setSearchInput(filter.search);
  }

  useEffect(() => {
    if (searchInput === filter.search) return;
    const timer = window.setTimeout(() => {
      onFilterChange({ status: filter.status, search: searchInput });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, filter.search, filter.status, onFilterChange]);

  const handleStatusChange = useCallback(
    (raw: string) => {
      onFilterChange({
        status:
          raw === "__all__"
            ? undefined
            : (raw as TournamentAdminFilters["status"]),
        search: searchInput,
      });
    },
    [searchInput, onFilterChange],
  );

  const handleSearchClear = useCallback(() => {
    setSearchInput("");
    onFilterChange({ status: filter.status, search: "" });
  }, [filter.status, onFilterChange]);

  return (
    <div
      className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="tournament-admin-list-filters"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1 min-w-0">
        <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search tournaments by title"
            placeholder="Search by title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 sm:h-9 pl-9 pr-8 bg-background"
            data-testid="tournament-admin-filter-search"
          />
          {searchInput.length > 0 ? (
            <button
              type="button"
              onClick={handleSearchClear}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger
            className="h-10 sm:h-9 w-full sm:w-44 bg-background"
            aria-label="Filter tournaments by status"
            data-testid="tournament-admin-filter-status"
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {TOURNAMENT_ADMIN_STATUS_VALUES.map((s) => {
              const selectValue = s === "" ? "__all__" : s;
              return (
                <SelectItem key={s} value={selectValue}>
                  {STATUS_LABELS[s] ?? s}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end shrink-0">
        {!isLoading ? (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {itemCount}{" "}
            {isFiltered
              ? "matching"
              : itemCount === 1
                ? "tournament"
                : "tournaments"}
          </span>
        ) : null}
        {isFiltered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 sm:h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearFilter}
          >
            Reset
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh tournaments"
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );
}

interface ListBodyProps {
  items: TournamentDto[];
  isLoading: boolean;
  error: ApiError | null;
  filter: Pick<TournamentAdminFilters, "status" | "search">;
  onClearFilter: () => void;
  onCreate?: () => void;
  onRetry: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  ItemComponent: React.ComponentType<{
    tournament: TournamentDto;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }>;
  EmptyComponent: React.ComponentType<TournamentAdminEmptyStateProps>;
  ErrorComponent: React.ComponentType<TournamentAdminErrorStateProps>;
  SkeletonComponent: React.ComponentType<Record<string, never>>;
}

function ListBody({
  items,
  isLoading,
  error,
  filter,
  onClearFilter,
  onCreate,
  onRetry,
  onEdit,
  onDelete,
  ItemComponent,
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
}: ListBodyProps): React.ReactElement {
  if (isLoading) {
    return <SkeletonComponent />;
  }

  if (error !== null && error !== undefined) {
    return <ErrorComponent error={error} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyComponent
        filter={filter}
        onClearFilter={onClearFilter}
        onCreate={onCreate}
      />
    );
  }

  return (
    <div
      className="divide-y divide-border/60"
      data-testid="tournament-admin-list-items"
    >
      {items.map((tournament) => (
        <ItemComponent
          key={tournament.tournamentId}
          tournament={tournament}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
