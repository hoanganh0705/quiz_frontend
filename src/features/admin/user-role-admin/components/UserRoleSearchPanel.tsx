'use client';

import { memo, useState } from 'react';

import { Search, AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

import { useUserSearch } from '../hooks/useUserSearch';
import type { UserSearchResultDto } from '../user-role-admin-types';

interface UserRoleSearchResultProps {
user: UserSearchResultDto;
onSelect: (user: UserSearchResultDto) => void;
}

const UserRoleSearchResult = memo(function UserRoleSearchResult({
user,
onSelect,
}: UserRoleSearchResultProps): React.ReactElement {
const handleClick = () => {
onSelect(user);
  };

return (
<button
type="button"
onClick={handleClick}
className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
data-testid="user-role-search-result"
data-user-id={user.userId}
    >
{/* Avatar placeholder */}
<div
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"
aria-hidden="true"
      >
{user.avatar ? (

<img
src={user.avatar}
alt=""
className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
<span className="text-sm font-medium text-muted-foreground">
{user.username.charAt(0).toUpperCase()}
</span>
        )}
</div>

{/* User info */}
<div className="min-w-0 flex-1">
<p
className="truncate text-sm font-medium"
data-testid="user-role-search-result-username"
        >
{user.username}
</p>
<p
className="truncate text-xs text-muted-foreground"
data-testid="user-role-search-result-email"
        >
{user.email}
</p>
{user.currentRoles.length > 0 && (
<p
className="truncate text-xs text-muted-foreground"
data-testid="user-role-search-result-roles"
          >
Roles: {user.currentRoles.join(', ')}
</p>
        )}
</div>
</button>
  );
});

function SearchResultSkeleton(): React.ReactElement {
return (
<div
className="flex items-center gap-3 rounded-md border p-3"
data-testid="user-role-search-result-skeleton"
    >
<Skeleton className="h-10 w-10 rounded-full" />
<div className="flex-1 space-y-2">
<Skeleton className="h-4 w-24" />
<Skeleton className="h-3 w-32" />
</div>
</div>
  );
}

function EmptyState(): React.ReactElement {
return (
<div
className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center"
data-testid="user-role-search-empty-state"
    >
<Search
aria-hidden="true"
className="mb-2 h-8 w-8 text-muted-foreground"
      />
<p className="text-sm text-muted-foreground">
No users match your search.
      </p>
<p className="mt-1 text-xs text-muted-foreground">
Try a different search term.
      </p>
</div>
  );
}

interface ErrorStateProps {
onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps): React.ReactElement {
return (
<div
className="flex flex-col items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
data-testid="user-role-search-error-state"
    >
<AlertCircle
aria-hidden="true"
className="mb-2 h-8 w-8 text-destructive"
      />
<p className="text-sm font-medium text-destructive">
Failed to search users.
      </p>
<p className="mt-1 text-xs text-muted-foreground">
Please try again.
      </p>
<Button
type="button"
variant="outline"
size="sm"
onClick={onRetry}
className="mt-3"
data-testid="user-role-search-retry-button"
      >
<RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
Retry
      </Button>
</div>
  );
}

export interface UserRoleSearchPanelProps {

onUserSelect: (user: UserSearchResultDto) => void;
}

export function UserRoleSearchPanel({
onUserSelect,
}: UserRoleSearchPanelProps): React.ReactElement {
const [query, setQuery] = useState('');
const { users, isLoading, isStale, error, loadMore, hasMore } = useUserSearch(query);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
setQuery(e.target.value);
  };

const handleRetry = () => {

const currentQuery = query;
setQuery('');

setTimeout(() => setQuery(currentQuery), 0);
  };

return (
<div
className="flex flex-col gap-4"
data-testid="user-role-search-panel"
    >
{/* Search input */}
<div className="relative">
<Search
aria-hidden="true"
className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
<Input
type="search"
placeholder="Search users by username or email…"
value={query}
onChange={handleInputChange}
className="pl-10"
data-testid="user-role-search-input"
disabled={isLoading}
        />
</div>

{/* Results area */}
<div
className="flex flex-col gap-2"
data-testid="user-role-search-results"
      >
{/* Loading skeleton */}
{isLoading && !isStale && (
<>
<SearchResultSkeleton />
<SearchResultSkeleton />
<SearchResultSkeleton />
</>
        )}

{/* Empty state - initial load or no results */}
{!isLoading && !error && query.length >= 2 && users.length === 0 && (
<EmptyState />
        )}

{/* Error state */}
{!isLoading && error && <ErrorState onRetry={handleRetry} />}

{/* Results */}
{!isLoading && !error && users.length > 0 && (
<>
<p
className="text-xs text-muted-foreground"
data-testid="user-role-search-results-count"
            >
{users.length} result{users.length !== 1 ? 's' : ''}
</p>
{users.map((user) => (
<UserRoleSearchResult
key={user.userId}
user={user}
onSelect={onUserSelect}
              />
            ))}
{hasMore && (
<Button
type="button"
variant="outline"
size="sm"
onClick={loadMore}
data-testid="user-role-search-load-more"
              >
Load more
              </Button>
            )}
</>
        )}
</div>
</div>
  );
}
