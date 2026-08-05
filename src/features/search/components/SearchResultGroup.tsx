"use client";

/**
 * `SearchResultGroup.tsx` — per-kind result group with privacy filtering.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.D3.
 *
 * ## What this component owns
 *
 * - Renders a labeled group of search results for a single `SearchResultKind`.
 * - Filters out items whose `visibility === 'private'` for the current viewer.
 * - Shows a sign-in prompt when `visibility === 'authenticated'` and the
 *   viewer is anonymous.
 * - Renders the `no-results-in-group` empty state when no items remain
 *   after filtering.
 *
 * ## What this component does NOT own
 *
 * - Privacy check logic (delegated to the parent container that knows
 *   the current viewer identity).
 * - Individual card rendering (delegated to the `renderItem` slot prop).
 *
 * ## Privacy model
 *
 * Per the Story 5.6 acceptance criteria, privacy filtering happens at
 * the group level:
 *   - `'public'`    → always rendered.
 *   - `'authenticated'` → rendered for authenticated viewers; anonymous
 *     viewers see a sign-in prompt instead.
 *   - `'private'`   → never rendered by this component (filtered out).
 *
 * The parent `SearchResults` container is responsible for determining
 * the current viewer's authentication state and passing it in.
 *
 * ## SSR
 *
 * This is a client component (uses auth context). Components that wrap
 * this must provide a `<Suspense>` boundary.
 */

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

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * i18n keys for group header labels.
 * Map each `SearchResultKind` to its human-readable label.
 */
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

// ─── Public types ─────────────────────────────────────────────────────────

export interface SearchResultGroupProps<T extends BaseSearchResult> {
  /** The result group to render. */
  group: SearchGroup<T>;
  /**
   * Render function for each item in the group.
   * Receives the privacy-filtered item.
   */
  renderItem: (item: T) => React.ReactNode;
  /** Whether the current viewer is authenticated. Defaults to `false`. */
  isAuthenticated?: boolean;
  /** Additional class names to apply to the root container. */
  className?: string;
  /**
   * Optional footer rendered below the item list.
   * Used for "load more" buttons in paginatable groups.
   */
  footer?: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Filter an array of items by visibility.
 *
 * - `'public'`         → always included.
 * - `'authenticated'` → included only when `isAuthenticated` is true.
 * - `'private'`        → always excluded.
 *
 * Returns `{ visible, needsAuth }` where:
 *   - `visible`  = items that pass the filter.
 *   - `needsAuth` = true when at least one item was filtered because
 *     `visibility === 'authenticated'` and the viewer is anonymous.
 */
function filterByVisibility<T extends BaseSearchResult>(
  items: readonly T[],
  isAuthenticated: boolean,
): { visible: T[]; needsAuth: boolean } {
  const visible: T[] = [];
  let needsAuth = false;

  for (const item of items) {
    if (item.visibility === "private") {
      // Skip private items entirely.
      continue;
    }
    if (item.visibility === "authenticated" && !isAuthenticated) {
      // Show the auth prompt once.
      needsAuth = true;
      continue;
    }
    visible.push(item);
  }

  return { visible, needsAuth };
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Renders a single result kind group with privacy-aware filtering.
 *
 * The `renderItem` slot prop receives only the items that pass privacy
 * filtering, so card components never need to handle private content.
 */
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

  // ── All items filtered (empty after privacy filter) ─────────────────
  if (visibleCount === 0) {
    if (needsAuth) {
      // At least one authenticated-only item existed — show the sign-in prompt.
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

    // No items at all — show the generic no-results empty state.
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

  // ── Normal render ───────────────────────────────────────────────────
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
