'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';

import { useUserAchievementHistory } from '../hooks';

const SKELETON_COUNT = 5;

export interface UserAchievementHistoryPanelProps {

userId: string;
}

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

if (isLoading) {
return (
<section data-testid="history-panel-loading">
<HistorySkeleton count={SKELETON_COUNT} />
</section>
    );
  }

if (error !== null) {
return (
<section data-testid="history-panel-error">
<ErrorNotice error={error} />
</section>
    );
  }

if (!isLoading && history.length === 0) {
return (
<section data-testid="history-panel-empty">
<EmptyHistoryState />
</section>
    );
  }

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
