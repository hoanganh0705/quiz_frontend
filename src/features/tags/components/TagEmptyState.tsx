import { SearchX, Tag as TagIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

import type { EmptyStateAction } from "@/components/ui/EmptyState";

export type TagEmptyStateVariant =
  | "directory"
  | "quizzes-by-tag"
  | "filter-no-match";

export interface TagEmptyStateProps {
  variant: TagEmptyStateVariant;

  query?: string;

  loadedCount?: number;

  hasMore?: boolean;

  isLoadingMore?: boolean;

  onLoadMore?: () => void;

  onClearFilter?: () => void;

  className?: string;
}

interface StaticCopy {
  title: string;
  description: string;
  icon: typeof TagIcon;
}

const STATIC_COPY: Record<
  Exclude<TagEmptyStateVariant, "filter-no-match">,
  StaticCopy
> = {
  directory: {
    title: "No tags yet",
    description: "Tags will appear here once quizzes are published.",
    icon: TagIcon,
  },
  "quizzes-by-tag": {
    title: "No quizzes tagged with this yet",
    description: "Check back soon for new quizzes on this topic.",
    icon: SearchX,
  },
};

export function TagEmptyState({
  variant,
  query,
  loadedCount,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onClearFilter,
  className,
}: TagEmptyStateProps): React.ReactElement {
  if (variant === "filter-no-match") {
    const safeQuery = query?.trim() ?? "";
    const description =
      hasMore && typeof loadedCount === "number" && loadedCount > 0
        ? `No matches in the ${loadedCount} tags loaded so far. Load more tags to keep searching, or clear the filter.`
        : "Try a different keyword or clear the filter to browse all tags.";

    const actions: EmptyStateAction[] = [];
    if (hasMore && onLoadMore) {
      actions.push({
        label: isLoadingMore ? "Loading…" : "Load more tags",
        variant: "default",
        onClick: onLoadMore,
      });
    }
    if (onClearFilter) {
      actions.push({
        label: "Clear filter",
        variant: "outline",
        onClick: onClearFilter,
      });
    }

    return (
      <div
        data-testid={`tag-empty-state-${variant}`}
        data-variant={variant}
        className={className}
      >
        <EmptyState
          icon={SearchX}
          title={`No tags match "${safeQuery}"`}
          description={description}
          actions={actions}
        />
      </div>
    );
  }

  const copy = STATIC_COPY[variant];
  return (
    <div
      data-testid={`tag-empty-state-${variant}`}
      data-variant={variant}
      className={className}
    >
      <EmptyState
        icon={copy.icon}
        title={copy.title}
        description={copy.description}
      />
    </div>
  );
}
