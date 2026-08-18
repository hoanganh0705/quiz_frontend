"use client";

import { type ReactElement } from "react";

import { useSuggestions } from "@/features/social/hooks/useSuggestions";

import { SearchEmptyState } from "../components/SearchEmptyState";
import { SearchErrorState } from "../components/SearchErrorState";
import { SearchResultSkeleton } from "../components/SearchResultSkeleton";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { SocialListRow } from "../components/SocialListRow";
import { BlockedContentGate } from "../components/BlockedContentGate";

import type { SocialListVisibility } from "../social-list-visibility";
import type { SocialSuggestionItemDto } from "../types";

function toPrivacyVariant(
visibility: SocialListVisibility,
): "not_available" | "friends_only" {
if (visibility === "private") return "friends_only";
return "not_available";
}

interface SuggestionsPanelProps {

targetUserId?: string | null;
}

export function SuggestionsPanel({
targetUserId,
}: SuggestionsPanelProps): ReactElement {
const {
items,
visibility,
isLoading,
hasMore,
loadMore,
error,
retry,
  } = useSuggestions(targetUserId ?? null);

const handleLoadMore = (): void => {
loadMore();
  };

if (visibility !== "visible") {
return (
<PrivacyRestrictedNotice
variant={toPrivacyVariant(visibility)}
resourceKind="friends"
      />
    );
  }

if (isLoading && items.length === 0) {
return <SearchResultSkeleton kind="suggestions" />;
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
return <SearchEmptyState kind="empty-query" />;
  }

return (
<section
data-testid="suggestions-panel"
aria-label="Social suggestions"
className="flex flex-col gap-2"
    >
<ul className="flex flex-col gap-1">
{items.map((item: SocialSuggestionItemDto) => (
<li key={item.id}>
<BlockedContentGate targetUserId={item.user.userId}>
<SocialListRow user={item.user} variant="summary" />
</BlockedContentGate>
</li>
        ))}
</ul>
{hasMore && (
<button
type="button"
onClick={handleLoadMore}
data-testid="suggestions-load-more"
className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
Load more
        </button>
      )}
</section>
  );
}
