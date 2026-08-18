"use client";

import * as React from "react";
import Link from "next/link";

import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import type {
SearchGroup,
SearchResultKind,
BaseSearchResult,
} from "@/features/search/types/search.types";
import { SearchEmptyState } from "./shared/SearchEmptyState";

const KIND_LABELS: Record<SearchResultKind, string> = {
quiz: "Quizzes",
user: "Users",
tournament: "Tournaments",
achievement: "Achievements",
ranking: "Rankings",
tag: "Tags",
category: "Categories",
comment: "Comments",
social: "People",
} as const;

export interface SearchResultGroupProps<T extends BaseSearchResult> {

group: SearchGroup<T>;

renderItem: (item: T) => React.ReactNode;

isAuthenticated?: boolean;

className?: string;

footer?: React.ReactNode;
}

function filterByVisibility<T extends BaseSearchResult>(
items: readonly T[],
isAuthenticated: boolean,
): { visible: T[]; needsAuth: boolean } {
const visible: T[] = [];
let needsAuth = false;

for (const item of items) {
if (item.visibility === "private") {

continue;
    }
if (item.visibility === "authenticated" && !isAuthenticated) {

needsAuth = true;
continue;
    }
visible.push(item);
  }

return { visible, needsAuth };
}

export function SearchResultGroup<T extends BaseSearchResult>({
group,
renderItem,
isAuthenticated = false,
className,
footer,
}: SearchResultGroupProps<T>) {
const { visible, needsAuth } = React.useMemo(
() => filterByVisibility(group.items, isAuthenticated),
[group.items, isAuthenticated],
  );

const label = KIND_LABELS[group.kind] ?? group.kind;
const itemCount = group.items.length;
const visibleCount = visible.length;

if (visibleCount === 0) {
if (needsAuth) {

return (
<section
aria-label={`${label} results`}
className={cn("space-y-3", className)}
        >
{/* Group header */}
<div className="flex items-center gap-2 pb-2 border-b">
<h2 className="text-sm font-semibold text-foreground">{label}</h2>
<span
className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
aria-label={`${itemCount} items`}
            >
{itemCount}
</span>
</div>

{/* Auth prompt */}
<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
<Lock className="h-6 w-6 text-muted-foreground mb-3" aria-hidden="true" />
<p className="text-sm text-muted-foreground mb-4">
Sign in to see {label.toLowerCase()} results.
            </p>
<Button asChild variant="outline" size="sm">
<Link href="/sign-in">
<LogIn className="h-4 w-4 mr-1.5" aria-hidden="true" />
Sign in
              </Link>
</Button>
</div>
</section>
      );
    }

return (
<section
aria-label={`${label} results`}
className={cn("space-y-3", className)}
      >
{/* Group header */}
<div className="flex items-center gap-2 pb-2 border-b">
<h2 className="text-sm font-semibold text-foreground">{label}</h2>
<span
className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
aria-label={`${itemCount} items`}
          >
{itemCount}
</span>
</div>
<SearchEmptyState
variant="no-results-in-group"
groupLabel={label}
        />
</section>
    );
  }

return (
<section
aria-label={`${label} results`}
className={cn("space-y-3", className)}
    >
{/* Group header */}
<div className="flex items-center gap-2 pb-2 border-b">
<h2 className="text-sm font-semibold text-foreground">{label}</h2>
<span
className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
aria-label={`${visibleCount} visible results`}
        >
{visibleCount}
</span>
{/* Show total if privacy filtering occurred */}
{visibleCount < itemCount && (
<span className="text-xs text-muted-foreground">
({itemCount} total)
          </span>
        )}
</div>

{/* Items */}
<ul role="list" className="divide-y divide-border">
{visible.map((item) => (
<li key={item.id}>{renderItem(item)}</li>
        ))}
</ul>

{/* Footer slot (e.g. "load more" button) */}
{footer && <div className="pt-3">{footer}</div>}
</section>
  );
}
