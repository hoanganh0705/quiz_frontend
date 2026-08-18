

'use client';

import { memo } from 'react';
import { MoreHorizontal } from 'lucide-react';

import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

import { usePermission } from '@/features/admin/hooks/usePermission';
import { isSelfRevokeAttempt } from '../validation';

import type { AdminUserBadgeDto } from '../achievement-admin-types';

export interface UserBadgeRowProps {

userId: string;

badge: AdminUserBadgeDto;

isRemoving?: boolean;

onRevoke: (badge: AdminUserBadgeDto) => void;
}

function formatEarnedAt(iso: string | null): string {
if (!iso) return '—';
return new Intl.DateTimeFormat('en-GB', {
day: '2-digit',
month: 'short',
year: 'numeric',
  }).format(new Date(iso));
}

export const UserBadgeRow = memo(
function UserBadgeRow({
userId,
badge,
isRemoving = false,
onRevoke,
  }: UserBadgeRowProps): React.ReactElement {
const permission = usePermission('achievement_badge_revoke');

const isLoading = permission.isLoading;
const hasPermission =
!permission.isLoading && permission.hasPermission;

const selfRevoke = isSelfRevokeAttempt(null, userId);
const canRevoke = hasPermission && !selfRevoke;

const handleRevoke = () => {
onRevoke(badge);
    };

if (isLoading) {
return (
<div
className="flex items-center gap-3 rounded-md border p-3"
data-testid="user-badge-row-loading"
aria-label="Loading badge row"
        >
<div className="h-4 w-32 animate-pulse rounded bg-muted" />
<div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-muted" />
</div>
      );
    }

if (isRemoving) {
return (
<div
className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
data-testid="user-badge-row-removing"
aria-live="polite"
aria-label={`Removing ${badge.badgeName ?? 'badge'}…`}
        >
<span className="text-sm font-medium">{badge.badgeName}</span>
<span className="ml-auto text-xs text-muted-foreground animate-pulse">
Removing…
          </span>
</div>
      );
    }

return (
<div
className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
data-testid="user-badge-row"
data-badge-id={badge.badgeId}
      >
{/* Badge name */}
<span
className="flex-1 truncate text-sm font-medium"
data-testid="user-badge-row-name"
        >
{badge.badgeName}
</span>

{/* Rarity pill */}
{badge.rarity && (
<span
className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium uppercase"
data-testid="user-badge-row-rarity"
          >
{badge.rarity}
</span>
        )}

{/* Earned-at */}
<span
className="shrink-0 text-xs text-muted-foreground"
data-testid="user-badge-row-earned-at"
title={badge.earnedAt ?? undefined}
        >
{formatEarnedAt(badge.earnedAt ?? null)}
</span>

{/* Actions menu */}
<div className="shrink-0">
{canRevoke ? (
<DropdownMenu>
<DropdownMenuTrigger asChild>
<button
type="button"
className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
aria-label="Badge actions"
data-testid="user-badge-row-action-trigger"
                >
<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
</button>
</DropdownMenuTrigger>

<DropdownMenuContent align="end" className="w-48">
<DropdownMenuItem
onClick={handleRevoke}
data-testid="user-badge-row-revoke-action"
className="text-destructive focus:text-destructive"
                >
<span className="flex flex-col gap-0.5">
<span className="text-sm">Revoke</span>
<span className="text-[11px] font-normal text-muted-foreground">
This cannot be undone.
                    </span>
</span>
</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
          ) : (

<button
type="button"
className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/50"
aria-label="No actions available"
data-testid="user-badge-row-no-actions"
disabled
            >
<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
</button>
          )}
</div>
</div>
    );
  },
);
