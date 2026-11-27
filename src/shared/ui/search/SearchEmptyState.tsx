"use client";

import { FilterX, Search, SearchX, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export type SearchEmptyStateVariant =
  | "no-query"
  | "no-results"
  | "no-results-in-group";

export type SocialSearchEmptyStateKind =
  | "empty-query"
  | "query-too-short"
  | "no-results"
  | "no-trending";

export interface SearchEmptyStateProps {
  variant?: SearchEmptyStateVariant;
  kind?: SocialSearchEmptyStateKind;
  query?: string;
  groupLabel?: string;
  className?: string;
}

const VARIANT_CONFIG: Record<
  SearchEmptyStateVariant,
  {
    icon: LucideIcon;
    title: string;
    description: string;
    size: "sm" | "md" | "lg";
  }
> = {
  "no-query": {
    icon: Search,
    title: "Start searching",
    description:
      "Enter a search term to discover quizzes, users, tournaments, and more.",
    size: "md",
  },
  "no-results": {
    icon: SearchX,
    title: "No results found",
    description:
      "Your search didn't match anything. Try different keywords or broaden your filters.",
    size: "md",
  },
  "no-results-in-group": {
    icon: FilterX,
    title: "No matches in this category",
    description:
      "No results match your current filter in this category. Try removing some filters.",
    size: "sm",
  },
};

function buildSocialCopy(
  kind: SocialSearchEmptyStateKind,
  query: string | undefined,
): { title: string; body: string } {
  switch (kind) {
    case "empty-query":
      return {
        title: "Start typing to search",
        body: "Enter at least 2 characters to search for people.",
      };
    case "query-too-short":
      return {
        title: "Query too short",
        body: query
          ? `"${query}" needs at least 2 characters. Keep typing!`
          : "Enter at least 2 characters to search.",
      };
    case "no-results":
      return {
        title: "No results found",
        body: query
          ? `We couldn't find anyone matching "${query}". Try a different search.`
          : "We couldn't find any results. Try a different search.",
      };
    case "no-trending":
      return {
        title: "No trending users right now",
        body: "Check back soon for trending users.",
      };
  }
}

export function SearchEmptyState({
  variant = "no-results",
  kind,
  query,
  groupLabel,
  className,
}: SearchEmptyStateProps): React.ReactElement {
  if (kind) {
    const copy = buildSocialCopy(kind, query);
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="search-empty-state"
        data-kind={kind}
        className="flex flex-col gap-2 p-6 text-center"
      >
        <p className="text-base font-semibold">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
      </div>
    );
  }

  const config = VARIANT_CONFIG[variant];
  const description =
    variant === "no-results-in-group" && groupLabel
      ? `No results match your current filter in ${groupLabel}. Try removing some filters.`
      : config.description;

  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={description}
      size={config.size}
      className={className}
      data-testid="search-empty-state"
    />
  );
}
