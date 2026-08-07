/**
 * `AchievementAdminBadgeList` — the badge list with dialog orchestration.
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.E2.
 *
 * ## What this component owns
 *
 *   1. **List states** — loading (skeleton), empty, error, and success.
 *   2. **Dialog orchestration** — owns the revoke dialog open state and the
 *      `pendingRevokeBadgeId` (local "removing" state per row).
 *   3. **SWR revalidation** — on successful revoke the dialog closes and
 *      the row disappears on the next SWR cycle.
 *
 * ## No service calls
 *
 * This component is purely presentational. It delegates all mutations
 * to the parent's callbacks.
 */

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

// ─── Props ──────────────────────────────────────────────────────────────────

export interface AchievementAdminBadgeListProps {
  /** The user whose badges to display. */
  userId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AchievementAdminBadgeList({
  userId,
}: AchievementAdminBadgeListProps): React.ReactElement {
  const { badges, isLoading, error, mutate } = useUserBadges(userId);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRevokeBadgeId, setPendingRevokeBadgeId] = useState<string | null>(null);

  // The badge currently selected for revoke
  const pendingBadge: AdminUserBadgeDto | undefined = badges.find(
    (b) => (b as AdminUserBadgeDto).badgeId === pendingRevokeBadgeId,
  ) as AdminUserBadgeDto | undefined;

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  const handleRevoke = useCallback((badge: AdminUserBadgeDto) => {
    setPendingRevokeBadgeId(badge.badgeId ?? badge.id);
    setDialogOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setPendingRevokeBadgeId(null);
  }, []);

  const handleRevoked = useCallback((_badgeId: string) => {
    // SWR revalidation will refresh the list
    setDialogOpen(false);
    setPendingRevokeBadgeId(null);
    void mutate();
  }, [mutate]);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section data-testid="badge-list-loading">
        <AchievementAdminSkeleton />
      </section>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error !== null) {
    return (
      <section data-testid="badge-list-error">
        <AchievementAdminErrorState error={error} />
      </section>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!isLoading && badges.length === 0) {
    return (
      <section data-testid="badge-list-empty">
        <AchievementAdminEmptyState userId={userId} />
      </section>
    );
  }

  // ─── Success state ───────────────────────────────────────────────────────
  return (
    <>
      <section data-testid="badge-list">
        <div className="space-y-2" data-testid="badge-list-rows">
          {badges.map((badge) => (
            <UserBadgeRow
              key={(badge as AdminUserBadgeDto).badgeId ?? (badge as AdminUserBadgeDto).id}
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
