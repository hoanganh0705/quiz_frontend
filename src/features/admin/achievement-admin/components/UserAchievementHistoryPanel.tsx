'use client';

/**
 * `features/admin/achievement-admin/components/UserAchievementHistoryPanel.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D4.
 *
 * ## What this component owns
 *
 * - Render a user's achievement history with pagination and rate-limit awareness.
 * - Read from `useUserAchievementHistory`.
 * - Delegate rendering to Phase 5 `AchievementHistory` component.
 * - Hide **Load more** affordance when rate-limited.
 *
 * ## Rate-limit behaviour
 *
 * `rateLimitedUntil` is always `null` at this commit (A1 §2.5).
 * When the backend exposes rate-limit headers, the **Load more** button
 * is hidden and a friendly notice is rendered.
 *
 * ## Empty state
 *
 * Renders the Phase 5 empty-state copy when history is empty.
 */

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';

import { useUserAchievementHistory } from '../hooks';

// Default visible row count for the skeleton.
const SKELETON_COUNT = 5;

export interface UserAchievementHistoryPanelProps {
  /** The user whose history to display. */
  userId: string;
}

/**
 * Achievement history panel for the achievement admin surface.
 *
 * Renders the user's badge history with pagination and error / empty states.
 */
export function UserAchievementHistoryPanel({ userId }: UserAchievementHistoryPanelProps) {
  const {
    history,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    rateLimitedUntil,
    loadMore,
  } = useUserAchievementHistory(userId);

  const [isExpanded, setIsExpanded] = useState(true);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <section data-testid="history-panel-loading">
        <HistorySkeleton count={SKELETON_COUNT} />
      </section>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (error !== null) {
    return (
      <section data-testid="history-panel-error">
        <ErrorNotice error={error} />
      </section>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (!isLoading && history.length === 0) {
    return (
      <section data-testid="history-panel-empty">
        <EmptyHistoryState />
      </section>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────

  return (
    <section data-testid="history-panel">
      {/* Expand / collapse toggle. */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Badge history</h3>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={isExpanded}
          data-testid="history-expand-toggle"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* History list. */}
          <HistoryList items={history} />

          {/* Rate-limit notice. */}
          {rateLimitedUntil !== null && (
            <RateLimitNotice rateLimitedUntil={rateLimitedUntil} />
          )}

          {/* Load more. */}
          {hasMore && rateLimitedUntil === null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMore()}
              disabled={isLoadingMore}
              data-testid="history-load-more"
              className="mt-3"
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

// ─── History list ────────────────────────────────────────────────────────────

interface HistoryListProps {
  items: readonly {
    userBadgeId: string;
    badgeId: string;
    badgeName: string;
    badgeType: string;
    earnedAt: string;
    isActive: boolean;
    revokedAt: string | null;
    revocationReason: string | null;
  }[];
}

/** Simple list rendering the Phase 5 history entry fields. */
function HistoryList({ items }: HistoryListProps) {
  return (
    <ul className="space-y-2" data-testid="history-list">
      {items.map((item) => (
        <li
          key={item.userBadgeId}
          className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
          data-testid="history-item"
        >
          <div>
            <span className="font-medium">{item.badgeName}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {item.badgeType}
            </span>
            {item.revokedAt !== null && (
              <span className="ml-2 text-xs text-destructive">
                Revoked
              </span>
            )}
          </div>
          <time
            dateTime={item.earnedAt}
            className="text-xs text-muted-foreground"
          >
            {new Date(item.earnedAt).toLocaleDateString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HistorySkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2" data-testid="history-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-md bg-muted"
          data-testid="history-skeleton-row"
        />
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyHistoryState() {
  return (
    <div
      className="rounded-md border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground"
      data-testid="history-empty-state"
    >
      This user has no badge history yet.
    </div>
  );
}

// ─── Rate-limit notice ────────────────────────────────────────────────────────

function RateLimitNotice({ rateLimitedUntil }: { rateLimitedUntil: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 rounded-md border border-border bg-muted/50 p-3 text-sm"
      data-testid="history-rate-limit-notice"
    >
      History is refreshing — we&apos;ll load more soon.
      <span className="ml-2 font-mono text-xs text-muted-foreground">
        Resumes {new Date(rateLimitedUntil).toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Error notice ─────────────────────────────────────────────────────────────

function ErrorNotice({ error }: { error: ApiError }) {
  const copy = getUserCopy(error.code);

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
      data-testid="history-error-notice"
    >
      <p>{copy.body}</p>
      {error.requestId && (
        <p className="mt-1 font-mono text-xs">
          Request ID: {error.requestId}
        </p>
      )}
    </div>
  );
}
