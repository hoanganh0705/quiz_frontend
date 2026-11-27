"use client";

import { type ReactElement } from "react";

import { useUserSearch } from "@/features/social/hooks/useUserSearch";
import { SocialSearchInput } from "../components/SocialSearchInput";
import { UserSearchResultWindow } from "../components/UserSearchResultWindow";
import {
  SearchEmptyState,
  SearchErrorState,
  SearchResultSkeleton,
} from "@/shared/ui/search";
import { SearchRateLimitNotice } from "../components/SearchRateLimitNotice";
import { SocialListRow } from "../components/SocialListRow";
import { BlockedContentGate } from "../components/BlockedContentGate";

import type { SocialUserSummaryDto } from "../types";
import type { SearchableUserDto } from "@/lib/api/generated/schemas";
import {
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
} from "../discovery-invariants";

const RATE_LIMIT_CODES = new Set<string>([
  "GLOBAL_RATE_LIMITED",
  "SOCIAL_SEARCH_RATE_LIMITED",
]);

function toSocialUserSummary(item: SearchableUserDto): SocialUserSummaryDto {
  const displayName =
    typeof item.displayName === "string" ? item.displayName : null;
  const avatarUrl = typeof item.avatarUrl === "string" ? item.avatarUrl : null;

  return {
    id: item.userId,
    userId: item.userId,
    userName: item.username,
    displayName,
    avatarUrl,
    isPrivate: false,
    createdAt: "",
  };
}

interface UserSearchResultsProps {
  query: string;

  onQueryChange: (next: string) => void;
}

export function UserSearchResults({
  query,
  onQueryChange,
}: UserSearchResultsProps): ReactElement {
  const {
    items,
    isLoading,
    hasMore,
    loadMore,
    error,
    remainingSeconds,
    rateLimitedUntil,
  } = useUserSearch(query);

  const trimmedQuery = query.trim();
  const isTooShort = trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH;
  const isTooLong = trimmedQuery.length > SEARCH_MAX_QUERY_LENGTH;

  const cooldownSeconds =
    rateLimitedUntil !== null
      ? Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000))
      : null;

  const searchBar = (
    <SocialSearchInput
      value={query}
      onChange={onQueryChange}
      cooldownSeconds={cooldownSeconds}
      ariaLabel="Search players by username or display name"
      surface="social-search-page"
    />
  );

  if (error !== null && RATE_LIMIT_CODES.has(error.code as string)) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {searchBar}
        <SearchRateLimitNotice
          cooldownSeconds={cooldownSeconds}
          surface="social-search-page"
        />
      </div>
    );
  }

  if (isTooShort) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {searchBar}
        <SearchEmptyState kind="query-too-short" query={query} />
      </div>
    );
  }

  if (isTooLong) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {searchBar}
        <SearchEmptyState kind="no-results" query={query} />
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {searchBar}
        <SearchResultSkeleton kind="search" />
      </div>
    );
  }

  if (error !== null && items.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {searchBar}
        <SearchErrorState
          errorCode={
            (error.code as "GLOBAL_INTERNAL_ERROR") ?? "GLOBAL_INTERNAL_ERROR"
          }
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {searchBar}
        <SearchEmptyState kind="no-results" query={query} />
      </div>
    );
  }

  const renderRow = ({
    user,
  }: {
    user: SocialUserSummaryDto;
    index: number;
  }) => (
    <BlockedContentGate targetUserId={user.userId}>
      <SocialListRow user={user} variant="summary" />
    </BlockedContentGate>
  );

  const socialItems: readonly SocialUserSummaryDto[] =
    items.map(toSocialUserSummary);

  return (
    <div className="flex flex-col gap-4 p-4">
      {searchBar}
      <section
        data-testid="user-search-results"
        aria-label="Search results"
        className="flex flex-col gap-2"
      >
        <UserSearchResultWindow items={socialItems} row={renderRow} />
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            data-testid="user-search-load-more"
            className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
          >
            Load more
          </button>
        )}
      </section>
    </div>
  );
}
