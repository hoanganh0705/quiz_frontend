"use client";

import Link from "next/link";

import { ChevronRight } from "lucide-react";

import type { BaseSearchResult } from "@/features/search/types";

export interface SearchResultRowProps {
  item: BaseSearchResult;
}

export function SearchResultRow({
  item,
}: SearchResultRowProps): React.ReactElement {
  return (
    <Link
      href={item.href}
      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid={`search-result-row-${item.id}`}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-brand transition-colors">
          {item.displayName}
        </p>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">
            {item.subtitle}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
