"use client";

import { memo, useState } from "react";
import { Search, AlertCircle, RefreshCw, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

import { useUserSearch } from "../hooks/useUserSearch";
import type { UserSearchResultDto } from "../user-role-admin-types";

interface UserRoleSearchResultProps {
  user: UserSearchResultDto;
  isSelected?: boolean;
  onSelect: (user: UserSearchResultDto) => void;
}

const UserRoleSearchResult = memo(function UserRoleSearchResult({
  user,
  isSelected = false,
  onSelect,
}: UserRoleSearchResultProps): React.ReactElement {
  const handleClick = () => {
    onSelect(user);
  };

  return (
    <div role="listitem">
      <button
        type="button"
        onClick={handleClick}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected
            ? "border-brand bg-brand/5 shadow-xs ring-1 ring-brand/30"
            : "border-border/70 bg-card hover:bg-muted/40",
        )}
        data-testid="user-role-search-result"
        data-user-id={user.userId}
      >
        {/* Avatar placeholder */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden border border-border/50"
          aria-hidden="true"
        >
          {user.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* User info */}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-foreground"
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
            <div
              className="flex flex-wrap items-center gap-1 mt-1.5"
              data-testid="user-role-search-result-roles"
            >
              {user.currentRoles.map((role) => (
                <Badge
                  key={role}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 font-medium"
                >
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </button>
    </div>
  );
});

function SearchResultSkeleton(): React.ReactElement {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border/60 p-3"
      data-testid="user-role-search-result-skeleton"
    >
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-8 text-center"
      data-testid="user-role-search-empty-state"
    >
      <Search
        aria-hidden="true"
        className="mb-2 h-7 w-7 text-muted-foreground/60"
      />
      <p className="text-sm font-semibold text-foreground">
        No users match your search.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Try searching by a different username or email address.
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
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center"
      data-testid="user-role-search-error-state"
    >
      <AlertCircle
        aria-hidden="true"
        className="mb-2 h-7 w-7 text-destructive"
      />
      <p className="text-sm font-medium text-destructive">
        Failed to search users.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Please try again.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-3 text-xs"
        data-testid="user-role-search-retry-button"
      >
        <RefreshCw aria-hidden="true" className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

export interface UserRoleSearchPanelProps {
  selectedUserId?: string | null;
  onUserSelect: (user: UserSearchResultDto) => void;
}

export function UserRoleSearchPanel({
  selectedUserId,
  onUserSelect,
}: UserRoleSearchPanelProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const { users, isLoading, isStale, error, loadMore, hasMore, refetch } =
    useUserSearch(query);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <div className="flex flex-col gap-4" data-testid="user-role-search-panel">
      {/* Search input */}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          placeholder="Search users by username or email…"
          aria-label="Search users by username or email"
          value={query}
          onChange={handleInputChange}
          className="pl-9 pr-9 text-sm h-9"
          data-testid="user-role-search-input"
        />
        {isLoading && !isStale ? (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search query"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Results area */}
      <div
        role="region"
        aria-label="Search results"
        className="flex flex-col gap-2"
        data-testid="user-role-search-results"
      >
        {/* Loading skeleton */}
        {isLoading && !isStale && (
          <div className="space-y-2">
            <SearchResultSkeleton />
            <SearchResultSkeleton />
            <SearchResultSkeleton />
          </div>
        )}

        {/* Guidance state when query is short */}
        {!isLoading && !error && query.length < 2 && (
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 p-8 text-center"
            data-testid="user-role-search-guide"
          >
            <Search
              aria-hidden="true"
              className="mb-2 size-6 text-muted-foreground/50"
            />
            <p className="text-sm font-semibold text-foreground">
              Search by Username or Email
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-60 leading-relaxed">
              Enter at least 2 characters to look up users across the platform.
            </p>
          </div>
        )}

        {/* Empty state - query entered but no results */}
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
              aria-live="polite"
              aria-atomic="true"
              data-testid="user-role-search-results-count"
            >
              {users.length} result{users.length !== 1 ? "s" : ""}
            </p>
            <div
              role="list"
              className="space-y-2 max-h-125 overflow-y-auto pr-1"
            >
              {users.map((user) => (
                <UserRoleSearchResult
                  key={user.userId}
                  user={user}
                  isSelected={selectedUserId === user.userId}
                  onSelect={onUserSelect}
                />
              ))}
            </div>
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
