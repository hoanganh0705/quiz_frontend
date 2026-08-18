

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

export interface TournamentAdminActionMenuProps {

tournament?: TournamentDto;

onCreate?: () => void;

onEdit?: (id: string) => void;

onDelete?: (id: string) => void;

className?: string;
}

type AdminItem = 'create' | 'edit' | 'delete';

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