"use client";

import { SearchX, Search, FilterX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export type SearchEmptyStateVariant =
| "no-query"
  | "no-results"
  | "no-results-in-group";

interface SearchEmptyStateProps {

variant?: SearchEmptyStateVariant;

groupLabel?: string;
className?: string;
}

const VARIANT_CONFIG: Record<
SearchEmptyStateVariant,
{ icon: LucideIcon; title: string; description: string; size: "sm" | "md" | "lg" }
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

export function SearchEmptyState({
variant = "no-results",
groupLabel,
className,
}: SearchEmptyStateProps) {
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
