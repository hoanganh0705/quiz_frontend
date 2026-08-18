

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

const STATUS_LABELS: Record<string, string> = {
'': 'All statuses',
upcoming: 'Upcoming',
registration: 'Registration',
ongoing: 'Active',
finished: 'Finished',
cancelled: 'Cancelled',
};

export interface TournamentAdminListHandle {

requestCreate: () => void;
}

export interface TournamentAdminListProps {

useList?: () => ReturnType<typeof useTournamentAdminList>;

ItemComponent?: React.ComponentType<{
tournament: TournamentDto;
onEdit: (id: string) => void;
onDelete: (id: string) => void;
  }>;

EmptyComponent?: React.ComponentType<any>;

ErrorComponent?: React.ComponentType<any>;

SkeletonComponent?: React.ComponentType<Record<string, never>>;
}

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

const [createOpen, setCreateOpen] = useState(false);

const handleCreateSuccess = useCallback(() => {
setCreateOpen(false);
void mutate();
  }, [mutate]);

const handleCreateOpen = useCallback(() => {
setCreateOpen(true);
  }, []);

useImperativeHandle(ref, () => ({
requestCreate: handleCreateOpen,
  }), [handleCreateOpen]);

const [editTournamentId, setEditTournamentId] = useState<string | null>(null);

const handleEdit = useCallback((id: string) => {
setEditTournamentId(id);
setDeleteTournament(null);
  }, []);

const handleEditSuccess = useCallback(() => {
setEditTournamentId(null);
void mutate();
  }, [mutate]);

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
EmptyComponent: React.ComponentType<any>;
ErrorComponent: React.ComponentType<any>;
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
