/**
 * `TournamentAdminList` — paginated tournament list with filter + CRUD orchestration.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.E2.
 *
 * ## What this component owns
 *
 *   1. **List render** — maps `useTournamentAdminList().items` to
 *      `TournamentAdminItem` rows.
 *   2. **URL-owned filter** — reads `?status=` and `?q=` from the URL
 *      (via `useTournamentAdminList`) and surfaces a status dropdown +
 *      search input that calls `setFilter`.
 *   3. **Create / edit / delete dialog state** — three pieces of modal
 *      open/id state; opened by `TournamentAdminActionMenu` callbacks
 *      from the row and by `requestCreate()` from the page header via ref.
 *   4. **SWR revalidation** — each dialog's `onSuccess` calls
 *      `mutate()` so the list reflects the mutation immediately.
 *
 * ## Ref API for page-header create dialog
 *
 * The component uses `forwardRef` to expose `requestCreate()` to the
 * parent page header. This lets the page open the dialog without
 * lifting dialog state up to the page.
 *
 * ## Testability
 *
 * All child components and the list hook are accepted as optional props
 * with sensible defaults. Tests can override them to avoid deep module
 * mocking.
 */

'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';

import { Search } from 'lucide-react';

import {
  useTournamentAdminList,
  TOURNAMENT_ADMIN_STATUS_VALUES,
} from '../hooks/useTournamentAdminList';

import { TournamentAdminItem } from './TournamentAdminItem';
import { TournamentAdminEmptyState } from './TournamentAdminEmptyState';
import { TournamentAdminErrorState } from './TournamentAdminErrorState';
import { TournamentAdminSkeleton } from './TournamentAdminSkeleton';
import { TournamentCreateForm } from './TournamentCreateForm';
import { TournamentEditForm } from './TournamentEditForm';
import { TournamentDeleteDialog } from './TournamentDeleteDialog';

import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  TournamentAdminFilters,
  type TournamentDto,
} from '../admin-tournament-types';

// ─── Status label map ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  '': 'All statuses',
  upcoming: 'Upcoming',
  registration: 'Registration',
  ongoing: 'Active',
  finished: 'Finished',
  cancelled: 'Cancelled',
};

// ─── Ref API ─────────────────────────────────────────────────────────────────

