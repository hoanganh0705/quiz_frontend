"use client";

import { type ReactElement } from "react";

import { useTrendingUsers } from "@/features/social/hooks/useTrendingUsers";

import { SearchEmptyState } from "../components/SearchEmptyState";
import { SearchErrorState } from "../components/SearchErrorState";
import { SearchResultSkeleton } from "../components/SearchResultSkeleton";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { TrendingUserCard } from "../components/TrendingUserCard";
import { BlockedContentGate } from "../components/BlockedContentGate";

import type { SocialListVisibility } from "../social-list-visibility";
import type { TrendingUserResponseDto } from "@/lib/api/generated/schemas";

function toPrivacyVariant(
visibility: SocialListVisibility,
): "not_available" | "friends_only" {
if (visibility === "private") return "friends_only";
return "not_available";
}

export function TrendingUsersList(): ReactElement {
const { items, visibility, isLoading, hasMore, loadMore, error, retry } =
useTrendingUsers();

const handleLoadMore = (): void => {
loadMore();
  };

if (visibility !== "visible") {
return (
<PrivacyRestrictedNotice
variant={toPrivacyVariant(visibility)}
resourceKind="followers"
      />
    );
  }

if (isLoading && items.length === 0) {
return <SearchResultSkeleton kind="trending" />;
  }

if (error !== null && items.length === 0) {
return (
<SearchErrorState
errorCode={(error.code as "GLOBAL_INTERNAL_ERROR") ?? "GLOBAL_INTERNAL_ERROR"}
onRetry={retry}
      />
    );
  }

if (items.length === 0) {
return <SearchEmptyState kind="no-trending" />;
  }

return (
<section
data-testid="trending-users-list"
aria-label="Trending users"
className="flex flex-col gap-2"
    >
<ol className="flex flex-col gap-1" aria-label="Trending users ranked list">
{items.map((item: TrendingUserResponseDto, index: number) => {
const rank = index + 1;
return (
<li key={item.userId}>
<BlockedContentGate targetUserId={item.userId}>
<TrendingUserCard user={item} rank={rank} />
</BlockedContentGate>
</li>
          );
        })}
</ol>
{hasMore && (
<button
type="button"
onClick={handleLoadMore}
data-testid="trending-users-load-more"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
Load more
        </button>
      )}
</section>
  );
}
