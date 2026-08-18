

'use client';

import { useCallback, useState } from 'react';

import { useUserBadges } from '../hooks';

import {
AchievementAdminEmptyState,
AchievementAdminErrorState,
AchievementAdminSkeleton,
RevokeBadgeDialog,
UserBadgeRow,
} from './';

import type { AdminUserBadgeDto } from '../achievement-admin-types';

export interface AchievementAdminBadgeListProps {

userId: string;
}

export function AchievementAdminBadgeList({
userId,
}: AchievementAdminBadgeListProps): React.ReactElement {
const { badges, isLoading, error, mutate } = useUserBadges(userId);

const [dialogOpen, setDialogOpen] = useState(false);
const [pendingRevokeBadgeId, setPendingRevokeBadgeId] = useState<string | null>(null);

const pendingBadge: AdminUserBadgeDto | undefined = badges.find(
(b) => (b as AdminUserBadgeDto).badgeId === pendingRevokeBadgeId,
  ) as AdminUserBadgeDto | undefined;

const handleRevoke = useCallback((badge: AdminUserBadgeDto) => {
setPendingRevokeBadgeId(badge.badgeId);
setDialogOpen(true);
  }, []);

const handleClose = useCallback(() => {
setDialogOpen(false);
setPendingRevokeBadgeId(null);
  }, []);

const handleRevoked = useCallback((_badgeId: string) => {

setDialogOpen(false);
setPendingRevokeBadgeId(null);
void mutate();
  }, [mutate]);

if (isLoading) {
return (
<section data-testid="badge-list-loading">
<AchievementAdminSkeleton />
</section>
    );
  }

if (error !== null) {
return (
<section data-testid="badge-list-error">
<AchievementAdminErrorState error={error} />
</section>
    );
  }

if (!isLoading && badges.length === 0) {
return (
<section data-testid="badge-list-empty">
<AchievementAdminEmptyState userId={userId} />
</section>
    );
  }

return (
<>
<section data-testid="badge-list">
<div className="space-y-2" data-testid="badge-list-rows">
{badges.map((badge) => (
<UserBadgeRow
key={(badge as AdminUserBadgeDto).badgeId}
userId={userId}
badge={badge as AdminUserBadgeDto}
isRemoving={
pendingRevokeBadgeId !== null &&
(badge as AdminUserBadgeDto).badgeId === pendingRevokeBadgeId
              }
onRevoke={handleRevoke}
            />
          ))}
</div>
</section>

{/* Revoke dialog */}
{dialogOpen && pendingBadge && (
<RevokeBadgeDialog
open={dialogOpen}
userId={userId}
badge={pendingBadge}
onClose={handleClose}
onRevoked={handleRevoked}
        />
      )}
</>
  );
}