export interface TournamentAdminListHandle {
  /** Open the create tournament dialog from the page header. */
  requestCreate: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TournamentAdminListProps {
  /** Override the list hook for testing. Defaults to `useTournamentAdminList`. */
  useList?: () => ReturnType<typeof useTournamentAdminList>;

  /** Override the row component for testing. Defaults to `TournamentAdminItem`. */
  ItemComponent?: React.ComponentType<{
    tournament: TournamentDto;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }>;

  /** Override the empty state component for testing. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmptyComponent?: React.ComponentType<any>;

  /** Override the error state component for testing. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ErrorComponent?: React.ComponentType<any>;

  /** Override the skeleton component for testing. */
  SkeletonComponent?: React.ComponentType<Record<string, never>>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TournamentAdminList = forwardRef<
  TournamentAdminListHandle,
  TournamentAdminListProps
>(function TournamentAdminList(
  {
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
    error,
    mutate,
    filter,
    setFilter,
  } = useList();

  // ─── Create dialog ────────────────────────────────────────────────────────

  const [createOpen, setCreateOpen] = useState(false);

  const handleCreateSuccess = useCallback(() => {
    setCreateOpen(false);
    void mutate();
  }, [mutate]);

  const handleCreateOpen = useCallback(() => {
    setCreateOpen(true);
  }, []);

  // Expose `requestCreate` to the parent page header.
  useImperativeHandle(ref, () => ({
    requestCreate: handleCreateOpen,
  }), [handleCreateOpen]);

  // ─── Edit dialog ──────────────────────────────────────────────────────────

  const [editTournamentId, setEditTournamentId] = useState<string | null>(null);

  const handleEdit = useCallback((id: string) => {
    setEditTournamentId(id);
    setDeleteTournament(null);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditTournamentId(null);
    void mutate();
  }, [mutate]);

  // ─── Delete dialog ───────────────────────────────────────────────────────

  const [deleteTournament, setDeleteTournament] = useState<TournamentDto | null>(
    null,
  );

  const handleDelete = useCallback(
    (id: string) => {
      const tournament = items.find((t) => t.tournamentId === id) ?? null;
      setDeleteTournament(tournament);
      setEditTournamentId(null);
    },
    [items],
  );

  const handleDeleteClose = useCallback(() => {
    setDeleteTournament(null);
    void mutate();
  }, [mutate]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4" data-testid="tournament-admin-list">
      {/* Filter bar */}
      <FilterBar filter={filter} onFilterChange={setFilter} />

      {/* Dialogs (conditionally mounted) */}
      {createOpen && (
        <TournamentCreateForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateOpen(false)}
        />
      )}

      {editTournamentId !== null && (
        <TournamentEditForm
          tournamentId={editTournamentId}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditTournamentId(null)}
        />
      )}

      {deleteTournament !== null && (
        <TournamentDeleteDialog
          open
          tournament={deleteTournament}
          onClose={handleDeleteClose}
        />
      )}

      {/* List states */}
      <ListBody
        items={items}
        isLoading={isLoading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
        ItemComponent={ItemComponent}
        EmptyComponent={EmptyComponent}
        ErrorComponent={ErrorComponent}
        SkeletonComponent={SkeletonComponent}
      />
    </div>
  );
});

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  filter: Pick<TournamentAdminFilters, 'status' | 'search'>;
  onFilterChange: (
    next: Pick<TournamentAdminFilters, 'status' | 'search'>,
  ) => void;
}

function FilterBar({
  filter,
  onFilterChange,
}: FilterBarProps): React.ReactElement {
  // Radix UI SelectItem cannot use empty string as value. Use
  // '__all__' as the UI sentinel and translate to/from the hook's
  // `undefined` (which maps to URL ?status= being absent = "all").
  const statusValue = filter.status ?? '__all__';

  const handleStatusChange = useCallback(
    (raw: string) => {
      onFilterChange({
        status:
          raw === '__all__' ? undefined : (raw as TournamentAdminFilters['status']),
        search: filter.search,
      });
    },
    [filter.search, onFilterChange],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ status: filter.status, search: e.target.value });
    },
    [filter.status, onFilterChange],
  );

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      data-testid="tournament-admin-list-filters"
    >
      {/* Status dropdown */}
      <Select value={statusValue} onValueChange={handleStatusChange}>
        <SelectTrigger
          className="w-full sm:w-44"
          data-testid="tournament-admin-filter-status"
        >
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {/* Map the hook's status values to Radix SelectItem values.
              '__all__' is the UI sentinel for "all statuses". */}
          {TOURNAMENT_ADMIN_STATUS_VALUES.map((s) => {
            const selectValue = s === '' ? '__all__' : s;
            return (
              <SelectItem key={s} value={selectValue}>
                {STATUS_LABELS[s] ?? s}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Search input */}
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search by title…"
          value={filter.search}
          onChange={handleSearchChange}
          className="pl-9"
          data-testid="tournament-admin-filter-search"
        />
      </div>
    </div>
  );
}

// ─── List body ───────────────────────────────────────────────────────────────

interface ListBodyProps {
  items: TournamentDto[];
  isLoading: boolean;
  error: unknown;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  ItemComponent: React.ComponentType<{
    tournament: TournamentDto;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }>;
  EmptyComponent: React.ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ErrorComponent: React.ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  SkeletonComponent: React.ComponentType<Record<string, never>>;
}

function ListBody({
  items,
  isLoading,
  error,
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
    return (
      <ErrorComponent
        error={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyComponent
        filter={{
          status: undefined,
          search: '',
        }}
      />
    );
  }

  return (
    <div
      className="space-y-2"
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
